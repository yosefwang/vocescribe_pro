# 14 — UI Screens

Screen-by-screen implementation guide derived from `ui/Vocescribe.html` (desktop) and `ui/Vocescribe Mobile.html` + `ui/mobile.jsx` (mobile).

> **Rule:** Every pixel value, color, font size, and layout measurement is specified in [13 — Design System](13-design-system.md). This document describes *what* to build on each screen and *how* it must be assembled. When in doubt, open the source HTML files in a browser — they are the ground truth.

---

## Desktop Layout Shell

```css
#app  { position: relative; min-height: 100vh; }
.rail { position: fixed; left: 0; width: 72px; /* see design system */ }
.main { margin-left: 72px; padding-bottom: 110px; }
.mini { position: fixed; left: 72px; right: 0; bottom: 0; z-index: 50; }
```

**Top bar (`.topbar`):**
```css
display: flex; align-items: center; gap: 14px;
padding: 22px 36px 16px;
```
Contains: search bar (flex 1), theme toggle button, upload button.

**Screen switching:**  
All screens live in the DOM simultaneously as `.screen` divs. Only `.screen.active` has `display: block`. Animate with `fadein .25s ease`.

---

## Screen 01 — Library (Desktop)

**Route:** `/(dashboard)/library`

### Layout

```
┌─ topbar: search + theme toggle + upload CTA ────────────────┐
│  padding: 22px 36px 16px                                     │
├─ page-h: "Your Library" h1 + subtitle ──────────────────────┤
│  padding: 0 36px 24px                                        │
├─ .continue — hero resume card (3-column grid) ───────────────┤
│  margin: 0 36px 40px                                         │
├─ .shelf "In Progress" ──────────────────────────────────────┤
│  .grid: auto-fill minmax(180px, 1fr), gap 28px 22px          │
├─ .shelf "Processing" (if any) ──────────────────────────────┤
└─ .shelf "Library" (all books) ──────────────────────────────┘
```

### Page Heading (`.page-h`)

```css
padding: 0 36px 24px;
display: flex; align-items: flex-end; justify-content: space-between; gap: 24px;
```
- `h1`: serif, 56px, weight 400, line-height 0.95, letter-spacing -0.025em, `opsz 72`. Content: `"Your <em>Library</em>"`  
- `.sub`: ink-3, 13px, max-width 340px, line-height 1.5

### Continue Hero Card (`.continue`)

Three-column grid: cover (200px) | body (1fr) | actions (280px).

```
┌────────────┬──────────────────────────────┬────────────────────┐
│ cover-wrap │ .body                        │ .actions           │
│ bg paper-3 │  eyebrow · title · author   │ play button + info │
│ border-r   │  progress bar · facts        │ border-l           │
└────────────┴──────────────────────────────┴────────────────────┘
```

- Cover: `156px × 228px`, box-shadow `0 10px 28px -14px #00000055`
- Body padding: `28px 32px`, title font-size 38px serif
- Progress bar: `height: 3px`, fill `var(--marker)`
- Play button (`.play-big`): `56px × 56px`, circle, background `var(--ink)`, hover → `var(--gold)`
- Chapter label: mono, 10px, uppercase, `color: var(--ink-3)`
- Sentence preview: serif, 15px, italic, `color: var(--ink-2)`

### Shelf (`.shelf`)

```css
padding: 0 36px; margin-bottom: 44px;
```
Header: shelf title (serif 22px) + count (mono 11px) + sort options, separated by `border-bottom: 1px solid var(--rule); padding-bottom: 10px`.

**Sort options:** mono, 10.5px, uppercase, letter-spacing 0.1em. Active sort: `color: var(--ink); border-bottom: 1px solid var(--marker); padding-bottom: 2px`.

### Book Card (`.card`)

- Grid: `repeat(auto-fill, minmax(180px, 1fr))`, `gap: 28px 22px`
- Cover: `aspect-ratio: 2/3`, hover lifts `translateY(-4px)` in 0.2s
- Status badge: mono 9px, uppercase, `padding: 3px 6px`, `border-radius: 1px`
  - generating: `background: var(--marker)`
  - new: `background: var(--ink)`
- Title: serif 15px weight 500
- Author: sans 11.5px `color: var(--ink-3)`
- Duration: mono 10px `color: var(--ink-3)`
- Progress bar: `height: 2px`, fill `var(--marker)`

