import asyncio
import os

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import CommandStart
from aiogram.types import (
    Message,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    WebAppInfo,
)
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.environ["BOT_TOKEN"]
WEBAPP_URL = os.environ["WEBAPP_URL"]  # Vercel URL of the Mini App

dp = Dispatcher()

WELCOME = {
    "ru": {
        "text": "<b>Driply</b> — открывай мини-апп, там всё 👇",
        "button": "Открыть Driply",
    },
    "en": {
        "text": "<b>Driply</b> — open the mini app, it’s all there 👇",
        "button": "Open Driply",
    },
}


def pick_lang(code: str | None) -> str:
    return "ru" if (code or "").lower().startswith("ru") else "en"


@dp.message(CommandStart())
async def start(message: Message) -> None:
    lang = pick_lang(message.from_user.language_code if message.from_user else None)
    copy = WELCOME[lang]
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[[
            InlineKeyboardButton(
                text=copy["button"],
                web_app=WebAppInfo(url=WEBAPP_URL),
            )
        ]]
    )
    await message.answer(copy["text"], reply_markup=keyboard)


async def main() -> None:
    bot = Bot(BOT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
