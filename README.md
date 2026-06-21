# Driply

> Telegram Mini App for rating outfits — vote on style, climb the leaderboard, discover items.

**Status:** MVP in active development.

## What it is
A vertical, TikTok-style feed where users post their outfits and rate others'
style using a virtual currency. The more your looks are rated, the higher you
climb the global ranking. Every outfit's items are tagged into a shared,
searchable library — find any piece by name and see who wore it.

## Core features (MVP)
- Vertical outfit feed
- Style voting with a two-currency economy (daily credits -> style score)
- Global ranking
- Item tagging by category (top / bottoms / shoes / accessory / other)
- Searchable item library

## Tech stack
- **Frontend:** React + Vite (Telegram Mini App)
- **Backend:** Supabase (Postgres, Storage, auth via Telegram initData)
- **Bot / entry point:** Python (aiogram)
- **Deploy:** Vercel (frontend), auto-deploy from `main`

## Structure
```
/web        React Telegram Mini App
/bot        aiogram bot (entry point + notifications)
/supabase   SQL schema & migrations
```

## Setup
Setup instructions are added as the project is built.
Secrets live in local `.env` files and are never committed.

## License
Proprietary. All rights reserved. Not licensed for reuse.
