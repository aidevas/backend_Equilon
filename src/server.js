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
});

function ext(originalname) {
  const m = /\.([a-z0-9]+)$/i.exec(originalname || '');
  return m ? m[1].toLowerCase() : 'webm';
}

// Некоторые клиенты + busboy декодируют текстовые поля как latin1 → кириллица бьётся.
// Чиним ТОЛЬКО строки, похожие на mis-decoded UTF-8 (все символы ≤0xFF и есть байты 0x80-0xFF);
// уже корректную кириллицу (символы >0xFF) не трогаем — иначе сломаем её.
function fixUtf8(body) {
  const looksMojibake = (s) => {
    let hasHigh = false;
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      if (c > 0xFF) return false;        // настоящая кириллица (>0xFF) — не трогаем
      if (c >= 0x80) hasHigh = true;     // байт mis-decoded utf8
    }
    return hasHigh;
  };
  const fix = (s) => (looksMojibake(s) ? Buffer.from(s, 'latin1').toString('utf8') : s);
  for (const k of Object.keys(body)) {
    const v = body[k];
    if (typeof v === 'string') body[k] = fix(v);
    else if (Array.isArray(v)) body[k] = v.map((x) => (typeof x === 'string' ? fix(x) : x));
  }
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
      fixUtf8(req.body);
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
