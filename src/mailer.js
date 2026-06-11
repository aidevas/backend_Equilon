// Отправка письма через Resend HTTP API (Railway блокирует SMTP; Resand работает по HTTPS).
// DRY_RUN=1 — реальная отправка не выполняется, только лог (локальные тесты).

export async function sendNotification({ subject, html, attachments = [] }) {
  const to = [process.env.NOTIFY_EMAIL_1, process.env.NOTIFY_EMAIL_2].filter(Boolean);
  const from = process.env.EMAIL_FROM;
  const replyTo = process.env.REPLY_TO || process.env.NOTIFY_EMAIL_1 || from;

  if (process.env.DRY_RUN === '1') {
    console.log('[DRY_RUN] would send via Resend:');
    console.log('  from:', from, '| to:', to.join(', '));
    console.log('  subject:', subject);
    console.log('  attachments:', attachments.map(a => `${a.filename} (${a.content.length}B)`).join(', ') || '(none)');
    return;
  }

  if (!to.length) throw new Error('NOTIFY_EMAIL_1/2 not configured');
  if (!from) throw new Error('EMAIL_FROM not configured');
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

  const payload = {
    from,
    to,
    reply_to: replyTo,
    subject,
    html,
    attachments: attachments.map(a => ({
      filename: a.filename,
      content: a.content.toString('base64'),
    })),
  };

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) {
    throw new Error(`Resend failed: HTTP ${r.status} ${JSON.stringify(j)}`);
  }
  console.log(`[mailer] sent via Resend id=${j.id} to ${to.join(', ')} (${attachments.length} attachments)`);
}
