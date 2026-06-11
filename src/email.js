// Сборка HTML-письма с содержанием анкеты (по образцу email_template_example.html).
import { CHAPTERS, VOICE_FIELDS, optionLabel } from './fields.js';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function jsonSafe(s) { try { return JSON.parse(s); } catch { return null; } }
function fmtDur(sec) {
  sec = Math.max(0, parseInt(sec, 10) || 0);
  return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}
function fmtLong(sec) {
  sec = Math.max(0, parseInt(sec, 10) || 0);
  const m = Math.floor(sec / 60), s = sec % 60;
  return m ? `${m} мин ${s} сек` : `${s} сек`;
}
function fmtMsk(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d)) return '';
  return d.toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function asArray(v) { return v == null ? [] : (Array.isArray(v) ? v : [v]); }

// Значение поля для подсчёта «заполнено».
// Толерантно к имени с суффиксом [] (на случай если форма пришлёт instruments[]).
function rawValue(body, name) {
  let v = body[name];
  if (v == null && body[`${name}[]`] != null) v = body[`${name}[]`];
  if (Array.isArray(v)) return v.length ? v : null;
  const s = (v ?? '').toString().trim();
  return s ? s : null;
}

export function buildSubject(body) {
  const name = (body.name || '').trim() || '(без имени)';
  const city = (body.city || '').trim();
  const date = fmtMsk(body._meta_submitted_at);
  return `[Equilon] Новая анкета: ${name}${city ? ` (${city})` : ''} — ${date} МСК`;
}

