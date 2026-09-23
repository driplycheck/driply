# Запуск бота

Мини-апп живёт на Vercel и работает сам по себе. Бот — отдельный процесс: пока он не запущен,
`/start` в Telegram остаётся без ответа, а уведомления о голосах шлёт edge function (они не зависят от бота).

## 0. Переменные окружения

`bot/.env` (в git не попадает):

```
BOT_TOKEN=токен из BotFather
WEBAPP_URL=https://<прод-адрес мини-аппа>     # обязательно https, иначе кнопка «Открыть» не работает
# необязательно — включает запись событий /start в аналитику:
SUPABASE_URL=https://chnvpnbnqvugsbwelmoq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key из Supabase → Project Settings → API>
```

## 1. Проверка и запуск на своей машине (для теста)

```bash
cd bot
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python bot.py --check     # токен, адрес, webhook, команды
.venv/bin/python bot.py             # запуск; работает, пока открыт терминал
```

`--check` пишет «ВНИМАНИЕ: висит webhook», если у бота настроен webhook: тогда polling не получает
апдейты и `/start` молчит. Снять: `curl "https://api.telegram.org/bot<TOKEN>/deleteWebhook"`.

## 2. Постоянный запуск

**Хостинг (Railway, Render, Amvera).** Создать сервис типа worker из этого репозитория,
корень `bot/`, Dockerfile уже лежит рядом. Переменные окружения задать в панели.

**Свой VPS.** Скопировать репозиторий в `/opt/driply`, создать venv, положить `.env`,
затем взять `bot/systemd-driply-bot.service`:

```bash
sudo cp bot/systemd-driply-bot.service /etc/systemd/system/driply-bot.service
sudo systemctl daemon-reload && sudo systemctl enable --now driply-bot
journalctl -u driply-bot -f
```

**Docker.**

```bash
docker build -t driply-bot bot
docker run -d --restart=always --env-file bot/.env --name driply-bot driply-bot
```

## 3. После обновления кода

Бот не деплоится вместе с фронтом: `driply_push.sh` выкатывает только `web/` на Vercel.
После изменений в `bot/bot.py` процесс нужно перезапустить руками
(`systemctl restart driply-bot`, кнопка Redeploy на хостинге или перезапуск контейнера).
