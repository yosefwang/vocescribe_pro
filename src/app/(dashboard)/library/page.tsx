'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Cover colors                                                       */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/*  Status pill helper                                                 */
/* ------------------------------------------------------------------ */
function StatusPill({ status }: { status: Book['status'] }) {
  const cls =
    status === 'completed' ? 'done' :
    status === 'processing' ? 'running' :
    status === 'failed' ? 'failed' : '';

  const label =
    status === 'completed' ? 'Ready' :
    status === 'processing' ? 'Generating' :
    status === 'failed' ? 'Failed' : 'Uploaded';

  return (
    <span className={`st-pill ${cls}`}>
      <span className="d" />
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Book cover component                                               */
/* ------------------------------------------------------------------ */
function BookCover({ book, size }: { book: Book; size: 'sm' | 'md' | 'lg' }) {
  const h = size === 'sm' ? 140 : size === 'md' ? 200 : 260;
  return (
    <div
      style={{
        width: '100%',
        height: h,
        background: coverColor(book.id),
        borderRadius: 2,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div className="cov">
        <div className="spine" />
        <div className="t" style={{ color: '#EDE6D8' }}>{book.title}</div>
        <div className="a" style={{ color: '#EDE6D8' }}>{book.author || 'Unknown Author'}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Upload dropzone                                                    */
/* ------------------------------------------------------------------ */
function UploadDropzone({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    if (!file.name.endsWith('.epub')) {
      alert('Please upload an EPUB file.');
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/v1/books/upload', { method: 'POST', body: form });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      router.push(`/books/${data.book.id}`);
    } catch {
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }, []);

  return (
    <div style={{ padding: '0 0 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 className="serif" style={{ fontSize: 20 }}>Upload a Book</h2>
        <button className="btn ghost sm" onClick={onClose}>Cancel</button>
      </div>
      <div
        className="dropzone"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        style={{ cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.6 : 1 }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".epub"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
          }}
        />
        <svg style={{ width: 32, height: 32, stroke: 'var(--ink-3)', fill: 'none', strokeWidth: 1.5 }} viewBox="0 0 24 24">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <div>
          <p className="sans" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
            {uploading ? 'Uploading...' : 'Drop an EPUB here or click to browse'}
          </p>
          <p className="meta" style={{ marginTop: 4 }}>Max 50 MB</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Library page                                                       */
/* ------------------------------------------------------------------ */
export default function LibraryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(searchParams.get('upload') === '1');

  const openUpload = () => { setShowUpload(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  useEffect(() => {
    fetch('/api/v1/books')
      .then((r) => r.json())
      .then((data) => {
        setBooks(data.books ?? []);
      })
      .catch(() => {
        /* silent -- show empty state */
      })
      .finally(() => setLoading(false));
  }, []);

  const completed = books.filter((b) => b.status === 'completed');
  const inProgress = books.filter((b) => b.status === 'processing');
  const recent = books.filter((b) => b.status === 'uploaded' || b.status === 'failed');

  /* Continue reading = most recent completed book */
  const continueBook = completed[0];

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', paddingTop: 32 }}>
      {/* Upload dropzone */}
      {showUpload && <UploadDropzone onClose={() => setShowUpload(false)} />}

      {/* ---- Desktop header ---- */}
      <div className="desktop-only" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="serif" style={{ fontSize: 28, letterSpacing: '-0.02em' }}>Your Library</h1>
          <button className="btn" onClick={openUpload}>
            <PlusIcon /> Upload EPUB
          </button>
        </div>
      </div>

      {/* ---- Mobile header ---- */}
      <div className="mobile-only" style={{ marginBottom: 24 }}>
        <h2 className="sans" style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
          Good evening
        </h2>
        <p className="meta">Your audiobook library</p>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <span className="meta">Loading your library...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && books.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <svg
            style={{ width: 48, height: 48, stroke: 'var(--ink-4)', fill: 'none', strokeWidth: 1, margin: '0 auto 16px' }}
            viewBox="0 0 24 24"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <p className="serif" style={{ fontSize: 20, color: 'var(--ink-2)', marginBottom: 8 }}>
            No books yet
          </p>
          <p className="meta" style={{ marginBottom: 24 }}>
            Upload an EPUB to create your first audiobook.
          </p>
          <button className="btn primary" onClick={openUpload}>
            <PlusIcon /> Upload EPUB
          </button>
        </div>
      )}

      {/* Continue reading hero */}
      {!loading && continueBook && (
        <section style={{ marginBottom: 40 }}>
          <p className="eyebrow" style={{ marginBottom: 12 }}>Continue Listening</p>
          <Link
            href={`/player/${continueBook.id}/1`}
            style={{ textDecoration: 'none', display: 'block' }}
          >
            <div
              className="desktop-only"
              style={{
                display: 'grid',
                gridTemplateColumns: '180px 1fr',
                gap: 24,
                padding: 20,
                border: '1px solid var(--rule)',
                borderRadius: 2,
                background: 'var(--paper-2)',
                transition: 'border-color .12s',
              }}
            >
              <BookCover book={continueBook} size="md" />
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h3 className="serif" style={{ fontSize: 22, marginBottom: 4, color: 'var(--ink)' }}>
                  {continueBook.title}
                </h3>
                <p className="meta" style={{ marginBottom: 12 }}>{continueBook.author}</p>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <StatusPill status={continueBook.status} />
                  <span className="meta">
                    {continueBook.completedChapters}/{continueBook.totalChapters} chapters
                  </span>
                </div>
              </div>
            </div>
            {/* Mobile version */}
            <div
              className="mobile-only"
              style={{
                display: 'flex',
                gap: 14,
                padding: 14,
                border: '1px solid var(--rule)',
                borderRadius: 4,
                background: 'var(--paper-2)',
              }}
            >
              <div style={{ width: 80, flexShrink: 0 }}>
                <BookCover book={continueBook} size="sm" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, minWidth: 0 }}>
                <h3 className="serif" style={{ fontSize: 16, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {continueBook.title}
                </h3>
                <p className="meta">{continueBook.author}</p>
                <StatusPill status={continueBook.status} />
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* In-progress books */}
      {!loading && inProgress.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <p className="eyebrow" style={{ marginBottom: 12 }}>Generating</p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 20,
          }}>
            {inProgress.map((book) => (
              <Link key={book.id} href={`/books/${book.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ animation: 'fadein .3s ease both' }}>
                  <BookCover book={book} size="sm" />
                  <div style={{ padding: '10px 0 0' }}>
                    <p className="serif" style={{
                      fontSize: 13, color: 'var(--ink)', lineHeight: 1.2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {book.title}
                    </p>
                    <div style={{ marginTop: 6 }}>
                      <StatusPill status={book.status} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Completed books */}
      {!loading && completed.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <p className="eyebrow" style={{ marginBottom: 12 }}>Ready to Listen</p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 20,
          }}>
            {completed.map((book, i) => (
              <Link key={book.id} href={`/books/${book.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ animation: `fadein .3s ease ${i * 0.05}s both` }}>
                  <BookCover book={book} size="sm" />
                  <div style={{ padding: '10px 0 0' }}>
                    <p className="serif" style={{
                      fontSize: 13, color: 'var(--ink)', lineHeight: 1.2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {book.title}
                    </p>
                    <p className="meta" style={{ marginTop: 2 }}>{book.author}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent uploads */}
      {!loading && recent.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <p className="eyebrow" style={{ marginBottom: 12 }}>Recent</p>
          <div style={{ borderTop: '1px solid var(--rule)' }}>
            {recent.map((book) => (
              <Link
                key={book.id}
                href={`/books/${book.id}`}
                style={{ textDecoration: 'none', display: 'flex' }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 1fr auto',
                    gap: 16,
                    alignItems: 'center',
                    padding: '14px 0',
                    borderBottom: '1px solid var(--rule)',
                  }}
                >
                  <div style={{ width: 60, height: 76 }}>
                    <BookCover book={book} size="sm" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p className="serif" style={{
                      fontSize: 14, color: 'var(--ink)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {book.title}
                    </p>
                    <p className="meta" style={{ marginTop: 2 }}>{book.author}</p>
                  </div>
                  <StatusPill status={book.status} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Mobile upload FAB */}
      <div className="mobile-only" style={{ position: 'fixed', bottom: 94, right: 16, zIndex: 30 }}>
        <button
          className="btn primary"
          onClick={openUpload}
          style={{ borderRadius: 8, padding: '12px 16px', boxShadow: '0 4px 12px #0003' }}
        >
          <PlusIcon /> Upload
        </button>
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg className="icn" viewBox="0 0 24 24">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