export function buildEmailHtml({ submissionId, body, transcripts = {}, files = {}, attachedSet = new Set() }) {
  const audioDurations = jsonSafe(body._meta_audio_durations) || {};

  // ---- подсчёт заполненности ----
  let textTotal = 0, textFilled = 0, voiceTotal = 0, voiceFilled = 0;
  for (const ch of CHAPTERS) for (const f of ch.fields) {
    if (f.type === 'voice') {
      voiceTotal++;
      const hasFile = !!files[`voice_${f.name}`]?.[0];
      const hasText = !!rawValue(body, `${f.name}_text`);
      if (hasFile || hasText) voiceFilled++;
    } else {
      textTotal++;
      if (rawValue(body, f.name) != null) textFilled++;
    }
  }

  const totalTime = fmtLong(body._meta_total_time_sec);
  const sessions = parseInt(body._meta_session_count, 10) || 1;
  const maxAudio = Object.values(audioDurations).reduce((a, b) => Math.max(a, parseInt(b, 10) || 0), 0);

  const C = {
    bg: '#f4f3ee', card: '#ffffff', border: '#e4e1d8', ink: '#0a0a0a',
    text: '#1a1a18', muted: '#8a8880', dim: '#4a4a45', green: '#1a8c4e',
    soft: '#faf9f5', gold: '#ffd700',
  };
  const mono = "'IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,monospace";

  const head = (txt, color = C.green) =>
    `<div style="font-family:${mono};font-size:11px;font-weight:700;color:${color};letter-spacing:1.4px;text-transform:uppercase;margin-bottom:12px;border-bottom:1px solid ${C.border};padding-bottom:8px">${esc(txt)}</div>`;

  const fieldRow = (label, valueHtml) =>
    `<div style="margin-bottom:16px"><div style="font-size:11px;color:${C.muted};font-family:${mono};text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px">${esc(label)}</div><div style="font-size:14.5px;color:${C.text}">${valueHtml}</div></div>`;

  // ---- рендер главы ----
  function renderChapter(ch) {
    const parts = [];
    for (const f of ch.fields) {
      if (f.type === 'voice') {
        const t = transcripts[f.name];
        const supplement = rawValue(body, `${f.name}_text`);
        const hasFile = !!files[`voice_${f.name}`]?.[0];
        if (!t && !supplement && !hasFile) continue;
        const dur = body[`voice_${f.name}_duration_sec`] || audioDurations[`voice_${f.name}`] || 0;
        const attached = attachedSet.has(f.name);
        parts.push(
          `<div style="background:${C.soft};border:1px solid ${C.border};border-left:3px solid ${C.green};border-radius:8px;padding:16px;margin-bottom:16px">` +
          `<div style="font-size:11px;color:${C.green};font-family:${mono};text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px;font-weight:700">🎙 Голосовой · ${fmtDur(dur)} · ${esc(f.label)}</div>` +
          (t ? `<div style="font-size:14px;color:${C.text};line-height:1.65;margin-bottom:${supplement || hasFile ? '12px' : '0'}">${esc(t)}</div>` : '') +
          (supplement ? `<div style="font-size:12.5px;color:${C.muted};margin-bottom:${hasFile ? '10px' : '0'};font-style:italic">Текстовое дополнение: «${esc(supplement)}»</div>` : '') +
          (hasFile ? `<div style="font-size:12px;color:${C.dim}">${attached ? `📎 Оригинал во вложении: <b>voice_${esc(f.name)}</b>` : '⚠ Аудио не приложено (превышен лимит размера письма)'}</div>` : '') +
          `</div>`
        );
      } else {
        const v = rawValue(body, f.name);
        if (v == null) continue;
        let html;
        if (f.type === 'multi') {
          html = asArray(v).map(x => esc(optionLabel(f.name, x))).join(' · ');
        } else if (f.type === 'radio') {
          html = `<span style="display:inline-block;padding:3px 10px;background:#e8f5ee;color:${C.green};border-radius:999px;font-weight:600;font-size:13px">${esc(optionLabel(f.name, v))}</span>`;
        } else if (f.type === 'url') {
          html = `<a href="${esc(v)}" style="color:${C.green}">${esc(v)}</a>`;
        } else if (f.name === 'telegram') {
          const handle = String(v).replace(/^@/, '');
          html = `<a href="https://t.me/${esc(handle)}" style="color:${C.green};text-decoration:none">${esc(v)}</a>`;
        } else {
          html = esc(v).replace(/\n/g, '<br>');
        }
        parts.push(fieldRow(f.label, html));
      }
    }
    if (!parts.length) parts.push(`<div style="font-size:13px;color:${C.muted}">— не заполнено</div>`);
    return `<tr><td style="padding:24px 28px 8px">${head(`Глава ${ch.id} · ${ch.title}`)}${parts.join('')}</td></tr>`;
  }

  const metricCard = (num, label, color) =>
    `<td style="background:${C.soft};border:1px solid ${C.border};border-radius:10px;padding:14px;text-align:center"><div style="font-family:${mono};font-size:22px;font-weight:700;color:${color};margin-bottom:4px">${num}</div><div style="font-size:11.5px;color:${C.dim};font-weight:600">${label}</div></td>`;

  return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${C.text};line-height:1.55">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:24px 16px"><tr><td align="center">
<table width="100%" style="max-width:680px;background:${C.card};border:1px solid ${C.border};border-radius:12px;overflow:hidden" cellpadding="0" cellspacing="0">

<tr><td style="background:${C.ink};color:#fff;padding:24px 28px">
  <div style="font-family:${mono};font-size:11px;font-weight:700;color:${C.gold};letter-spacing:1.4px;text-transform:uppercase;margin-bottom:8px">Equilon FX · Careers</div>
  <div style="font-size:22px;font-weight:800;letter-spacing:-.4px;margin-bottom:6px">Новая анкета аналитика</div>
  <div style="font-size:13px;color:#cfc9bc">${esc(fmtMsk(body._meta_submitted_at))} МСК · ID: ${esc(submissionId)}</div>
</td></tr>

<tr><td style="padding:28px 28px 8px">
  ${head('Кандидат', C.muted)}
  <table width="100%" style="font-size:14.5px">
    <tr><td style="padding:6px 0;width:35%;color:${C.dim}">Имя:</td><td style="padding:6px 0;font-weight:600">${esc(body.name || '—')}</td></tr>
    <tr><td style="padding:6px 0;color:${C.dim}">Возраст:</td><td style="padding:6px 0;font-weight:600">${esc(body.age || '—')}</td></tr>
    <tr><td style="padding:6px 0;color:${C.dim}">Telegram:</td><td style="padding:6px 0;font-weight:600">${esc(body.telegram || '—')}</td></tr>
    <tr><td style="padding:6px 0;color:${C.dim}">Город:</td><td style="padding:6px 0;font-weight:600">${esc(body.city || '—')}</td></tr>
  </table>
</td></tr>

<tr><td style="padding:16px 28px">
  <table width="100%" style="border-collapse:separate;border-spacing:8px"><tr>
    ${metricCard(`${textFilled}/${textTotal}`, 'Текстовых', C.green)}
    ${metricCard(`${voiceFilled}/${voiceTotal}`, 'Голосовых', '#a16207')}
    ${metricCard(totalTime || '—', 'Общее время', C.ink)}
  </tr></table>
  <div style="font-size:12.5px;color:${C.muted};margin-top:12px;font-family:${mono};letter-spacing:.2px">${sessions} сесс. · max audio ${fmtDur(maxAudio)} · ${esc((body._meta_screen_w || '?') + 'x' + (body._meta_screen_h || '?'))}</div>
</td></tr>

${CHAPTERS.map(renderChapter).join('')}

<tr><td style="background:${C.soft};padding:20px 28px;border-top:1px solid ${C.border}">
  ${head('Метаданные', C.muted)}
  <table style="font-size:12.5px;color:${C.dim}">
    <tr><td style="padding:3px 14px 3px 0;font-family:${mono}">Сессий:</td><td>${esc(sessions)}</td></tr>
    <tr><td style="padding:3px 14px 3px 0;font-family:${mono}">Total time:</td><td>${esc(totalTime || '—')}</td></tr>
    <tr><td style="padding:3px 14px 3px 0;font-family:${mono}">Submitted:</td><td>${esc(body._meta_submitted_at || '—')}</td></tr>
    <tr><td style="padding:3px 14px 3px 0;font-family:${mono};vertical-align:top">User-Agent:</td><td style="font-family:${mono};font-size:11px">${esc(body._meta_user_agent || '—')}</td></tr>
    <tr><td style="padding:3px 14px 3px 0;font-family:${mono}">Screen:</td><td>${esc((body._meta_screen_w || '?') + 'x' + (body._meta_screen_h || '?'))}</td></tr>
  </table>
</td></tr>

<tr><td style="background:${C.ink};color:#cfc9bc;padding:20px 28px;font-size:11px;text-align:center;font-family:${mono};letter-spacing:.4px">
  EQUILON FX · LONDON, UK · <b style="color:${C.gold}">CAREERS PIPELINE 2026</b>
</td></tr>

</table></td></tr></table></body></html>`;
}
