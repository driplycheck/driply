# Бот: где живёт и как обновляется

Бот работает **вебхуком на Supabase Edge Function** `tg-webhook` — отдельный сервер и постоянный
процесс не нужны. Telegram сам присылает апдейты, функция отвечает. Файл `bot/bot.py` остаётся
для локальных экспериментов (режим polling) и в проде не используется.

Адрес вебхука: `https://chnvpnbnqvugsbwelmoq.supabase.co/functions/v1/tg-webhook`

## Секреты функции (Supabase → Project Settings → Edge Functions → Secrets)

| Переменная | Зачем |
|---|---|
| `BOT_TOKEN` | уже стоит, общий с quick-handler |
| `WEBAPP_URL` | прод-адрес мини-аппа, обязательно `https://` — иначе кнопка «Открыть» не работает |
| `TG_WEBHOOK_SECRET` | секрет, которым Telegram подписывает запросы к функции |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | уже стоят, нужны для события `bot_start` в аналитике |

## Подключение (делается один раз)

```bash
# 1. адрес мини-аппа
supabase secrets set WEBAPP_URL=https://<прод-адрес> --project-ref chnvpnbnqvugsbwelmoq
supabase functions deploy tg-webhook --no-verify-jwt --project-ref chnvpnbnqvugsbwelmoq

# 2. сказать Telegram, куда слать апдейты (TOKEN — из BotFather, SECRET — TG_WEBHOOK_SECRET)
curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://chnvpnbnqvugsbwelmoq.supabase.co/functions/v1/tg-webhook" \
  -d "secret_token=<SECRET>" \
  -d "drop_pending_updates=true"

# 3. меню команд и синяя кнопка мини-аппа
curl "https://chnvpnbnqvugsbwelmoq.supabase.co/functions/v1/tg-webhook?setup=<SECRET>"
```

Проверка: `curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"` — в ответе должен быть наш
url и `pending_update_count: 0`. Логи: Supabase → Edge Functions → tg-webhook → Logs.

## Обновление текстов и команд

Правишь `supabase/functions/tg-webhook/index.ts`, потом:

```bash
supabase functions deploy tg-webhook --no-verify-jwt --project-ref chnvpnbnqvugsbwelmoq
```

`driply_push.sh` деплоит только фронт на Vercel, функции — отдельной командой.

## Локальный запуск bot.py (необязательно)

Нужен для отладки без вебхука. Важно: polling и вебхук одновременно не работают —
сначала `deleteWebhook`, потом запускать бота.

```bash
cd bot
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
printf 'BOT_TOKEN=...\nWEBAPP_URL=https://...\n' > .env
.venv/bin/python bot.py --check
.venv/bin/python bot.py
```
