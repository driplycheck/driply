# Driply — Design Handoff for Claude Code

> Put this file in the repo root (`driply/DESIGN_HANDOFF.md`) and point Claude Code to it.
> Figma file: https://www.figma.com/design/Pobsxx9qmiLSMwgR8G99aW

## 0. Chosen direction

The app ships **three user-selectable themes**:

| id | Name in UI (RU / EN) | Figma variant | Character |
|---|---|---|---|
| `dark` | Тёмная / Dark | B · Mono | graphite + white, lime only for drips |
| `light` | Светлая / Light | C · Paper | warm paper, black text, one red accent |
| `neon` | Цветная / Neon | A · Neon | lime + violet + pink, soft glows |

Default = follow Telegram (`colorScheme === 'light'` → `light`, otherwise `dark`) until the user picks a theme explicitly.
Switching a theme must be a token swap (§2), never per-theme component code.

## 1. Figma references (use Figma MCP: `get_design_context`, `get_screenshot`, `get_variable_defs`)

| Screen | Theme | Link |
|---|---|---|
| Feed | Mono | https://www.figma.com/design/Pobsxx9qmiLSMwgR8G99aW/Driply?node-id=9-18 |
| Profile | Mono | https://www.figma.com/design/Pobsxx9qmiLSMwgR8G99aW/Driply?node-id=9-97 |
| Leaderboard & drips | Neon (apply Mono tokens) | https://www.figma.com/design/Pobsxx9qmiLSMwgR8G99aW/Driply?node-id=2-4 |
| New outfit (composer) | Neon (apply Mono tokens) | https://www.figma.com/design/Pobsxx9qmiLSMwgR8G99aW/Driply?node-id=2-5 |
| Feed / Profile | Neon (reference) | node-id=2-2 / node-id=2-3 |
| Feed / Profile | Paper (reference) | node-id=9-184 / node-id=9-263 |
| Brand board | — | node-id=6-65 |
| `drip-coin` component | — | node-id=8-9 |

Gradients in Figma where outfit photos should be are **placeholders** — in code always render the real post image (`object-fit: cover`).

## 2. Design tokens

Implement as CSS custom properties on `:root[data-theme="..."]`. Components must read only tokens, never raw hex.

| Token | `dark` (Mono) | `neon` | `light` (Paper) |
|---|---|---|---|
| `--bg` | `#0A0A0A` | `#09090B` | `#F3F1EC` |
| `--surface` | `#141414` | `#141418` | `#FFFFFF` |
| `--surface-2` | `#1A1A1A` | `#1C1C22` | `#FFFFFF` |
| `--border` | `rgba(255,255,255,.08)` | `rgba(255,255,255,.08)` | `rgba(17,17,17,.08)` |
| `--text` | `#F5F5F5` | `#F5F5F7` | `#111111` |
| `--text-2` | `#B5B5B5` | `#B8B8C4` | `#5E5A52` |
| `--text-muted` | `#8A8A8A` | `#8A8A96` | `#7A766E` |
| `--primary` (main buttons, active chip, FAB) | `#F2F2F2` | `#C6FF3D` | `#111111` |
| `--on-primary` | `#0A0A0A` | `#09090B` | `#F3F1EC` |
| `--drip` (currency, "Дрипнуть", drip counters) | `#C6FF3D` | `#C6FF3D` | `#111111` |
| `--on-drip` | `#09090B` | `#09090B` | `#F3F1EC` |
| `--notify` (unread dot) | `#F2F2F2` | `#FF4D8D` | `#FF4D2E` |
| `--status` (founder badge etc.) | `#D4D4D4` | `#7C5CFF` | `#5E5A52` |
| `--glow-1` (decorative blurred blob, top) | `transparent` | `rgba(124,92,255,.35)` | `transparent` |
| `--glow-2` (decorative blurred blob, bottom) | `transparent` | `rgba(198,255,61,.12)` | `transparent` |
| `--tabbar-bg` | `rgba(22,22,22,.9)` | `rgba(22,22,28,.9)` | `rgba(255,255,255,.9)` |
| `--shadow-drip` | `0 6px 20px rgba(198,255,61,.35)` | `0 6px 20px rgba(198,255,61,.45)` | `0 6px 20px rgba(0,0,0,.12)` |

**On-photo tokens are theme-independent** (real photos can be any colour, so text over them must always be readable).
Everything placed ON an outfit photo — style badge, author, caption, actions — uses these in all three themes:
`--on-photo: #FFFFFF` · `--on-photo-muted: rgba(255,255,255,.72)` · scrim `linear-gradient(transparent, rgba(0,0,0,.85))`.
(The light Paper mockup in Figma shows a light scrim over a placeholder — ignore that, use the dark scrim.)

Radii: `--r-sm: 12px` · `--r-md: 16px` (buttons) · `--r-lg: 22px` (cards, inputs) · `--r-xl: 28px` (feed card) · pills `999px`.
Spacing: screen gutter `16px`; section gap `16–24px`; chip padding `9px 16px`.
Glass (badges on photos, tab bar): `background: rgba(9,9,11,.45); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,.15)`.

## 3. Typography

