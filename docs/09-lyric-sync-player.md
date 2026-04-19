# 09 — Lyric-Sync Player

The reading/listening experience: audio playback with per-sentence highlighting, chapter navigation, and cross-session position persistence.

---

## UI Layout

```
┌────────────────────────────────────────────────────────────┐
│  Chapter 3 of 23: "Part One, Chapter 3"          ◄ ►      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  It was a bright cold day in April, and the clocks         │  ← faded (past)
│  were striking thirteen.                                   │
│                                                            │
│  ▓▓ Winston Smith, his chin nuzzled into his ▓▓           │  ← HIGHLIGHTED (current)
│  ▓▓ breast in an effort to escape the vile   ▓▓           │
│  ▓▓ wind, slipped quickly through the glass  ▓▓           │
│  ▓▓ doors of Victory Mansions.               ▓▓           │
│                                                            │
│  Though not quickly enough to prevent a swirl              │  ← normal (future)
│  of gritty dust from entering along with him.              │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  ◀◀  ▶  ▶▶   1:23 ━━━━━━━━━●━━━━━ 5:42   1.0×  🔊       │  ← sticky player bar
└────────────────────────────────────────────────────────────┘
```

---

## Data Loading

When the player page mounts for `chapter N`:

1. **`GET /api/v1/books/{bookId}/chapters/{N}`** — chapter metadata + audio job status
2. **`GET /api/v1/audio/{jobId}/alignment`** — alignment JSON (sentences with timestamps)
3. **`GET /api/v1/audio/{jobId}/stream`** — 302 redirect; the `<audio>` element follows automatically
4. **`GET /api/v1/books/{bookId}/playback`** — saved position; seek audio to `position_sec` if chapter matches

All four requests fire in parallel on mount. The player renders in a loading state until the alignment JSON and stream URL are available.

---

## `useLyricSync` Hook

**Module:** `src/hooks/use-lyric-sync.ts`

Core synchronization logic. Attaches to the `HTMLAudioElement` and the alignment data:

```typescript
export function useLyricSync(
  audioRef: RefObject<HTMLAudioElement>,
  sentences: AlignedSentence[]
): {
  currentIndex: number;
  seekToSentence: (index: number) => void;
} {
  const [currentIndex, setCurrentIndex] = useState(-1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || sentences.length === 0) return;

    function onTimeUpdate() {
      const t = audio.currentTime;
      const idx = binarySearchSentence(sentences, t);
      setCurrentIndex(idx);
    }

    audio.addEventListener('timeupdate', onTimeUpdate);
    return () => audio.removeEventListener('timeupdate', onTimeUpdate);
  }, [audioRef, sentences]);

  const seekToSentence = useCallback((index: number) => {
    if (audioRef.current && sentences[index]) {
      audioRef.current.currentTime = sentences[index].start_time;
    }
  }, [audioRef, sentences]);

  return { currentIndex, seekToSentence };
}
```

### Binary Search Algorithm

`timeupdate` fires ~4× per second (250ms interval). A linear scan over hundreds of sentences is wasteful. Binary search finds the current sentence in O(log n):

```typescript
function binarySearchSentence(sentences: AlignedSentence[], t: number): number {
  let lo = 0, hi = sentences.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const s = sentences[mid];
    if (t < s.start_time)      hi = mid - 1;
    else if (t > s.end_time)   lo = mid + 1;
    else                       return mid;
  }
  // t falls in a gap between sentences — return the nearest past sentence
  return Math.max(0, lo - 1);
}
```

---

## Sentence Rendering

Each sentence in the chapter text is rendered as a `<span>` with a `data-sentence-index` attribute:

```tsx
{sentences.map((s, i) => (
  <span
    key={s.index}
    data-sentence-index={i}
    onClick={() => seekToSentence(i)}
    className={cn(
      'cursor-pointer transition-colors duration-150',
      i === currentIndex
        ? 'bg-yellow-200 dark:bg-yellow-800 rounded px-0.5'  // highlighted
        : i < currentIndex
          ? 'text-muted-foreground'                           // past (faded)
          : ''                                                // future (normal)
    )}
  >
    {s.text}{' '}
  </span>
))}
```

### Auto-scroll

When `currentIndex` changes, the corresponding sentence element is scrolled into view using `scrollIntoView({ behavior: 'smooth', block: 'center' })`. A `useEffect` watches `currentIndex` and calls `scrollIntoView` on the active `<span>` ref.

---

## Audio Player Controls

The sticky bottom bar exposes:

| Control | Behavior |
|---|---|
| Play / Pause | `audio.play()` / `audio.pause()` |
| Skip −15s | `audio.currentTime -= 15` |
| Skip +15s | `audio.currentTime += 15` |
| Seek bar | `input[type=range]` bound to `audio.currentTime` / `audio.duration` |
| Speed | `audio.playbackRate = 0.75 | 1.0 | 1.25 | 1.5 | 2.0` |
| Volume | `audio.volume` (slider, local state only) |
| Prev/Next chapter | Navigate to `player/{bookId}/{N-1}` or `player/{bookId}/{N+1}` |

Auto-advance: when the `ended` event fires, navigate to the next chapter automatically if one exists.

---

## Playback State Persistence

The player saves position every 5 seconds and on unmount:

```typescript
useEffect(() => {
  const audio = audioRef.current;
  if (!audio) return;

  const savePosition = debounce(async () => {
    await fetch(`/api/v1/books/${bookId}/playback`, {
      method: 'PUT',
      body: JSON.stringify({
        chapter_id: chapterId,
        position_sec: audio.currentTime,
        playback_speed: audio.playbackRate,
      }),
    });
  }, 5000);

  audio.addEventListener('timeupdate', savePosition);
  return () => {
    audio.removeEventListener('timeupdate', savePosition);
    savePosition.flush();   // save on unmount
  };
}, [bookId, chapterId]);
```

On next open, if the saved `chapter_id` matches the current chapter, `audio.currentTime` is set to `position_sec` after the audio element has loaded metadata.

---

## Chapter Navigation

The player page is `src/app/(dashboard)/player/[bookId]/[chapterNumber]/page.tsx`.

Navigating between chapters is a standard Next.js route change — the page remounts, re-fetches alignment data and the stream URL for the new chapter, and begins playback automatically.

Chapter list is available in a dropdown (displayed via `GET /books/{bookId}/chapters`) allowing the user to jump to any chapter.

---

## Mobile Responsiveness

- Text column: full viewport width on mobile, max 65ch on desktop
- Player bar: fixed bottom, full width, touch targets ≥ 44px
- Sentence tap area: entire `<span>` clickable
- Pinch-to-zoom not blocked (`viewport` meta tag: `initial-scale=1`, no `user-scalable=no`)

---

*Next: [10 — Testing & Eval](10-testing-and-eval.md)*
