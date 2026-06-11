// Транскрипция голосовых ответов через OpenAI Whisper.
// Не блокирует отправку: при отсутствии ключа или ошибке — fallback-текст (по ТЗ).
import fs from 'node:fs';
import OpenAI, { toFile } from 'openai';
import { VOICE_FIELDS } from './fields.js';

export const FALLBACK = '[Транскрипция недоступна — см. прикреплённый audio файл]';

// Whisper определяет формат по расширению имени файла. multer сохраняет временный
// файл без расширения, поэтому имя для API восстанавливаем из originalname/mimetype.
function fileExt(f) {
  const m = /\.([a-z0-9]+)$/i.exec(f.originalname || '');
  if (m) return m[1].toLowerCase();
  const mt = (f.mimetype || '').toLowerCase();
  if (mt.includes('mp4')) return 'm4a';
  if (mt.includes('ogg')) return 'ogg';
  if (mt.includes('mpeg')) return 'mp3';
  return 'webm';
}

export async function transcribeAll(files) {
  const result = {};
  const key = process.env.OPENAI_API_KEY;

  // Без ключа — не падаем, помечаем все записи fallback'ом.
  if (!key) {
    for (const name of VOICE_FIELDS) {
      if (files[`voice_${name}`]?.[0]) result[name] = FALLBACK;
    }
    return result;
  }

  // timeout + без ретраев: при зависании/сбое — fallback, отправку не блокируем (по ТЗ §3).
  const openai = new OpenAI({ apiKey: key, timeout: 45000, maxRetries: 0 });
  for (const name of VOICE_FIELDS) {
    const file = files[`voice_${name}`]?.[0];
    if (!file) continue;
    const t0 = Date.now();
    try {
      console.log(`[whisper] ${name}: start (${file.size}B)`);
      const upload = await toFile(fs.createReadStream(file.path), `voice_${name}.${fileExt(file)}`);
      const transcription = await openai.audio.transcriptions.create({
        file: upload,
        model: 'whisper-1',
        language: 'ru',
        response_format: 'text',
      });
      const text = (typeof transcription === 'string' ? transcription : transcription?.text || '').trim();
      result[name] = text || FALLBACK;
      console.log(`[whisper] ${name}: ok in ${Date.now() - t0}ms (${result[name].length} chars)`);
    } catch (e) {
      console.error(`[whisper] ${name}: FAIL in ${Date.now() - t0}ms — ${e.status || ''} ${e.message}`);
      result[name] = FALLBACK;
    }
  }
  return result;
}