---

## Screen 02 — Book Detail (Desktop)

**Route:** `/(dashboard)/books/[id]`

### Layout

Two-column grid: `340px | 1fr`, `gap: 48px`, `padding: 8px 36px 40px`.

**Left column** (sticky, top 22px):
- Cover: `280px wide`, `aspect-ratio: 2/3`, shadow `0 30px 60px -30px #00000088`
- Facts table (`.facts`): mono 11px, ink-3, line-height 2, `width: 280px`. Each row: label + value, separated by `border-bottom: 1px dashed var(--rule)`. Value column: `color: var(--ink)`

**Right column:**
- Breadcrumb: mono 11px, ink-3, uppercase, `letter-spacing: 0.08em`, `margin-bottom: 18px`
- Title `h1`: serif 68px, weight 300, line-height 0.98, `letter-spacing: -0.03em`, `opsz 72`. `em` → italic, `color: var(--gold)`
- Author (`.au`): serif italic 22px, `color: var(--ink-2)`, `margin-bottom: 18px`
- Description (`.lede`): serif 18px, weight 300, line-height 1.55, `color: var(--ink-2)`, `max-width: 620px`, with drop cap

### Generation Panel (`.gen-panel`)

```css
border: 1px solid var(--rule); background: var(--paper-2);
padding: 22px 24px; margin: 22px 0 28px;
display: grid; grid-template-columns: 1fr auto; gap: 22px; align-items: center;
```

Left side: eyebrow label + voice chip row.  
Right side: "Generate Audiobook" primary button.

**Voice chips** (row of 6): see `.voice-chip` in design system. Labels: `alloy · echo · fable · onyx · nova · shimmer`.

### Chapters Table

Full-width table; see `.chapters-table` in design system. Columns: `# | Title | Words | Status | Duration | Play`.

Status column uses `.st-pill`. Play column uses `.plybtn` (28px circle).

---

## Screen 03 — Player / Reader (Desktop)

**Route:** `/(dashboard)/player/[bookId]/[chapterNumber]`

### Header Bar

```css
display: flex; align-items: center; justify-content: space-between;
padding: 18px 36px; border-bottom: 1px solid var(--rule);
```
Left: back button + breadcrumb. Right: settings/tweaks trigger + fullscreen toggle.

### Reading Frame

```css
.reading-frame {
  max-width: 760px;
  margin: 60px auto 180px;
  padding: 0 40px;
}
```

**Chapter heading (`.chapter-head`):**
- Eyebrow: mono 11px, uppercase, `letter-spacing: 0.2em`, ink-3, `margin-bottom: 14px`
- `h2`: serif, weight 300, 42px, italic, `opsz 72`, `letter-spacing: -0.02em`
- Ornament: `font-size: 18px; color: var(--ink-3); letter-spacing: 8px; margin-top: 22px`

**Paragraphs:**
- `margin: 0 0 1.4em; text-wrap: pretty; text-indent: 2em`
- First paragraph: `text-indent: 0` + drop cap

**Sentence sync markup:**
```html
<p class="para">
  <span class="sent" data-idx="0">
    <span class="word"><span class="base">It</span><span class="wipe">It</span></span>
    <!-- each word wrapped -->
  </span>
</p>
```

### Fullscreen Player (`.fsp`)

Triggered by expand button. Overlays entire viewport (z-index 80), slides up with `slideup .35s`.

```
┌─ fsp-bar: back + title + controls ──────────────────────────┐
├─────────────────────────────────┬───────────────────────────┤
│ .reading-col (overflow-y: auto) │ .sidebar-col (340px)      │
│  reading-frame (same as above)  │  chapter list             │
│                                 │  voice info               │
├── gradient overlay ─────────────┤                           │
│   .fsp-controls (absolute)      │                           │
│   scrub · transport · chapter   │                           │
└─────────────────────────────────┴───────────────────────────┘
```

Fullscreen controls use `var(--gold)` for scrub fill + knob (instead of `var(--ink)` in mini player). Big play button: `62px × 62px`.

Sidebar chapter list: `li` with mono chapter number + serif title. Active chapter: `color: var(--gold); font-style: italic`. Done chapters: `✓` prefix, `color: var(--green)`.

