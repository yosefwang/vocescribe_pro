'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface AlignmentSentence {
  text: string;
  start_time: number;
  end_time: number;
}

interface ChapterInfo {
  id: string;
  chapterNumber: number;
  title: string;
  audioStatus: string;
  duration: number | null;
  latestJob: { id: string; status: string; durationSec: number | null } | null;
}

interface BookInfo {
  id: string;
  title: string;
  author: string | null;
  totalChapters: number;
}

/* ------------------------------------------------------------------ */
/*  Lyric sync hook                                                    */
/* ------------------------------------------------------------------ */
function useLyricSync(audioRef: React.RefObject<HTMLAudioElement | null>, sentences: AlignmentSentence[]) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || sentences.length === 0) return;

    const tick = () => {
      const t = audio.currentTime;
      // Binary search for the current sentence
      let lo = 0;
      let hi = sentences.length - 1;
      let found = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (t >= sentences[mid].start_time && t < sentences[mid].end_time) {
          found = mid;
          break;
        }
        if (t < sentences[mid].start_time) {
          hi = mid - 1;
        } else {
          lo = mid + 1;
        }
      }
      // If not in a sentence, find the last played one
      if (found === -1) {
        for (let i = sentences.length - 1; i >= 0; i--) {
          if (t >= sentences[i].end_time) {
            found = i;
            break;
          }
        }
      }
      setActiveIndex(found);
      rafRef.current = requestAnimationFrame(tick);
    };

    const onPlay = () => {
      rafRef.current = requestAnimationFrame(tick);
    };
    const onPause = () => {
      cancelAnimationFrame(rafRef.current);
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onPause);

    return () => {
      cancelAnimationFrame(rafRef.current);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onPause);
    };
  }, [audioRef, sentences]);

  return activeIndex;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ */
