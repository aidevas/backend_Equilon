# backend_Equilon

Бэкенд приёма анкеты Equilon FX (careers/analyst): приём `multipart/form-data`,
транскрипция голосовых ответов (OpenAI Whisper), письмо с содержанием анкеты на
два адреса, хранение/прикрепление аудио.

## Стек

- Node.js + Express
- `multer` — приём multipart (текст + аудиофайлы)
- OpenAI Whisper — транскрипция (ru)
- `nodemailer` + Zoho SMTP (`hello@equilonfx.com`) — доставка писем
- Хранение аудио: вложением в письмо (старт) → Cloudflare R2 (продакшен)

## Эндпоинт

`POST /api/careers/analyst/submit` — принимает анкету, возвращает `200 {ok:true}`.

## Ветки и деплой

- `dev` — разработка
- `stag` — staging, автодеплой из stag (Railway, проект stag)
- `prod` — продакшен, ручной деплой из prod (Railway, проект prod)

## Переменные окружения

Настраиваются в Railway (в репозиторий не коммитятся). См. `.env.example`.

```
OPENAI_API_KEY=
ZOHO_USER=hello@equilonfx.com
ZOHO_APP_PASSWORD=
NOTIFY_EMAIL_1=hello@equilonfx.com
NOTIFY_EMAIL_2=shadovz.bn@gmail.com
PORT=3000
```