---

## Screen 04 — Upload (Desktop)

**Route:** `/(dashboard)/library` (upload modal or upload page)

```css
max-width: 880px; margin: 0 auto; padding: 0 36px;
```

- Eyebrow: "New Book"
- `h1`: serif 54px, weight 300, `letter-spacing: -0.025em`, `opsz 72`
- Description: sans, 15px, ink-3, `max-width: 520px`

**Dropzone:** see design system `.dropzone`.

**Upload progress panel** (shown after file selection):
- Three-step indicator: `Step 1 (uploading) · Step 2 (parsing) · Step 3 (ready)`
- Active step dot: `animation: pulse 1.3s infinite`, color `var(--gold)`

**Result panel** (shown on success): book cover + metadata + chapter count list.

---

## Mobile Screen Inventory

All mobile screens are inside a phone frame (`380px × 820px`, border-radius 50px). The app shell structure:

```
.ptop (52px status bar spacer)
.appbar (44px)
[screen content]
.mini-m (56px, above tabbar, floating)
.tabbar (86px)
```

---

## Mobile Screen 01 — Library

**Route:** `/library`

```
ptop + appbar (logo "V" italic + search ibtn + upload ibtn)
── Greeting: serif 28px weight 300 "Good evening, Ada" ──────
── .continue-m: resume card ─────────────────────────────────
── .shelf-h "In Progress" + .hshelf (horizontal scroll) ─────
   [.mini-card × N: 110px × 165px covers]
── .shelf-h "Processing" + .vlist ───────────────────────────
   [.vrow: 48px × 70px cover + title + status .pill]
── .shelf-h "Ready" + .vlist ────────────────────────────────
   [.vrow: 48px × 70px cover + title + duration]
── .mini-m ──────────────────────────────────────────────────
── .tabbar ──────────────────────────────────────────────────
```

**Continue card (`.continue-m`):**
```css
margin: 14px 18px;
border: 1px solid var(--rule); background: var(--paper-2);
border-radius: 4px; padding: 14px;
display: flex; gap: 14px;
```
Cover: `68px × 100px`. Play button (`.playb`): `42px × 42px` circle, `background: var(--ink)`, absolutely positioned right-center.

**Horizontal shelf (`.hshelf`):** `padding: 0 22px 6px; display: flex; gap: 14px; overflow-x: auto; scrollbar-width: none`.

**Mini card (`.mini-card`):** `width: 110px; height: 165px`. Title: serif 13px. Author: 10.5px ink-3.

**Vertical row (`.vrow`):** cover 48px × 70px + mid column (title serif 15px, author 11.5px, meta mono 10px) + status `.pill` right.

---

## Mobile Screen 02 — Book Detail

**Route:** `/books/[id]`

```
ptop + appbar (← back + "…" more)
── det-hero: gradient bg ────────────────────────────────────
   cover (150px × 224px, shadow 0 18px 40px -20px #000a)
   h1: serif 30px weight 300 opsz 72 (em → var(--gold))
   author: serif italic 14px ink-3
   facts: flex row (mono 10.5px ink-3, dot separators)
── det-actions: two .bigbtn (▶ Resume + bookmark ghost) ────
── voice-box: eyebrow + row of voice chips ──────────────────
── det-desc: description serif 14.5px weight 300 ────────────
── .chlist-m: chapter list with .chrow per chapter ──────────
   .mini-m
   .tabbar
```

**Det-hero** gradient: `linear-gradient(180deg, var(--paper-3), transparent)`.

**Actions row:** `display: flex; gap: 8px; padding: 0 18px`.

**Chapter row (`.chrow`):**
- Chapter number: mono 11px, ink-4, `width: 22px`, tabular-nums
- Title: serif 14.5px
- Duration: mono 11px, ink-2
- Play button (`.plb`): `30px × 30px` circle. Done: fill gold. Running: border gold. Queued: opacity 0.4.
- Playing row: `.ct .t` → `color: var(--gold)`. Button: gold filled.

---

## Mobile Screen 03 — Player (Word-Wipe Mode)

**Route:** `/player/[bookId]/[chapterNumber]`

