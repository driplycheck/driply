import asyncio
import logging
import os

import aiohttp

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import Command, CommandObject, CommandStart
from aiogram.types import (
    BotCommand,
    BotCommandScopeDefault,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
    MenuButtonWebApp,
    WebAppInfo,
)
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.environ["BOT_TOKEN"]
WEBAPP_URL = os.environ["WEBAPP_URL"]  # Vercel URL of the Mini App
# Необязательно: с этими двумя переменными бот пишет событие /start в аналитику
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("driply-bot")

dp = Dispatcher()

COPY = {
    "ru": {
        "welcome": "<b>Driply</b> — открывай мини-апп, там всё 👇",
        "welcome_ref": "<b>Driply</b> — тебя пригласил друг. Открой мини-апп и выложи первый образ: бонус придёт обоим 👇",
        "open": "Открыть Driply",
        "help": (
            "<b>Driply</b> — лента образов.\n\n"
            "/app — открыть мини-апп\n"
            "/help — эта справка\n\n"
            "Вопросы и жалобы — пиши сюда же, читаю."
        ),
        "cmd_start": "Открыть Driply",
        "cmd_app": "Открыть мини-апп",
        "cmd_help": "Что это и как работает",
        "menu": "Driply",
    },
    "en": {
        "welcome": "<b>Driply</b> — open the mini app, it’s all there 👇",
        "welcome_ref": "<b>Driply</b> — a friend invited you. Open the mini app and post your first look: you both get a bonus 👇",
        "open": "Open Driply",
        "help": (
            "<b>Driply</b> is a feed of outfits.\n\n"
            "/app — open the mini app\n"
            "/help — this help\n\n"
            "Questions or reports — just write here, I read them."
        ),
        "cmd_start": "Open Driply",
        "cmd_app": "Open the mini app",
        "cmd_help": "What this is and how it works",
        "menu": "Driply",
    },
}


async def track(tid: int, kind: str, meta: dict | None = None) -> None:
    """Событие воронки. Без ключей Supabase молча пропускаем — бот должен работать и так."""
    if not (SUPABASE_URL and SUPABASE_SERVICE_KEY):
        return
    payload = {"p_tid": tid, "p_kind": kind, "p_meta": meta or {}}
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }
    try:
        timeout = aiohttp.ClientTimeout(total=5)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(f"{SUPABASE_URL}/rest/v1/rpc/track_event", json=payload, headers=headers) as res:
                if res.status >= 300:
                    log.warning("track %s failed: %s %s", kind, res.status, await res.text())
    except Exception as e:  # аналитика не должна ронять ответ юзеру
        log.warning("track %s error: %s", kind, e)


def pick_lang(message: Message) -> str:
    code = (message.from_user.language_code if message.from_user else "") or ""
    return "ru" if code.lower().startswith("ru") else "en"


def open_button(lang: str, ref: str | None = None) -> InlineKeyboardMarkup:
    # реф-код кладём в адрес мини-аппа: так он доезжает даже если ссылка была вида ?start=
    sep = "&" if "?" in WEBAPP_URL else "?"
    url = f"{WEBAPP_URL}{sep}ref={ref}" if ref else WEBAPP_URL
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text=COPY[lang]["open"], web_app=WebAppInfo(url=url))
    ]])


def parse_ref(payload: str | None) -> str | None:
    if not payload:
        return None
    code = payload[4:] if payload.startswith("ref_") else payload
    code = "".join(ch for ch in code if ch.isalnum() or ch in "-_")[:64]
    return code or None


@dp.message(CommandStart())
async def start(message: Message, command: CommandObject | None = None) -> None:
    lang = pick_lang(message)
    ref = parse_ref(command.args if command else None)
    text = COPY[lang]["welcome_ref"] if ref else COPY[lang]["welcome"]
    await message.answer(text, reply_markup=open_button(lang, ref))
    if message.from_user:
        asyncio.create_task(track(message.from_user.id, "bot_start", {"ref": bool(ref), "lang": lang}))


@dp.message(Command("app"))
async def app_cmd(message: Message) -> None:
    lang = pick_lang(message)
    await message.answer(COPY[lang]["welcome"], reply_markup=open_button(lang))


@dp.message(Command("help"))
async def help_cmd(message: Message) -> None:
    lang = pick_lang(message)
    await message.answer(COPY[lang]["help"], reply_markup=open_button(lang))


async def setup(bot: Bot) -> None:
    """Меню команд и синяя кнопка мини-аппа — ставятся при каждом запуске."""
    # en — список по умолчанию, ru — локализованный поверх него
    for lang, code in (("en", None), ("ru", "ru")):
        await bot.set_my_commands(
            [
                BotCommand(command="start", description=COPY[lang]["cmd_start"]),
                BotCommand(command="app", description=COPY[lang]["cmd_app"]),
                BotCommand(command="help", description=COPY[lang]["cmd_help"]),
            ],
            scope=BotCommandScopeDefault(),
            language_code=code,
        )
    await bot.set_chat_menu_button(
        menu_button=MenuButtonWebApp(text=COPY["ru"]["menu"], web_app=WebAppInfo(url=WEBAPP_URL))
    )


async def main() -> None:
    bot = Bot(BOT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    me = await bot.get_me()
    log.info("bot @%s started, webapp=%s", me.username, WEBAPP_URL)
    if not (SUPABASE_URL and SUPABASE_SERVICE_KEY):
        log.warning("analytics off: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to log /start")
    await setup(bot)
    try:
        # старые апдейты за время простоя не нужны, слушаем только сообщения
        await dp.start_polling(bot, allowed_updates=["message"], drop_pending_updates=True)
    finally:
        await bot.session.close()
        log.info("bot stopped")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        log.info("shutdown")
