// Отправка письма через Zoho Mail API (HTTP/HTTPS).
// SMTP не используем — Railway блокирует исходящие SMTP-порты. Переиспользуем уже
// настроенный (task3) ящик hello@equilonfx.com и его DKIM/SPF; шлём через тот же ящик по API.
// DRY_RUN=1 — реальная отправка не выполняется, только лог (локальные тесты).

const ACCOUNTS_HOST = process.env.ZOHO_ACCOUNTS_HOST || 'https://accounts.zoho.com';
const MAIL_HOST = process.env.ZOHO_MAIL_HOST || 'https://mail.zoho.com';

let _token = null;      // { value, exp }
let _accountId = null;

async function getAccessToken() {
  if (_token && _token.exp > Date.now() + 60_000) return _token.value;
  const params = new URLSearchParams({
    refresh_token: process.env.ZOHO_REFRESH_TOKEN,
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    grant_type: 'refresh_token',
  });
  const r = await fetch(`${ACCOUNTS_HOST}/oauth/v2/token?${params.toString()}`, { method: 'POST' });
  const j = await r.json().catch(() => ({}));
  if (!j.access_token) throw new Error('Zoho OAuth failed: ' + JSON.stringify(j));
  _token = { value: j.access_token, exp: Date.now() + (Number(j.expires_in) || 3600) * 1000 };
  return _token.value;
}

async function getAccountId(token) {
  if (process.env.ZOHO_ACCOUNT_ID) return process.env.ZOHO_ACCOUNT_ID;
  if (_accountId) return _accountId;
  const r = await fetch(`${MAIL_HOST}/api/accounts`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });
  const j = await r.json().catch(() => ({}));
  _accountId = j?.data?.[0]?.accountId;
  if (!_accountId) throw new Error('Zoho accountId not found: ' + JSON.stringify(j));
  return _accountId;
}

async function uploadAttachment(accountId, token, att) {
  const url = `${MAIL_HOST}/api/accounts/${accountId}/messages/attachments?fileName=${encodeURIComponent(att.filename)}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/octet-stream' },
    body: att.content,
  });
  const j = await r.json().catch(() => ({}));
  const d = j?.data;
  if (!d?.attachmentPath) throw new Error('attachment upload failed: ' + JSON.stringify(j));
  return { storeName: d.storeName, attachmentName: d.attachmentName, attachmentPath: d.attachmentPath };
}

export async function sendNotification({ subject, html, attachments = [] }) {
  const recipients = [process.env.NOTIFY_EMAIL_1, process.env.NOTIFY_EMAIL_2].filter(Boolean);
  const from = process.env.EMAIL_FROM || process.env.ZOHO_USER;

  if (process.env.DRY_RUN === '1') {
    console.log('[DRY_RUN] would send via Zoho Mail API:');
    console.log('  to:', recipients.join(', '));
    console.log('  subject:', subject);
    console.log('  attachments:', attachments.map(a => `${a.filename} (${a.content.length}B)`).join(', ') || '(none)');
    return;
  }

  if (!recipients.length) throw new Error('NOTIFY_EMAIL_1/2 not configured');
  if (!process.env.ZOHO_REFRESH_TOKEN || !process.env.ZOHO_CLIENT_ID || !process.env.ZOHO_CLIENT_SECRET) {
    throw new Error('Zoho OAuth (CLIENT_ID/CLIENT_SECRET/REFRESH_TOKEN) not configured');
  }

  const token = await getAccessToken();
  const accountId = await getAccountId(token);

  // Вложения — best-effort: если загрузка не удалась, письмо всё равно уходит (с транскриптами).
  const uploaded = [];
  for (const att of attachments) {
    try { uploaded.push(await uploadAttachment(accountId, token, att)); }
    catch (e) { console.error('[mailer] attachment skipped:', att.filename, e.message); }
  }

  const payload = {
    fromAddress: from,
    toAddress: recipients.join(','),
    subject,
    content: html,
    mailFormat: 'html',
    ...(uploaded.length ? { attachments: uploaded } : {}),
  };

  const r = await fetch(`${MAIL_HOST}/api/accounts/${accountId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const j = await r.json().catch(() => ({}));
  const code = j?.status?.code;
  if (!r.ok || (code && code !== 200)) {
    throw new Error(`Zoho send failed: HTTP ${r.status} ${JSON.stringify(j)}`);
  }
  console.log(`[mailer] sent via Zoho Mail API to ${recipients.join(', ')} (${uploaded.length} attachments)`);
}
