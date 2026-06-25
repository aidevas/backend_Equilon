// Equilon FX — приём анкеты careers/analyst.
// POST /api/careers/analyst/submit (multipart) -> транскрипция -> письмо на 2 адреса -> 200 {ok:true}
import express from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import { VOICE_FIELDS } from './fields.js';
import { transcribeAll } from './transcribe.js';
import { buildEmailHtml, buildSubject } from './email.js';
import { sendNotification } from './mailer.js';

const app = express();
app.set('trust proxy', 1); // за прокси Railway — чтобы rate-limit видел реальный IP

// CORS: форма размещена на equilonfx.com, бэкенд — на Railway (другой origin).
// Публичный submit-эндпоинт без кук/авторизации → разрешаем (по умолчанию любой origin).
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const MAX_FILE_MB = Number(process.env.MAX_FILE_MB || 15);
const MAX_ATTACH_TOTAL = Number(process.env.MAX_ATTACH_TOTAL_MB || 20) * 1024 * 1024;

const upload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: MAX_FILE_MB * 1024 * 1024,
    files: VOICE_FIELDS.length,
    fields: 120,            // текстовых полей ~55 + meta — с запасом
    fieldSize: 256 * 1024,  // ограничение на одно текстовое поле (защита от раздувания)
  },
});
const voiceUpload = upload.fields(VOICE_FIELDS.map(n => ({ name: `voice_${n}`, maxCount: 1 })));

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT || 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions, try later' },
  // Ключ по реальному IP клиента. За прокси Railway req.ip = меняющийся IP edge-ноды
  // (trust proxy не даёт стабильный клиентский IP), поэтому берём IP явно:
  // на проде за Cloudflare — CF-Connecting-IP (не подделать), иначе левый X-Forwarded-For.
  keyGenerator: (req) => {
    const cf = req.headers['cf-connecting-ip'];
    if (cf) return cf;
    const xff = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    return xff || req.ip;
  },
  validate: { trustProxy: false, xForwardedForHeader: false },
});

function ext(originalname) {
  const m = /\.([a-z0-9]+)$/i.exec(originalname || '');
  return m ? m[1].toLowerCase() : 'webm';
}


// Вложения: читаем файлы в буферы, не превышая суммарный лимит письма.
function buildAttachments(files) {
  const list = [];
  let total = 0;
  for (const name of VOICE_FIELDS) {
    const f = files[`voice_${name}`]?.[0];
    if (!f) continue;
    let buf;
    try { buf = fs.readFileSync(f.path); } catch { continue; }
    if (total + buf.length > MAX_ATTACH_TOTAL) continue; // не влезает — пропускаем (письмо не должно отвалиться по размеру)
    total += buf.length;
    list.push({ voice: name, filename: `voice_${name}.${ext(f.originalname)}`, content: buf, contentType: f.mimetype });
  }
  return list;
}

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/api/careers/analyst/submit', limiter, (req, res) => {
  voiceUpload(req, res, async (err) => {
    const files = req.files || {};
    const cleanup = () => {
      for (const k of Object.keys(files)) for (const f of files[k]) fs.promises.unlink(f.path).catch(() => {});
    };
    try {
      if (err) {
        console.error('[upload]', err.message);
        cleanup();
        return res.status(400).json({ error: 'upload_failed' });
      }
      // Honeypot: непустое поле website = бот. Тихо отдаём 200, ничего не делаем (по ТЗ).
      if (req.body.website && String(req.body.website).trim()) {
        cleanup();
        return res.status(200).json({ ok: true });
      }

      const submissionId = crypto.randomUUID();
      const transcripts = await transcribeAll(files);
      const attachments = buildAttachments(files);
      const attachedSet = new Set(attachments.map(a => a.voice));
      const html = buildEmailHtml({ submissionId, body: req.body, transcripts, files, attachedSet });

      await sendNotification({
        subject: buildSubject(req.body),
        html,
        attachments: attachments.map(({ filename, content, contentType }) => ({ filename, content, contentType })),
      });

      res.status(200).json({ ok: true });
    } catch (e) {
      console.error('[submit]', e);
      res.status(500).json({ error: 'internal' });
    } finally {
      cleanup();
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`backend_Equilon listening on :${PORT}`));

export default app;
