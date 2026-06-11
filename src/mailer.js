// Отправка письма на два адреса через Zoho SMTP (nodemailer).
// DRY_RUN=1 — письмо не отправляется, только логируется (для локальных тестов без секретов).
import nodemailer from 'nodemailer';

export async function sendNotification({ subject, html, attachments }) {
  const to = [process.env.NOTIFY_EMAIL_1, process.env.NOTIFY_EMAIL_2].filter(Boolean);
  const from = process.env.EMAIL_FROM || process.env.ZOHO_USER;

  if (process.env.DRY_RUN === '1') {
    console.log('[DRY_RUN] would send email:');
    console.log('  to:', to.join(', '));
    console.log('  subject:', subject);
    console.log('  attachments:', attachments.map(a => `${a.filename} (${a.content.length}B)`).join(', ') || '(none)');
    console.log('  html length:', html.length);
    return;
  }

  if (!to.length) throw new Error('NOTIFY_EMAIL_1/2 not configured');
  if (!process.env.ZOHO_USER || !process.env.ZOHO_APP_PASSWORD) throw new Error('Zoho SMTP credentials not configured');

  const host = process.env.SMTP_HOST || 'smtppro.zoho.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user: process.env.ZOHO_USER, pass: process.env.ZOHO_APP_PASSWORD },
    // Быстрый отказ вместо зависания на ~2 мин при недоступном SMTP.
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
  console.log(`[mailer] sending via ${host}:${port} as ${process.env.ZOHO_USER}`);

  await transport.sendMail({
    from,
    to,
    replyTo: process.env.NOTIFY_EMAIL_1 || from,
    subject,
    html,
    attachments,
  });
}