Load from Google Fonts: **Unbounded** (700, 900) and **Onest** (400, 500, 600, 700). Both support Cyrillic.

| Role | Font | Size / weight |
|---|---|---|
| Logo `driply.` | Unbounded | 26 / 900, letter-spacing −3%, dot = `--drip` circle 8px (Mono/Neon) |
| Screen title | Unbounded | 26 / 700 |
| Big numbers (drips, ranks, stats) | Unbounded | 17–30 / 700–900 |
| Tabs | Onest | 17 / 700 active, 500 inactive (`--text-muted`) |
| Body / captions | Onest | 14–15 / 400 |
| Names | Onest | 15 / 600 |
| Meta | Onest | 12 / 400 `--text-muted` |
| Badges | Onest | 11 / 700, uppercase, letter-spacing 8% |

## 4. Components to build (in `/web/src/components/ui/`)

1. `DripCoin` — SVG circle + "d" (Unbounded 900). Props: `size`, `tone: 'drip' | 'ink'`. **Replaces every droplet/emoji used for the currency.**
2. `Chip` — style filter; active = `--primary` bg.
3. `Button` — variants `primary`, `secondary` (surface-2 + border), `drip` (drip bg + DripCoin + label).
4. `GlassBadge` — style badge / rank badge over photos.
5. `OutfitCard` — full-width, radius 28, photo + bottom gradient scrim, author row, caption, actions (flame, comments, bookmark, drip button).
6. `TabBar` — floating pill, 68px high, 16px from edges, center FAB (52px, `--primary`, plus icon). Icons: lucide-react (`Home`, `Search`, `Plus`, `BarChart2`, `User`).
7. `StatRow`, `RankCard` (progress bar in `--drip`), `LeaderRow`, `Podium`.

## 5. Theme switching & Telegram integration

**Implementation**
- `web/src/theme/tokens.css` — three blocks: `:root[data-theme="dark"]`, `[data-theme="light"]`, `[data-theme="neon"]`.
- `web/src/theme/ThemeProvider.tsx` — React context: `{ theme, setTheme, isAuto }`, `theme: 'dark' | 'light' | 'neon'`.
- Persist the choice in **Telegram CloudStorage** (`Telegram.WebApp.CloudStorage.setItem('theme', id)`), key `theme`, value `dark|light|neon|auto`. It syncs across the user's devices and needs no DB migration. Fall back to `localStorage` (wrapped in try/catch) if CloudStorage is unavailable.
- `auto` (default) listens to `Telegram.WebApp.onEvent('themeChanged')` and re-resolves `light`/`dark`.
- **No flash on start:** apply `data-theme` synchronously in `index.html` before React mounts (inline script reads `localStorage` cache + `Telegram.WebApp.colorScheme`), then reconcile with CloudStorage once it resolves.
- On every theme change call `Telegram.WebApp.setHeaderColor(bg)`, `setBackgroundColor(bg)`, and `setBottomBarColor(bg)` if available, with the resolved `--bg` value.
- Theme change animates: `transition: background-color .25s, color .25s, border-color .25s` on themed surfaces (not on `*`).
- Decorative glows are two fixed `div`s with `filter: blur(120px)` using `--glow-1/--glow-2`; in `dark`/`light` they are transparent, so no per-theme JSX.
- Respect `safe-area` insets; tab bar sits above `env(safe-area-inset-bottom)`.

**Settings UI** (Profile → settings icon → «Оформление» / "Appearance")
- Four options: `Как в Telegram` (auto), `Тёмная`, `Светлая`, `Цветная`.
- Each option is a mini preview card (~100×140) drawn with that theme's tokens: bg, a small feed card, a chip in `--primary`, a DripCoin. Selected = 2px `--primary` outline + check.
- Tapping applies instantly (live preview), no save button. Fire `Telegram.WebApp.HapticFeedback.selectionChanged()`.
- Strings go through i18n (RU/EN).

**QA for every screen, every theme**
- Check each finished screen in all three themes (+ auto in Telegram light and dark).
- Contrast: body text vs `--bg` ≥ 4.5:1; `--on-drip` vs `--drip` ≥ 4.5:1.
- No hardcoded hex in components: `grep -rE "#[0-9a-fA-F]{6}" web/src/components` must return only `tokens.css`.

## 6. Rules for the implementation

- **Presentation only.** Do not change Supabase calls, RPC names, edge functions, economy numbers, or referral logic.
- Work on a branch `design/mono`. One PR-sized step at a time, in this order:
  1. tokens for all 3 themes + fonts + ThemeProvider + no-flash script → 2. Appearance settings screen (so every later step can be checked in all themes) → 3. `DripCoin` + replace currency icons → 4. base components (§4, 1–6) → 5. Feed → 6. Profile → 7. Leaderboard → 8. Composer.
- After each step: `npm run build` + ESLint must pass; ship via `~/Documents/driply_push.sh` (never plain `git push`); check the Vercel deployment before testing in Telegram.
- Keep i18n: every new string goes through the existing RU/EN i18n, no hardcoded Russian.
- Compare each finished screen with the Figma screenshot (`get_screenshot`) and list visible differences before moving on.
