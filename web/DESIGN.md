# LibroYa — Design System

## Direction
Premium e-commerce for e-books. Editorial but modern: deep indigo ink on a soft lavender-tinted canvas, with a violet gradient as the single accent. Calm, confident, "bookshop at night" feeling. Boldness lives in one place only: the hero headline with gradient text and mesh background.

## Mode
Operate (catalog/cart/checkout) + Persuade (home hero).

## Palette (4–6 named hex)
- `--ink-950` `#1E1B4B` — primary text, headlines
- `--ink-700` `#334155` — body text
- `--ink-500` `#64748B` — muted/secondary text
- `--canvas` `#F8F7FC` — page background (lavender tint, never pure white)
- `--surface` `#FFFFFF` — cards, panels
- `--accent` `#6366F1` (indigo-500) → `#7C3AED` (violet-600) gradient for CTAs
- `--accent-soft` `#EEF2FF` — accent tint (chips, badges)
- `--success` `#10B981` — stock ok, paid, delivered
- `--warning` `#F59E0B` — low stock
- `--danger` `#EF4444` — errors, unavailable, remove
- Dark mode canvas `#0B0A14` (indigo-black), surface `#15131F`, text `#E8E6F5`.

## Typography
- Display/headlines: `Sora` (700/800), tracking -0.02em.
- Body/UI: `Geist Sans` (400/500/600).
- Mono (ISBN, order ids, prices in tables): `Geist Mono` — only for codes, never for labels.
- Scale: 12 / 14 / 16 / 18 / 20 / 24 / 32 / 44 / 64 (px). Line-height 1.5 body, 1.15 display.

## Layout
- Container max-w-7xl (1280px), px-4 sm:px-6 lg:px-8.
- Radius scale: 6 / 10 / 16 / 24 (sm/md/lg/xl). Cards 16, buttons 10, pills 999.
- Spacing: 4/8/12/16/24/32/48/64.
- Shadows: soft layered (0 1px 2px rgba(30,27,75,.06), 0 8px 24px rgba(30,27,75,.08)).
- Grid: catalog 1/2/3/4 cols at sm/md/lg/xl.

## Principles
1. One accent gradient, used sparingly (CTA, active nav, price emphasis).
2. Quiet surfaces: cards flat with subtle border + soft shadow; no decorative gradients on cards.
3. Motion: one orchestrated moment per page (hero). Micro-interactions only on buttons (press scale 0.98) and cards (hover lift + image zoom).
4. Empty states always have an illustration (inline SVG) + CTA.
5. Skeletons for loading, never spinners except button submit.
6. Focus rings visible (2px indigo outline, offset 2).
7. Respect prefers-reduced-motion.
8. Dark mode first-class.
9. No emojis as icons; lucide-react only.
10. Copy in Spanish, code/comments in English.