```
── phead: book title (serif 13px) + chapter (mono 10px) + close ✕
── reading-m: scrollable reading area ──────────────────────────
   .chead: chapter eyebrow + h2 italic 26px + ornament
   .para: serif reading text with .sent/.word markup
── pcontrols: pinned bottom ────────────────────────────────────
   scrub bar (gold fill)
   transport: ⟨⟨  ↺15  ▶  ↺15  ⟩⟩
   bottom bar: speed pill · sleep · chapters
```

**Reading container (`.reading-m`):**
```css
flex: 1; overflow-y: auto; padding: 22px 22px 24px;
font-family: var(--font-serif);
font-size: var(--reading-size);
line-height: var(--reading-lh);
color: var(--ink-2);
```

**Word wipe** is the default highlight mode on mobile. `.sent` transitions on `color, opacity` at 0.25s.

**Player header (`.phead`):**
```css
border-bottom: 1px solid var(--rule); background: var(--paper-2);
padding: 10px 18px;
display: flex; align-items: center; gap: 10px;
```
Cover thumbnail: `30px × 44px`. Title: serif 13px. Chapter: mono 10px ink-3.

---

## Mobile Screen 04 — Upload

**Route:** `/upload`

```
ptop + appbar (← back + "Upload")
── padding 18px ─────────────────────────────────────────────
   h1: serif 28px weight 300 opsz 72
   description: 14px ink-3 line-height 1.55
   .dropzone-m: dashed border, centered, upload icon 28px
   "Choose EPUB file" primary button
   "Tap to browse or drag EPUB here" label
   ".epub up to 50 MB" constraint mono 11px ink-4
── (if uploading) .up-progress-m: step list ─────────────────
```

**Mobile dropzone (`.dropzone-m`):**
```css
border: 1px dashed var(--ink-3); background: var(--paper-2);
padding: 36px 24px; border-radius: 4px;
text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px;
```

---

## Mobile Screen 05 — Immersive Player (Block Mode)

Same as Screen 03 but:
- No `.phead` border / chrome — borderless, background flush with paper
- `--hl-mode: sentence` (block/underline highlight instead of word wipe)
- No tabbar visible (full immersion)

The `.reading-m.block` class applies the sentence highlight overrides:
```css
.reading-m.block .sent { opacity: .35; }
.reading-m.block .sent.active {
  opacity: 1;
  background: linear-gradient(180deg, transparent 62%, var(--marker) 62%, var(--marker) 92%, transparent 92%);
  padding: 0 2px; margin: 0 -2px; color: var(--ink);
}
.reading-m.block .wipe { display: none; }
```

---

## Dark Mode Screens

Dark mode is toggled by adding `html[data-theme="dark"]` (desktop) or `.dark` class to `.app` (mobile). **All color tokens automatically invert** — no component-level overrides needed beyond what the CSS variables provide.

Dark mode must be implemented and tested for:
- Library (desktop + mobile)
- Player / Immersive (desktop + mobile)

Dark phone frame shadow: `0 40px 80px rgba(0,0,0,0.5), 0 0 0 2px rgba(0,0,0,0.3), 0 0 0 14px #0d0b08`.

---

## Implementation Rules

1. **Open the source HTML files in a browser before implementing any screen.** They are fully interactive prototypes with all states.

2. **Never approximate measurements.** Every pixel value exists in the design files. If you don't know a value, read the source CSS.

3. **Font loading is required** before any screen renders. Use `font-display: block` or a `<link rel="preload">` for Newsreader — without it, the serif headings will flash in a fallback font.

4. **The paper texture** (`.paper-tex`) must be applied to the main content wrapper. It creates the tactile warmth that defines the aesthetic.

5. **`border-radius: 2px`** is the default for all interactive elements (buttons, chips, panels). This is intentional — it is not `4px` or `0`. Mobile-only exceptions: `border-radius: 4px` for cards and dropzone, `border-radius: 8px` for the floating mini player.

6. **Monospace for all metadata.** Duration, word count, chapter numbers, timestamps, status pills, keyboard shortcuts — everything informational uses `--font-mono`.

7. **Dark mode uses CSS variables only** — no JavaScript class toggling of individual component styles.

8. **The active nav indicator** on the rail is a `2px` left edge line via `::before` pseudo-element at `left: -15px` — it extends outside the button bounds. The rail must have `overflow: hidden` disabled or the line will be clipped.

---

*Back to [Documentation Hub](index.md)*
