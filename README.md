# backend_Equilon

Бэкенд приёма анкеты Equilon FX (`careers/analyst`): принимает `multipart/form-data`,
транскрибирует голосовые ответы (OpenAI Whisper), собирает письмо с содержанием
анкеты и шлёт его на два адреса, прикрепляет оригиналы аудио.

## Стек

- Node.js + Express
- `multer` — приём multipart (текст + аудиофайлы)
- OpenAI Whisper — транскрипция (ru)
- `nodemailer` + Zoho SMTP — доставка писем
- Хранение аудио: вложением в письмо (старт) → Cloudflare R2 (продакшен, Блок 2)

## Эндпоинт

`POST /api/careers/analyst/submit` — принимает анкету, возвращает `200 {ok:true}`.
`GET /health` — проверка живости.

## Ветки и деплой

- `dev` — разработка
- `stag` — staging, автодеплой из ветки `stag` (Railway, проект stag)
- `prod` — продакшен, ручной деплой из ветки `prod` (Railway, проект prod)

## Переменные окружения

Задаются **только в Railway** (в репозиторий не коммитятся). Перечень — в `.env.example`.
Секреты (`OPENAI_API_KEY`, `ZOHO_APP_PASSWORD`) и адреса получателей в код не хардкодятся.

## Локальный запуск

```bash
npm install
node --env-file=.env src/server.js     # с DRY_RUN=1 письмо не отправляется, только логируется
```