/*  Player page                                                        */
/* ------------------------------------------------------------------ */
export default function PlayerPage({
  params,
}: {
  params: Promise<{ bookId: string; chapterNumber: string }> | { bookId: string; chapterNumber: string };
}) {
  const router = useRouter();
  const [bookId, setBookId] = useState('');
  const [chapterNumber, setChapterNumber] = useState('');
  const chNum = parseInt(chapterNumber, 10);

  useEffect(() => {
    if (params instanceof Promise) { params.then((p) => { setBookId(p.bookId); setChapterNumber(p.chapterNumber); }); }
    else { setBookId(params.bookId); setChapterNumber(params.chapterNumber); }
  }, [params]);

  const [book, setBook] = useState<BookInfo | null>(null);
  const [chapter, setChapter] = useState<ChapterInfo | null>(null);
  const [sentences, setSentences] = useState<AlignmentSentence[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [fullText, setFullText] = useState<string>('');
  const [chapterSentences, setChapterSentences] = useState<{ text: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hlMode, setHlMode] = useState<'sentence' | 'gutter' | 'none'>('sentence');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const readingRef = useRef<HTMLDivElement | null>(null);
  const positionSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeIndex = useLyricSync(audioRef, sentences);

  /* Fetch data */
  useEffect(() => {
    if (!bookId || !chapterNumber) return;
    async function load() {
      try {
        const [bookRes, chaptersRes] = await Promise.all([
          fetch(`/api/v1/books/${bookId}`),
          fetch(`/api/v1/books/${bookId}/chapters`),
        ]);
        const bookData = await bookRes.json();
        const chaptersData = await chaptersRes.json();
        setBook(bookData.book ?? bookData);
        const chList: ChapterInfo[] = chaptersData.chapters ?? [];
        const ch = chList.find((c) => c.chapterNumber === chNum);
        if (ch) setChapter(ch);

        // Fetch chapter detail (text + audio job)
        const chapterDetailRes = await fetch(`/api/v1/books/${bookId}/chapters/${chNum}`);
        const chapterDetail = await chapterDetailRes.json();
        setFullText(chapterDetail.chapter?.fullText ?? '');
        setChapterSentences(chapterDetail.chapter?.sentences ?? []);
        const audioId = chapterDetail.audioJob?.id;

        if (audioId) {
          const [streamRes, alignRes] = await Promise.all([
            fetch(`/api/v1/audio/${audioId}/stream`, { redirect: 'follow' }),
            fetch(`/api/v1/audio/${audioId}/alignment`),
          ]);
          if (streamRes.ok) {
            setAudioUrl(streamRes.url);
          }
          if (alignRes.ok) {
            const alignData = await alignRes.json();
            const sentences = alignData.alignment?.sentences ?? alignData.sentences ?? alignData.alignment ?? [];
            setSentences(sentences);
          }
        }
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [bookId, chapterNumber]);

  /* Load saved playback position */
  useEffect(() => {
    async function loadPosition() {
      try {
        const res = await fetch(`/api/v1/books/${bookId}/playback`);
        if (res.ok) {
          const data = await res.json();
          if (data.position && audioRef.current) {
            audioRef.current.currentTime = data.position;
          }
          if (data.speed) {
            setPlaybackRate(data.speed);
            if (audioRef.current) audioRef.current.playbackRate = data.speed;
          }
        }
      } catch {
        /* ignore */
      }
    }
    loadPosition();
  }, [bookId]);

  /* Save position every 5 seconds while playing */
  useEffect(() => {
    if (!playing) {
      if (positionSaveRef.current) clearInterval(positionSaveRef.current);
      return;
    }
    positionSaveRef.current = setInterval(async () => {
      if (!audioRef.current) return;
      try {
        await fetch(`/api/v1/books/${bookId}/playback`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chapterNumber: chNum,
            position: audioRef.current.currentTime,
            speed: playbackRate,
          }),
        });
      } catch {
        /* ignore */
      }
    }, 5000);
    return () => {
      if (positionSaveRef.current) clearInterval(positionSaveRef.current);
    };
  }, [playing, bookId, chNum, playbackRate]);

  /* Auto-scroll to active sentence */
  useEffect(() => {
    if (activeIndex < 0 || !readingRef.current) return;
    const els = readingRef.current.querySelectorAll('.sent');
    if (els[activeIndex]) {
      els[activeIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeIndex]);

  /* Audio event handlers */
  const onTimeUpdate = useCallback(() => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  }, []);

  const onLoadedMetadata = useCallback(() => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  }, []);

  /* Transport */
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime + seconds);
    }
  };

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const cycleSpeed = () => {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const idx = speeds.indexOf(playbackRate);
    const next = speeds[(idx + 1) % speeds.length];
    setPlaybackRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const goToChapter = (offset: number) => {
    const next = chNum + offset;
    if (next >= 1 && book && next <= book.totalChapters) {
      router.push(`/player/${bookId}/${next}`);
    }
  };

  const cycleHlMode = () => {
    const modes: Array<'sentence' | 'gutter' | 'none'> = ['sentence', 'gutter', 'none'];
    const idx = modes.indexOf(hlMode);
    setHlMode(modes[(idx + 1) % modes.length]);
  };

  /* Seek on sentence click */
  const onSentenceClick = (idx: number) => {
    if (sentences[idx]) {
      seekTo(sentences[idx].start_time);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 1080, margin: '0 auto', paddingTop: 32 }}>
        <span className="meta">Loading chapter...</span>
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      {/* Audio element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onLoadedMetadata}
          onEnded={() => setPlaying(false)}
          preload="auto"
        />
      )}

      {/* ---- Desktop layout ---- */}
      <div className="desktop-only">
        <div style={{ maxWidth: 1080, margin: '0 auto', paddingTop: 16 }}>
          {/* Top bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <button className="btn ghost sm" onClick={() => router.push(`/books/${bookId}`)}>
              <svg className="icn sm" viewBox="0 0 24 24">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              {book?.title || 'Back'}
            </button>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="btn ghost sm" onClick={cycleHlMode}>
                {hlMode === 'sentence' ? 'Highlight' : hlMode === 'gutter' ? 'Gutter' : 'Off'}
              </button>
              <button className="btn ghost sm" onClick={cycleSpeed}>
                {playbackRate}x
              </button>
            </div>
          </div>

          {/* Chapter title */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <p className="eyebrow">Chapter {chNum}</p>
            <h2 className="serif" style={{ fontSize: 22, color: 'var(--ink)' }}>
              {chapter?.title || `Chapter ${chNum}`}
            </h2>
          </div>

          {/* Reading frame */}
          <div
            ref={readingRef}
            className="reading-frame"
            data-hl={hlMode}
          >
            {sentences.length > 0 ? (
              sentences.map((s, i) => (
                <span
                  key={i}
                  className={`sent ${i < activeIndex ? 'played' : ''} ${i === activeIndex ? 'active' : ''}`}
                  onClick={() => onSentenceClick(i)}
                >
                  {s.text}{' '}
                </span>
              ))
            ) : chapterSentences.length > 0 ? (
              chapterSentences.map((s, i) => (
                <span key={i} className="sent" style={{ cursor: 'default' }}>
                  {s.text}{' '}
                </span>
              ))
            ) : fullText ? (
              <p style={{ color: 'var(--ink-2)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {fullText}
              </p>
            ) : (
              <p style={{ color: 'var(--ink-3)', textAlign: 'center' }}>
                No text available for this chapter.
              </p>
            )}
          </div>
        </div>

        {/* Mini player bar */}
        <div className="mini-bar">
          {/* Left: chapter info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{ minWidth: 0 }}>
              <p className="serif" style={{
                fontSize: 13, color: 'var(--ink)', lineHeight: 1.2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {chapter?.title || `Chapter ${chNum}`}
              </p>
              <p className="meta">{book?.title}</p>
            </div>
          </div>

          {/* Center: transport */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button className="btn ghost sm" onClick={() => goToChapter(-1)} disabled={chNum <= 1}>
                <svg className="icn" viewBox="0 0 24 24">
                  <polygon points="19 20 9 12 19 4 19 20" />
                  <line x1="5" y1="19" x2="5" y2="5" />
                </svg>
              </button>
              <button className="btn ghost sm" onClick={() => skip(-15)}>
                <svg className="icn" viewBox="0 0 24 24">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
                15
              </button>
              <button
                onClick={togglePlay}
                style={{
                  width: 40, height: 40, borderRadius: 20,
                  background: 'var(--ink)', color: 'var(--paper)',
                  border: 'none', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                {playing ? (
                  <svg className="icn lg" viewBox="0 0 24 24" style={{ stroke: 'var(--paper)' }}>
                    <line x1="6" y1="4" x2="6" y2="20" />
                    <line x1="18" y1="4" x2="18" y2="20" />
                  </svg>
                ) : (
                  <svg className="icn lg" viewBox="0 0 24 24" style={{ fill: 'var(--paper)', stroke: 'none' }}>
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                )}
              </button>
              <button className="btn ghost sm" onClick={() => skip(15)}>
                <svg className="icn" viewBox="0 0 24 24">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
                </svg>
                15
              </button>
              <button className="btn ghost sm" onClick={() => goToChapter(1)} disabled={!book || chNum >= book.totalChapters}>
                <svg className="icn" viewBox="0 0 24 24">
                  <polygon points="5 4 15 12 5 20 5 4" />
                  <line x1="19" y1="5" x2="19" y2="19" />
                </svg>
              </button>
            </div>
            {/* Progress bar */}
            <div
              style={{ width: '100%', height: 3, background: 'var(--paper-3)', borderRadius: 2, cursor: 'pointer' }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                seekTo(pct * duration);
              }}
            >
              <div
                style={{
                  height: '100%', background: 'var(--ink)', borderRadius: 2,
                  width: `${progress}%`, transition: 'width .1s linear',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink-4)' }}>{formatTime(currentTime)}</span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink-4)' }}>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right: speed */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn ghost sm" onClick={cycleSpeed} style={{ fontFamily: 'var(--font-mono)' }}>
              {playbackRate}x
            </button>
          </div>
        </div>
      </div>

      {/* ---- Mobile layout ---- */}
      <div className="mobile-only">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingTop: 8 }}>
          <button className="btn ghost sm" onClick={() => router.push(`/books/${bookId}`)}>
            <svg className="icn sm" viewBox="0 0 24 24">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <div style={{ textAlign: 'center' }}>
            <p className="eyebrow">Chapter {chNum}</p>
            <p className="serif" style={{ fontSize: 14, color: 'var(--ink)' }}>
              {chapter?.title || `Chapter ${chNum}`}
            </p>
          </div>
          <button className="btn ghost sm" onClick={cycleHlMode}>
            {hlMode === 'sentence' ? 'HL' : hlMode === 'gutter' ? 'GT' : 'Off'}
          </button>
        </div>

        {/* Reading frame */}
        <div
          ref={readingRef}
          className="reading-frame"
          data-hl={hlMode}
          style={{ margin: '20px auto 200px', padding: '0 8px' }}
        >
          {sentences.length > 0 ? (
            sentences.map((s, i) => (
              <span
                key={i}
                className={`sent ${i < activeIndex ? 'played' : ''} ${i === activeIndex ? 'active' : ''}`}
                onClick={() => onSentenceClick(i)}
              >
                {s.text}{' '}
              </span>
            ))
          ) : chapterSentences.length > 0 ? (
            chapterSentences.map((s, i) => (
              <span key={i} className="sent" style={{ cursor: 'default' }}>
                {s.text}{' '}
              </span>
            ))
          ) : fullText ? (
            <p style={{ color: 'var(--ink-2)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {fullText}
            </p>
          ) : (
            <p style={{ color: 'var(--ink-3)', textAlign: 'center' }}>
              No text available.
            </p>
          )}
        </div>

        {/* Floating mini player */}
        <div className="mini-m">
          {/* Progress bar at top */}
          <div
            style={{
              position: 'absolute', top: -3, left: 0, right: 0,
              height: 3, background: 'var(--paper-3)', cursor: 'pointer',
            }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              seekTo(pct * duration);
            }}
          >
            <div style={{ height: '100%', background: 'var(--gold)', width: `${progress}%`, transition: 'width .1s linear' }} />
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </p>
            </div>
            <button
              onClick={() => goToChapter(-1)}
              disabled={chNum <= 1}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4 }}
            >
              <svg className="icn sm" viewBox="0 0 24 24">
                <polygon points="19 20 9 12 19 4 19 20" />
                <line x1="5" y1="19" x2="5" y2="5" />
              </svg>
            </button>
            <button
              onClick={() => skip(-15)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4 }}
            >
              <svg className="icn sm" viewBox="0 0 24 24">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
            </button>
            <button
              onClick={togglePlay}
              style={{
                width: 32, height: 32, borderRadius: 16,
                background: 'var(--ink)', color: 'var(--paper)',
                border: 'none', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              {playing ? (
                <svg className="icn" viewBox="0 0 24 24" style={{ stroke: 'var(--paper)', width: 14, height: 14 }}>
                  <line x1="6" y1="4" x2="6" y2="20" />
                  <line x1="18" y1="4" x2="18" y2="20" />
                </svg>
              ) : (
                <svg className="icn" viewBox="0 0 24 24" style={{ fill: 'var(--paper)', stroke: 'none', width: 14, height: 14 }}>
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
            </button>
            <button
              onClick={() => skip(15)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4 }}
            >
              <svg className="icn sm" viewBox="0 0 24 24">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
              </svg>
            </button>
            <button
              onClick={() => goToChapter(1)}
              disabled={!book || chNum >= book.totalChapters}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4 }}
            >
              <svg className="icn sm" viewBox="0 0 24 24">
                <polygon points="5 4 15 12 5 20 5 4" />
                <line x1="19" y1="5" x2="19" y2="19" />
              </svg>
            </button>
            <button
              className="mono"
              onClick={cycleSpeed}
              style={{
                background: 'none', border: '1px solid var(--rule)', borderRadius: 2,
                padding: '2px 6px', fontSize: 9, color: 'var(--ink-3)', cursor: 'pointer',
              }}
            >
              {playbackRate}x
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
