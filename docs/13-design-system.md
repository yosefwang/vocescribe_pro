# 13 — Design System

> **Source of truth:** `ui/Vocescribe.html` (desktop) and `ui/Vocescribe Mobile.html` + `ui/mobile.jsx` (mobile).  
> Every pixel value here is extracted verbatim. Implement exactly as specified — no approximations.

---

## Design Philosophy

Vocescribe uses a **warm editorial aesthetic** — parchment-toned surfaces, serif body text, monospace metadata, and gold/amber accents. The visual language references printed books and reading environments, not software dashboards. The result must feel like a well-designed literary publication, not a generic SaaS product.

---

## Design Files

| File | Purpose |
|---|---|
| `ui/Vocescribe.html` | Desktop web mockup (all screens) |
| `ui/Vocescribe Mobile.html` | Mobile screens showcase |
| `ui/mobile.jsx` | Mobile React component code |
| `ui/app.js` | Desktop React/JS interactive prototype |
| `ui/frames/ios-frame.jsx` | iOS device frame + iOS-native components |

---

## 1. Design Tokens (CSS Custom Properties)

Declare on `:root`. Toggle dark mode via `html[data-theme="dark"]` on desktop, `.dark` class on mobile.

### Color Palette

```css
:root {
  /* Surfaces (light → dark layering) */
  --paper:   #F5F0E6;   /* page background — warm parchment */
  --paper-2: #EFE8DA;   /* elevated: rail, panels, cards */
  --paper-3: #E6DDC9;   /* sunken: progress tracks, cover bg */

  /* Text (ink scale) */
  --ink:   #1A1613;   /* primary text + primary buttons */
  --ink-2: #3A332C;   /* secondary text, body reading */
  --ink-3: #6B6056;   /* muted: captions, placeholders, labels */
  --ink-4: #9A8F83;   /* very muted: disabled, ornaments */

  /* Borders */
  --rule: #1A161320;  /* hairlines — 8% alpha on ink */

  /* Accent */
  --gold:      #A8732F;  /* primary accent, avatar, gold CTA */
  --gold-soft: #C69A5A;  /* soft accent (desktop only) */
  --marker:    #B8894A;  /* progress fill, active nav, highlights */

  /* Semantic */
  --red:   #A8452F;  /* error / failed */
  --green: #5C7A3F;  /* success / done */
}

html[data-theme="dark"] {
  --paper:   #14110D;
  --paper-2: #1C1814;
  --paper-3: #25201A;
  --ink:     #EDE6D8;
  --ink-2:   #C9C0AE;
  --ink-3:   #948A7A;
  --ink-4:   #635B4E;
  --rule:    #EDE6D825;
  --gold:    #D4A15F;
  --gold-soft: #B8894A;
  --marker:  #D4A15F;
  /* --red and --green are unchanged */
}
```

---

### Font Families

```css
:root {
  --font-serif: "Newsreader", "Sectra", Georgia, serif;
  --font-sans:  "Inter Tight", -apple-system, system-ui, sans-serif;
  --font-mono:  "JetBrains Mono", "SF Mono", monospace;
}
```

