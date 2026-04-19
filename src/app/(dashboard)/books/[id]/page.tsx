'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Book {
  id: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  totalChapters: number;
  completedChapters: number;
  voice: string | null;
  createdAt: string;
}

interface Chapter {
  id: string;
  chapterNumber: number;
  title: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  audioUrl: string | null;
  duration: number | null;
}

const VOICES = [
  { id: 'alloy', label: 'Alloy' },
  { id: 'echo', label: 'Echo' },
  { id: 'fable', label: 'Fable' },
  { id: 'onyx', label: 'Onyx' },
  { id: 'nova', label: 'Nova' },
  { id: 'shimmer', label: 'Shimmer' },
];

const COVER_COLORS = [
  '#4A3728', '#2D3A2E', '#3B2E4A', '#4A3228',
  '#2E3B4A', '#4A4228', '#3A2828', '#28403A',
];

function coverColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COVER_COLORS[Math.abs(hash) % COVER_COLORS.length];
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === 'completed' ? 'done' :
    status === 'processing' ? 'running' :
    status === 'failed' ? 'failed' : '';

  const label =
    status === 'completed' ? 'Ready' :
    status === 'processing' ? 'Generating' :
    status === 'failed' ? 'Failed' :
    status === 'pending' ? 'Pending' : 'Uploaded';

  return (
    <span className={`st-pill ${cls}`}>
      <span className="d" />
      {label}
    </span>
  );
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */
export default function BookDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const router = useRouter();
  const [id, setId] = useState<string>('');

  useEffect(() => {
    if (params instanceof Promise) { params.then((p) => setId(p.id)); }
    else { setId(params.id); }
  }, [params]);

  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState('nova');
  const [generating, setGenerating] = useState(false);
  const [pollTimer, setPollTimer] = useState<ReturnType<typeof setInterval> | null>(null);

  /* Fetch book data */
  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const [bookRes, chaptersRes] = await Promise.all([
          fetch(`/api/v1/books/${id}`),
          fetch(`/api/v1/books/${id}/chapters`),
        ]);
        if (!bookRes.ok) throw new Error('Book not found');
        const bookData = await bookRes.json();
        const chaptersData = await chaptersRes.json();
        setBook(bookData.book ?? bookData);
        setChapters(chaptersData.chapters ?? []);
        if (bookData.voice || (bookData.book && bookData.book.voice)) {
          setSelectedVoice((bookData.voice || bookData.book.voice) ?? 'nova');
        }
      } catch {
        /* book not found */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  /* Polling during generation */
  useEffect(() => {
    return () => {
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [pollTimer]);

  const startPolling = () => {
    const timer = setInterval(async () => {
      try {
        const [bookRes, chaptersRes] = await Promise.all([
          fetch(`/api/v1/books/${id}`),
          fetch(`/api/v1/books/${id}/chapters`),
        ]);
        const bookData = await bookRes.json();
        const chaptersData = await chaptersRes.json();
        setBook(bookData.book ?? bookData);
        setChapters(chaptersData.chapters ?? []);

        if (bookData.status === 'completed' || bookData.status === 'failed') {
          clearInterval(timer);
          setGenerating(false);
          setPollTimer(null);
        }
      } catch {
        /* ignore poll errors */
      }
    }, 3000);
    setPollTimer(timer);
  };

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/v1/books/${id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice: selectedVoice }),
      });
      if (!res.ok) throw new Error();
      startPolling();
    } catch {
      setGenerating(false);
      alert('Failed to start generation. Please try again.');
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 1080, margin: '0 auto', paddingTop: 32 }}>
        <span className="meta">Loading...</span>
      </div>
    );
  }

  if (!book) {
    return (
      <div style={{ maxWidth: 1080, margin: '0 auto', paddingTop: 32, textAlign: 'center' }}>
        <p className="serif" style={{ fontSize: 20, marginBottom: 12 }}>Book not found</p>
        <Link href="/library" className="btn">Back to Library</Link>
      </div>
    );
  }

  const isProcessing = book.status === 'processing' || generating;

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', paddingTop: 32 }}>
      {/* Back link */}
      <button
        className="btn ghost sm"
        onClick={() => router.push('/library')}
        style={{ marginBottom: 24 }}
      >
        <svg className="icn sm" viewBox="0 0 24 24">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Library
      </button>

      {/* ---- Desktop: Two-column layout ---- */}
      <div className="desktop-only">
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 40, marginBottom: 40 }}>
          {/* Left: Cover + facts */}
          <div>
            <div style={{ width: 260, height: 360, marginBottom: 16 }}>
              <div
                style={{
                  width: '100%', height: '100%', background: coverColor(book.id),
                  borderRadius: 2, overflow: 'hidden', position: 'relative',
                }}
              >
                <div className="cov">
                  <div className="spine" />
                  <div className="t" style={{ color: '#EDE6D8' }}>{book.title}</div>
                  <div className="a" style={{ color: '#EDE6D8' }}>{book.author || 'Unknown'}</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="meta">Status</span>
                <StatusPill status={book.status} />
              </div>
              <div className="hair" />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="meta">Chapters</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink-2)' }}>
                  {book.completedChapters}/{book.totalChapters}
                </span>
              </div>
              <div className="hair" />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="meta">Added</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink-2)' }}>
                  {formatDate(book.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Title + voice + chapters */}
          <div>
            <h1 className="serif" style={{ fontSize: 32, letterSpacing: '-0.02em', marginBottom: 4 }}>
              {book.title}
            </h1>
            <p className="meta" style={{ marginBottom: 24 }}>{book.author || 'Unknown Author'}</p>

            {/* Voice selector */}
            <div style={{ marginBottom: 24 }}>
              <p className="eyebrow" style={{ marginBottom: 10 }}>Voice</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {VOICES.map((v) => (
                  <button
                    key={v.id}
                    className={`voice-chip ${selectedVoice === v.id ? 'active' : ''}`}
                    onClick={() => setSelectedVoice(v.id)}
                    disabled={isProcessing}
                  >
                    <span className="dot" />
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            {book.status !== 'completed' && (
              <button
                className={`btn xl gold`}
                onClick={handleGenerate}
                disabled={isProcessing}
                style={{ marginBottom: 32, opacity: isProcessing ? 0.7 : 1 }}
              >
                {isProcessing ? (
                  <>
                    <svg className="icn" viewBox="0 0 24 24" style={{ animation: 'pulse 1.3s infinite' }}>
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="icn" viewBox="0 0 24 24">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Generate Audiobook
                  </>
                )}
              </button>
            )}

            {/* Listen button when completed */}
            {book.status === 'completed' && (
              <Link href={`/player/${book.id}/1`} style={{ textDecoration: 'none', display: 'inline-block', marginBottom: 32 }}>
                <button className="btn xl primary">
                  <svg className="icn" viewBox="0 0 24 24">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Start Listening
                </button>
              </Link>
            )}

            {/* Chapter progress */}
            {isProcessing && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="meta">Progress</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink-2)' }}>
                    {book.completedChapters}/{book.totalChapters} chapters
                  </span>
                </div>
                <div style={{ height: 3, background: 'var(--paper-3)', borderRadius: 2 }}>
                  <div
                    style={{
                      height: '100%',
                      background: 'var(--gold)',
                      borderRadius: 2,
                      width: `${book.totalChapters > 0 ? (book.completedChapters / book.totalChapters) * 100 : 0}%`,
                      transition: 'width .4s ease',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Chapters table */}
            <div>
              <p className="eyebrow" style={{ marginBottom: 10 }}>Chapters</p>
              <div style={{ borderTop: '1px solid var(--rule)' }}>
                {chapters.map((ch) => (
                  <div
                    key={ch.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto',
                      gap: 16,
                      alignItems: 'center',
                      padding: '12px 0',
                      borderBottom: '1px solid var(--rule)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--ink-4)', width: 24, textAlign: 'right' }}>
                        {ch.chapterNumber}
                      </span>
                      <span className="serif" style={{ fontSize: 14, color: 'var(--ink-2)' }}>
                        {ch.title || `Chapter ${ch.chapterNumber}`}
                      </span>
                    </div>
                    <span className="meta">{formatDuration(ch.duration)}</span>
                    {ch.status === 'completed' ? (
                      <Link href={`/player/${book.id}/${ch.chapterNumber}`} className="btn sm ghost">
                        <svg className="icn sm" viewBox="0 0 24 24">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        Play
                      </Link>
                    ) : (
                      <StatusPill status={ch.status} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Mobile layout ---- */}
      <div className="mobile-only">
        {/* Hero section */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <div style={{ width: 100, flexShrink: 0 }}>
            <div
              style={{
                width: '100%', height: 140, background: coverColor(book.id),
                borderRadius: 4, overflow: 'hidden', position: 'relative',
              }}
            >
              <div className="cov">
                <div className="spine" />
                <div className="t" style={{ color: '#EDE6D8', fontSize: 12 }}>{book.title}</div>
                <div className="a" style={{ color: '#EDE6D8' }}>{book.author || 'Unknown'}</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, minWidth: 0 }}>
            <h1 className="serif" style={{ fontSize: 20, color: 'var(--ink)', lineHeight: 1.2 }}>
              {book.title}
            </h1>
            <p className="meta">{book.author || 'Unknown Author'}</p>
            <div style={{ marginTop: 4 }}>
              <StatusPill status={book.status} />
            </div>
          </div>
        </div>

        {/* Voice selector */}
        <div style={{ marginBottom: 20 }}>
          <p className="eyebrow" style={{ marginBottom: 10 }}>Voice</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {VOICES.map((v) => (
              <button
                key={v.id}
                className={`voice-chip ${selectedVoice === v.id ? 'active' : ''}`}
                onClick={() => setSelectedVoice(v.id)}
                disabled={isProcessing}
              >
                <span className="dot" />
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action button */}
        <div style={{ marginBottom: 24 }}>
          {book.status === 'completed' ? (
            <Link href={`/player/${book.id}/1}`} style={{ textDecoration: 'none', display: 'block' }}>
              <button className="btn primary xl" style={{ width: '100%', justifyContent: 'center' }}>
                Start Listening
              </button>
            </Link>
          ) : (
            <button
              className="btn gold xl"
              style={{ width: '100%', justifyContent: 'center', opacity: isProcessing ? 0.7 : 1 }}
              onClick={handleGenerate}
              disabled={isProcessing}
            >
              {isProcessing ? 'Generating...' : 'Generate Audiobook'}
            </button>
          )}
        </div>

        {/* Progress bar */}
        {isProcessing && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span className="meta">Progress</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-2)' }}>
                {book.completedChapters}/{book.totalChapters}
              </span>
            </div>
            <div style={{ height: 3, background: 'var(--paper-3)', borderRadius: 2 }}>
              <div
                style={{
                  height: '100%', background: 'var(--gold)', borderRadius: 2,
                  width: `${book.totalChapters > 0 ? (book.completedChapters / book.totalChapters) * 100 : 0}%`,
                  transition: 'width .4s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Chapter list */}
        <div>
          <p className="eyebrow" style={{ marginBottom: 10 }}>Chapters</p>
          <div style={{ borderTop: '1px solid var(--rule)' }}>
            {chapters.map((ch) => (
              <div
                key={ch.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid var(--rule)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink-4)', width: 20 }}>
                    {ch.chapterNumber}
                  </span>
                  <span className="serif" style={{ fontSize: 13, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ch.title || `Chapter ${ch.chapterNumber}`}
                  </span>
                </div>
                {ch.status === 'completed' ? (
                  <Link href={`/player/${book.id}/${ch.chapterNumber}`} className="btn sm ghost">
                    Play
                  </Link>
                ) : (
                  <StatusPill status={ch.status} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