**Google Fonts load string:**
```html
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300..800;1,6..72,300..800&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

**Font role rules:**
- `--font-serif` → all body reading text, book titles everywhere, chapter headings, cover art text, display headings
- `--font-sans` → all UI chrome, buttons, labels, interactive text, body copy outside of reading view
- `--font-mono` → all metadata, timestamps, word counts, duration, status labels, keyboard shortcuts, eyebrows, chapter numbers

---

### Reading Variables

```css
:root {
  --reading-size: 22px;   /* adjustable 16–28px via settings slider */
  --reading-lh:   1.55;   /* line-height; compact: 1.4, comfortable: 1.7 */
  --hl-mode: word;        /* word | sentence | scale | gutter */
}
```

---

### Body Global

```css
body {
  font-family: var(--font-sans);
  background: var(--paper);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  font-feature-settings: "ss01", "cv11";
  min-height: 100vh;
  overflow-x: hidden;
}
```

---

## 2. Typography Scale

### Text Role Classes

| Class | Font | Size | Weight | Letter-spacing | Other |
|---|---|---|---|---|---|
| `.display` | serif | — | 400 | -0.02em | `opsz 60` |
| `.eyebrow` | mono | 10.5px | — | 0.14em | uppercase, `color: var(--ink-3)` |
| `.meta` | mono | 11px | — | 0.02em | `color: var(--ink-3)` |
| `.num` | mono | — | — | — | `font-variant-numeric: tabular-nums` |
| `.serif` | serif | — | — | — | utility |
| `.sans` | sans | — | — | — | utility |
| `.mono` | mono | — | — | — | utility |

### Page-Level Headings

| Context | Size | Weight | Line-height | Letter-spacing | opsz | Notes |
|---|---|---|---|---|---|---|
| Library `h1` greeting | 56px | 400 | 0.95 | -0.025em | 72 | `em` children: italic, `color: var(--ink-3)` |
| Book Detail `h1` desktop | 68px | 300 | 0.98 | -0.03em | 72 | `em` children: italic, `color: var(--gold)`, weight 300 |
| Book Detail `h1` mobile | 30px | 300 | 1.05 | -0.02em | 72 | `em` children: `color: var(--gold)` |
| Upload `h1` | 54px | 300 | — | -0.025em | 72 | serif |
| Shelf `h2` | 22px | 400 | — | -0.01em | — | serif |
| Continue hero `.t` | 38px | 400 | 1 | -0.02em | — | serif |
| Chapter heading `h2` desktop | 42px | 300 | — | -0.02em | 72 | italic, serif |
| Chapter heading `h2` mobile | 26px | 300 | — | -0.02em | 72 | italic, serif |

### Body Reading

```css
.reading-frame {
  font-family: var(--font-serif);
  font-size: var(--reading-size);    /* 22px default */
  line-height: var(--reading-lh);    /* 1.55 default */
  color: var(--ink-2);
  font-variation-settings: "opsz" 16;
}
```

When "Display" mode is toggled in settings: `font-variation-settings: "opsz" 72`.

### Drop Cap

Applied on `.para:first-of-type::first-letter` in reading view:

```css
.para:first-of-type::first-letter {
  font-size: 3.4em;
  line-height: 0.92;
  float: left;
  padding: 0.08em 0.12em 0 0;
  color: var(--ink);
  font-weight: 400;
  font-style: normal;
}
```

Book detail lede drop cap:
```css
.lede:first-letter {
  font-size: 48px;
  float: left;
  line-height: 0.9;
  padding: 4px 8px 0 0;
  font-weight: 400;
  color: var(--ink);
}
```

---

## 3. Surface Texture

Applied via `.paper-tex` class on the main content area:

```css
.paper-tex {
  background-color: var(--paper);
  background-image:
    radial-gradient(ellipse at top, #00000006, transparent 60%),
    repeating-linear-gradient(0deg, #00000003 0 1px, transparent 1px 3px);
}

html[data-theme="dark"] .paper-tex {
  background-image:
    radial-gradient(ellipse at top, #ffffff04, transparent 60%),
    repeating-linear-gradient(0deg, #ffffff02 0 1px, transparent 1px 3px);
}
```

---

## 4. Component Library

### Icons

All icons are **inline SVG**, never icon fonts or image sprites.

```css
.icn {
  width: 16px; height: 16px;
  stroke: currentColor; fill: none;
  stroke-width: 1.5;
  stroke-linecap: round; stroke-linejoin: round;
}
.icn.sm { width: 13px; height: 13px; }
.icn.lg { width: 22px; height: 22px; }
.icn.xl { width: 28px; height: 28px; }
```

---

### Buttons

```css
.btn {
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 13px;
  padding: 9px 14px;
  border-radius: 2px;
  border: 1px solid var(--rule);
  background: transparent;
  color: var(--ink);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all .12s ease;
  letter-spacing: 0.01em;
}
.btn:hover { border-color: var(--ink); }

.btn.primary { background: var(--ink); color: var(--paper); border-color: var(--ink); }
.btn.primary:hover { background: var(--ink-2); }

.btn.gold { background: var(--gold); color: #fff; border-color: var(--gold); }
.btn.gold:hover { background: var(--marker); }

.btn.ghost { border-color: transparent; }
.btn.ghost:hover { border-color: var(--rule); }

.btn.sm  { padding: 6px 10px; font-size: 12px; }
.btn.xl  { padding: 14px 22px; font-size: 14px; }
.btn.icon { padding: 8px; }
```

---

### Book Cover (`.cov`)

Used in library grid cards, continue card, and detail page. Generated programmatically — no image needed.

```css
.cov {
  width: 100%; height: 100%;
  position: relative;
  display: flex; flex-direction: column;
  justify-content: space-between;
  padding: 14px 14px 16px 18px;
  font-family: var(--font-serif);
  overflow: hidden;
}
/* Horizontal rule ornament at vertical center */
.cov .orn {
  position: absolute; left: 18px; right: 14px;
  top: 50%; height: 1px;
  background: currentColor; opacity: .35;
  transform: translateY(-10px);
}
/* Texture overlay */
.cov::before {
  content: ""; position: absolute; inset: 0;
  background: repeating-linear-gradient(0deg, transparent 0 4px, #00000010 4px 5px);
  pointer-events: none;
}
.cov .spine {
  position: absolute; left: 0; top: 0; bottom: 0;
  width: 7px; background: rgba(0,0,0,.2);
}
.cov .t   { font-size: 15px; line-height: 1.05; letter-spacing: -0.01em; font-weight: 400; z-index: 1; }
.cov .a   { font-family: var(--font-sans); font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.15em; opacity: .75; z-index: 1; }
.cov .mark { position: absolute; right: 12px; top: 12px; font-family: var(--font-mono); font-size: 8.5px; opacity: .6; letter-spacing: .1em; }
```

**Cover color data** (bg → fg → mark text):

| Book | bg | fg | mark |
|---|---|---|---|
| Meditations | `#2E2A24` | `#D4A15F` | M·A |
| Pride and Prejudice | `#7A3A4A` | `#F5E8D5` | 1813 |
| The Great Gatsby | `#1C3A4F` | `#D4A15F` | 1925 |
| 1984 | `#1A1A1A` | `#C44536` | Vol. I |
| Frankenstein | `#2C3A2E` | `#E8D9B8` | 1818 |
| Jane Eyre | `#4A2E3E` | `#E6D5B8` | Vol. II |
| Walden | `#3E4A2E` | `#E6D5B8` | Essay |
| Dracula | `#2A1A1A` | `#A8452F` | 1897 |
| Wuthering Heights | `#3A3A4A` | `#D4C6A8` | 1847 |
| The Iliad | `#5A3A1A` | `#E6C88A` | Bk. I |
| Essays (Montaigne) | `#3A2E1A` | `#C69A5A` | Livre I |
| Moby-Dick | `#1A2E3A` | `#D4C6A8` | 1851 |

---

### Status Pill (`.st-pill`)

```css
.st-pill {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--font-mono); font-size: 10px;
  letter-spacing: 0.1em; text-transform: uppercase;
  padding: 3px 7px; border: 1px solid var(--rule); color: var(--ink-3);
}
.st-pill .d { width: 5px; height: 5px; border-radius: 50%; background: var(--ink-4); }

.st-pill.done    { color: var(--green); border-color: #5C7A3F40; }
.st-pill.done .d { background: var(--green); }

.st-pill.running    { color: var(--gold); border-color: #A8732F40; }
.st-pill.running .d { background: var(--gold); animation: pulse 1.3s infinite; }

.st-pill.failed    { color: var(--red); border-color: #A8452F40; }
.st-pill.failed .d { background: var(--red); }

/* queued: default (no override) */
```

---

### Voice Chip (`.voice-chip`)

```css
.voice-chip {
  padding: 5px 10px;
  font-family: var(--font-mono); font-size: 11px;
  border: 1px solid var(--rule);
  background: var(--paper); cursor: pointer;
  letter-spacing: 0.04em; color: var(--ink-2);
  display: flex; align-items: center; gap: 6px;
}
.voice-chip .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--marker); }
.voice-chip:hover { border-color: var(--ink); }
.voice-chip.active {
  background: var(--ink); color: var(--paper); border-color: var(--ink);
}
.voice-chip.active .dot { background: var(--paper); }
```

---

### Navigation Rail (`.rail`) — Desktop Only

```css
.rail {
  position: fixed; top: 0; bottom: 0; left: 0;
  width: 72px;
  background: var(--paper-2);
  border-right: 1px solid var(--rule);
  display: flex; flex-direction: column; align-items: center;
  padding: 18px 0 100px; gap: 4px;
  z-index: 40;
}
/* Logo mark */
.rail .mark {
  font-family: var(--font-serif); font-size: 28px; line-height: 1;
  margin-bottom: 22px; color: var(--ink);
  font-style: italic; font-variation-settings: "opsz" 60;
}
/* Nav buttons */
.rail button.nav {
  width: 42px; height: 42px; border-radius: 2px;
  border: 0; background: transparent; color: var(--ink-3);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; position: relative;
}
.rail button.nav:hover { color: var(--ink); background: var(--paper-3); }
.rail button.nav.active { color: var(--ink); }
.rail button.nav.active::before {
  content: ""; position: absolute; left: -15px;
  top: 10px; bottom: 10px; width: 2px; background: var(--marker);
}
/* User avatar */
.rail .me {
  width: 34px; height: 34px; border-radius: 50%;
  background: var(--gold); color: #fff;
  font-family: var(--font-sans); font-size: 12px; font-weight: 600;
  display: grid; place-items: center; margin-top: 8px;
}
```

---

### Mini Player Bar (`.mini`) — Desktop

Fixed to bottom, spans full width minus the rail.

```css
.mini {
  position: fixed; left: 72px; right: 0; bottom: 0; z-index: 50;
  background: var(--paper-2);
  border-top: 1px solid var(--rule);
  padding: 10px 24px;
  display: grid;
  grid-template-columns: 1fr 440px 1fr;
  align-items: center; gap: 20px;
  backdrop-filter: blur(12px);
}
/* Now playing info */
.mini .np { display: flex; align-items: center; gap: 12px; min-width: 0; }
.mini .np .c { width: 40px; height: 58px; flex-shrink: 0; box-shadow: 0 2px 8px -2px #0006; }
.mini .np .t { font-family: var(--font-serif); font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mini .np .s { font-family: var(--font-mono); font-size: 10px; color: var(--ink-3); letter-spacing: 0.06em; text-transform: uppercase; }
/* Transport */
.mini .transport { display: flex; align-items: center; justify-content: center; gap: 10px; }
.mini .iconbtn { width: 32px; height: 32px; border-radius: 2px; border: 0; background: transparent; color: var(--ink-2); display: grid; place-items: center; }
.mini .iconbtn:hover { color: var(--ink); background: var(--paper-3); }
.mini .play { width: 38px; height: 38px; border-radius: 50%; background: var(--ink); color: var(--paper); }
.mini .play:hover { background: var(--gold); color: #fff; }
/* Scrub bar */
.mini .scrub-track { flex: 1; height: 3px; background: var(--paper-3); position: relative; border-radius: 2px; cursor: pointer; }
.mini .scrub-fill   { height: 100%; background: var(--ink); border-radius: 2px; }
.mini .scrub-knob   { position: absolute; top: 50%; width: 10px; height: 10px; background: var(--ink); border-radius: 50%; transform: translate(-50%, -50%); }
.mini .scrub .t     { font-family: var(--font-mono); font-size: 10.5px; color: var(--ink-3); min-width: 40px; font-variant-numeric: tabular-nums; }
/* Speed pill */
.mini .speed { font-family: var(--font-mono); font-size: 11px; padding: 4px 8px; border: 1px solid var(--rule); color: var(--ink-2); }
.mini .speed:hover { border-color: var(--ink); }
```

---

### Chapters Table (`.chapters-table`) — Desktop

```css
.chapters-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.chapters-table th {
  font-family: var(--font-mono); font-size: 10px;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--ink-3); font-weight: 400;
  padding: 8px 10px; border-bottom: 1px solid var(--rule);
}
.chapters-table td { padding: 12px 10px; border-bottom: 1px solid var(--rule); vertical-align: middle; }
.chapters-table tr:hover td { background: var(--paper-2); }

/* Column widths */
.chapters-table .n  { font-family: var(--font-mono); font-size: 11px; color: var(--ink-3); width: 40px; font-variant-numeric: tabular-nums; }
.chapters-table .wc { font-family: var(--font-mono); font-size: 11px; color: var(--ink-3); text-align: right; width: 80px; }
.chapters-table .dur { font-family: var(--font-mono); font-size: 11px; text-align: right; width: 70px; color: var(--ink-2); }
.chapters-table .st { width: 110px; }

/* Row play button */
.plybtn {
  width: 28px; height: 28px; border-radius: 50%;
  background: transparent; border: 1px solid var(--rule);
  display: grid; place-items: center; color: var(--ink-2);
}
tr:hover .plybtn { border-color: var(--ink); background: var(--ink); color: var(--paper); }
.playing .plybtn { background: var(--gold); color: #fff; border-color: var(--gold); }
.playing .ct     { color: var(--gold); }
```

---

### Upload Dropzone (`.dropzone`)

```css
.dropzone {
  border: 1px dashed var(--ink-3);
  background: var(--paper-2);
  padding: 48px; text-align: center;
  min-height: 240px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 14px;
  transition: all .15s;
}
.dropzone:hover { border-color: var(--ink); background: var(--paper-3); }
.dropzone h3 { font-family: var(--font-serif); font-weight: 400; font-size: 22px; }
.dropzone .or { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-3); }
.dropzone .constraints { font-family: var(--font-mono); font-size: 11px; color: var(--ink-4); margin-top: 8px; }
```

---

### Inline Progress Bar

```css
.prog-cell { height: 3px; background: var(--paper-3); position: relative; border-radius: 2px; min-width: 90px; }
.prog-cell .f { position: absolute; left: 0; top: 0; bottom: 0; background: var(--gold); border-radius: 2px; }
```

---

### Settings / Tweaks Panel (`.tweaks-panel`)

```css
.tweaks-panel {
  position: fixed; right: 18px; bottom: 100px; width: 300px; z-index: 90;
  background: var(--paper-2);
  border: 1px solid var(--ink);
  box-shadow: 0 20px 50px -20px #0008;
  padding: 18px 20px;
  max-height: calc(100vh - 180px); overflow-y: auto;
}
/* Segmented control */
.seg { display: flex; border: 1px solid var(--rule); }
.seg button { flex: 1; padding: 6px 4px; background: transparent; font-family: var(--font-sans); font-size: 11.5px; color: var(--ink-3); border-right: 1px solid var(--rule); }
.seg button.on { background: var(--ink); color: var(--paper); }
/* Range slider */
.rng { width: 100%; appearance: none; background: var(--paper-3); height: 2px; }
.rng::-webkit-slider-thumb { appearance: none; width: 14px; height: 14px; border-radius: 50%; background: var(--ink); cursor: pointer; }
```

---

## 5. Animations

```css
@keyframes fadein {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: none; }
}
@keyframes slideup {
  from { transform: translateY(24px); opacity: 0; }
  to   { opacity: 1; }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: .3; }
}
```

| Element | Animation | Duration |
|---|---|---|
| Screen transitions | `fadein` | 0.25s ease |
| Fullscreen player open | `slideup` | 0.35s ease |
| Settings panel | `fadein` | 0.20s |
| Running status dot | `pulse` | 1.3s infinite |
| Upload step "now" icon | `pulse` | 1.3s infinite |
| Book card hover | `transform: translateY(-4px)` | 0.2s ease |
| Button states | `all` | 0.12s ease |
| Word wipe expansion | `width` | 0.28s `cubic-bezier(.4,0,.2,1)` |
| Sentence color | `color, opacity` | 0.2s ease |
| Scale highlight | `all` | 0.2s |

---

## 6. Lyric Sync — Four Highlight Modes

The sync system runs on the reading view. The `--hl-mode` CSS variable drives which mode is active, toggled from the Settings panel.

### Mode 1: Word Wipe (`word`)

Each word gets an overlay that "wipes" colour across as audio plays through it.

```css
.sent { transition: color .2s ease, opacity .2s ease; display: inline; color: var(--ink-4); cursor: pointer; }
.sent.played { color: var(--ink-3); }
.sent.active { color: var(--ink-4); }  /* words carry the colour in this mode */

.word { position: relative; display: inline-block; }
.word .base { color: inherit; }
.word .wipe {
  position: absolute; left: 0; top: 0; height: 100%; width: 0;
  overflow: hidden; color: var(--ink); white-space: nowrap;
  transition: width .28s cubic-bezier(.4,0,.2,1);
}
.word.played .wipe  { width: 100%; }
.word.current .wipe { color: var(--gold); }  /* currently speaking word */
```

### Mode 2: Block / Sentence (`sentence`)

```css
[data-hl="sentence"] .sent { opacity: .35; }
[data-hl="sentence"] .sent.active {
  opacity: 1;
  background: linear-gradient(180deg, transparent 62%, var(--marker) 62%, var(--marker) 92%, transparent 92%);
  padding: 0 2px; margin: 0 -2px; color: var(--ink);
}
[data-hl="sentence"] .wipe { display: none; }
```

### Mode 3: Scale (`scale`)

```css
[data-hl="scale"] .sent { opacity: .4; }
[data-hl="scale"] .sent.active {
  color: var(--ink); font-size: 1.08em; font-weight: 500;
  transition: all .2s;
}
```

### Mode 4: Gutter (`gutter`)

```css
[data-hl="gutter"] .sent { opacity: .55; }
[data-hl="gutter"] .sent.active { color: var(--ink); position: relative; }
[data-hl="gutter"] .sent.active::before {
  content: ""; position: absolute;
  left: -18px; top: 0.2em; bottom: 0.2em;
  width: 3px; background: var(--marker);
}
```

---

## 7. Mobile Components

### App Shell

```css
.app {
  width: 100%; height: 100%;
  background: var(--paper); color: var(--ink);
  font-family: var(--font-sans);
  position: relative; overflow: hidden;
  font-feature-settings: "ss01";
}
/* Status bar spacer */
.ptop { height: 52px; }
/* App bar */
.appbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 18px; height: 44px;
}
.appbar .logo {
  font-family: var(--font-serif); font-size: 22px;
  font-style: italic; font-variation-settings: "opsz" 60;
}
/* Icon button */
.ibtn {
  width: 36px; height: 36px; border-radius: 50%;
  border: 1px solid var(--rule); background: transparent; color: var(--ink-2);
  display: grid; place-items: center;
}
```

### Bottom Tab Bar (`.tabbar`)

```css
.tabbar {
  position: absolute; bottom: 0; left: 0; right: 0; height: 86px;
  border-top: 1px solid var(--rule); background: var(--paper-2);
  display: flex; justify-content: space-around; align-items: flex-start;
  padding: 8px 12px 24px;
  backdrop-filter: blur(12px);
}
.tab {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 4px 0;
  color: var(--ink-3); font-family: var(--font-mono); font-size: 9px;
  text-transform: uppercase; letter-spacing: 0.08em;
}
.tab svg { width: 20px; height: 20px; stroke-width: 1.6; }
.tab.on { color: var(--ink); }
.tab.on::after { content: ""; width: 3px; height: 3px; background: var(--marker); border-radius: 50%; margin-top: 1px; }
```

Tabs: **Library · Add · Books · You**

### Mobile Mini Player (`.mini-m`)

Floats above the tab bar.

```css
.mini-m {
  position: absolute; bottom: 86px; left: 8px; right: 8px; height: 56px;
  border: 1px solid var(--rule); background: var(--paper-2);
  border-radius: 8px;
  display: flex; align-items: center; gap: 10px; padding: 8px 10px;
  box-shadow: 0 6px 20px -10px #0008;
}
.mini-m .c { width: 40px; height: 40px; flex-shrink: 0; box-shadow: 0 3px 10px -4px #0006; }
.mini-m .t { font-family: var(--font-serif); font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mini-m .p  { height: 2px; background: var(--paper-3); }
.mini-m .p .f { background: var(--ink); width: 38%; }
.mini-m .btn  { width: 36px; height: 36px; border-radius: 50%; background: var(--ink); color: var(--paper); }
.mini-m .btn2 { width: 32px; height: 32px; border-radius: 50%; background: transparent; color: var(--ink-2); }
```

### Mobile Player Controls (`.pcontrols`)

```css
.pcontrols {
  border-top: 1px solid var(--rule); background: var(--paper-2);
  padding: 14px 22px 22px;
  display: flex; flex-direction: column; gap: 12px;
}
/* Scrub row */
.pcontrols .scrub .t {
  font-family: var(--font-mono); font-size: 10.5px;
  color: var(--ink-3); min-width: 38px; font-variant-numeric: tabular-nums;
}
.pcontrols .scrub-track { flex: 1; height: 3px; background: var(--paper-3); position: relative; border-radius: 2px; }
.pcontrols .scrub-fill   { background: var(--gold); border-radius: 2px; }
.pcontrols .scrub-knob   { position: absolute; top: 50%; width: 11px; height: 11px; background: var(--gold); border-radius: 50%; transform: translate(-50%,-50%); }
/* Transport */
.pcontrols .transport { display: flex; align-items: center; justify-content: center; gap: 22px; }
.pcontrols .ibtn { width: 42px; height: 42px; border-radius: 50%; border: 0; background: transparent; color: var(--ink-2); }
.pcontrols .ibtn svg { width: 22px; height: 22px; }
.pcontrols .play { width: 56px; height: 56px; border-radius: 50%; background: var(--ink); color: var(--paper); }
.pcontrols .play svg { width: 20px; height: 20px; fill: currentColor; }
```

### Mobile Book Cover Sizes

| Class | Padding | Title size | Author size |
|---|---|---|---|
| `.cov` (sm, default) | `8px 8px 9px 11px` | 11px italic, `opsz 72` | 7px uppercase |
| `.cov.md` | `10px 10px 12px 14px` | 14px | 8.5px |
| `.cov.lg` | `14px 14px 16px 18px` | 22px | 10px |

Mobile cover spine: `width: 4px`. Texture: `repeating-linear-gradient(0deg, transparent 0 3px, #00000012 3px 4px)`.

### Mobile Big Button (`.bigbtn`)

```css
.bigbtn {
  flex: 1; height: 46px; border-radius: 4px;
  border: 1px solid var(--ink); background: var(--ink); color: var(--paper);
  font-family: var(--font-sans); font-weight: 500; font-size: 14px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  letter-spacing: 0.01em;
}
.bigbtn.ghost { background: transparent; color: var(--ink); border-color: var(--rule); }
```

### Mobile Status Pill (`.pill`)

```css
.pill {
  font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.08em;
  text-transform: uppercase; padding: 2px 5px;
  border: 1px solid var(--rule); color: var(--ink-3);
  display: inline-flex; align-items: center; gap: 4px;
}
.pill .dt { width: 4px; height: 4px; border-radius: 50%; background: var(--ink-4); }
.pill.done { color: var(--green); border-color: #5C7A3F40; }
.pill.done .dt { background: var(--green); }
.pill.run  { color: var(--gold); border-color: #A8732F40; }
.pill.run  .dt { background: var(--gold); }
```

---

## 8. iOS Frame Components

Use `ui/frames/ios-frame.jsx` when rendering iOS showcase screens. Key specs:

**IOSDevice:**
- `width: 402px; height: 874px; border-radius: 48px`
- Shadow: `0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)`
- Dynamic Island: `top: 11px; width: 126px; height: 37px; border-radius: 24px; background: #000`
- Home indicator: pill `width: 139px; height: 5px; border-radius: 100px`

**IOSGlassPill (Liquid Glass):** `backdrop-filter: blur(12px) saturate(180%)`. Light bg: `rgba(255,255,255,0.5)`; dark: `rgba(120,120,128,0.28)`. Inner shadow (light): `inset 1.5px 1.5px 1px rgba(255,255,255,0.7)`.

---

## 9. Utility Classes

```css
.hair { border: 0; border-top: 1px solid var(--rule); }   /* horizontal rule */
.vr   { border-left: 1px solid var(--rule); }              /* vertical rule */

.tag {
  display: inline-block; font-family: var(--font-mono); font-size: 10px;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-3);
  padding: 2px 6px; border: 1px solid var(--rule);
}
/* Placeholder / skeleton */
.ph {
  background: repeating-linear-gradient(135deg, var(--paper-3) 0 8px, var(--paper-2) 8px 16px);
  border: 1px dashed var(--ink-4);
  display: grid; place-items: center; color: var(--ink-3);
  font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em;
}
/* Floating annotation tooltip */
.fb-note {
  position: absolute; padding: 4px 8px;
  background: #1A1613; color: #F5F0E6;
  font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase;
  border-radius: 2px; box-shadow: 0 6px 20px -8px #0009; pointer-events: none;
}
```

---

*Next: [14 — UI Screens](14-ui-screens.md)*
