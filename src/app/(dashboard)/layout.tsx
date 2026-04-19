'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { SignedIn, SignedOut, RedirectToSignIn, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/* ------------------------------------------------------------------ */
/*  Responsive hook                                                    */
/* ------------------------------------------------------------------ */
function useIsMobile(breakpoint = 767) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return mobile;
}

/* ------------------------------------------------------------------ */
/*  Theme toggle                                                       */
/* ------------------------------------------------------------------ */
function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = document.documentElement.getAttribute('data-theme');
    if (stored === 'dark') setDark(true);
  }, []);

  const toggle = () => {
    const next = dark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    setDark(!dark);
  };

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--ink-3)',
        padding: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {dark ? (
        /* Sun icon */
        <svg className="icn" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        /* Moon icon */
        <svg className="icn" viewBox="0 0 24 24">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Desktop rail                                                       */
/* ------------------------------------------------------------------ */
function DesktopRail() {
  const pathname = usePathname();

  return (
    <nav className="rail">
      {/* Logo */}
      <Link
        href="/library"
        className="serif"
        style={{
          fontSize: 26,
          fontStyle: 'italic',
          fontWeight: 400,
          color: 'var(--ink)',
          textDecoration: 'none',
          lineHeight: 1,
          marginBottom: 16,
        }}
      >
        V
      </Link>

      {/* Nav buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
        <NavLink href="/library" label="Library" active={pathname === '/library'}>
          <BookIcon />
        </NavLink>
        <NavLink href="/library?upload=1" label="Upload" active={false}>
          <PlusIcon />
        </NavLink>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Bottom section */}
      <ThemeToggle />
      <div style={{ marginTop: 4 }}>
        <UserButton afterSignOutUrl="/" />
      </div>
    </nav>
  );
}

function NavLink({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        borderRadius: 2,
        color: active ? 'var(--ink)' : 'var(--ink-3)',
        background: active ? 'var(--paper-3)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        textDecoration: 'none',
        transition: 'all .12s ease',
      }}
    >
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Desktop shell                                                      */
/* ------------------------------------------------------------------ */
function DesktopShell({ children }: { children: ReactNode }) {
  return (
    <>
      <DesktopRail />
      <main className="main-with-rail" style={{ padding: '0 36px' }}>
        {children}
      </main>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile shell                                                       */
/* ------------------------------------------------------------------ */
function MobileShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { href: '/library', label: 'Library', icon: <BookIcon /> },
    { href: '/library?upload=1', label: 'Upload', icon: <PlusIcon /> },
    { href: '/library', label: 'Books', icon: <GridIcon /> },
    { href: '/profile', label: 'You', icon: <UserIcon /> },
  ];

  return (
    <>
      {/* Top bar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: 'var(--paper)',
          borderBottom: '1px solid var(--rule)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backdropFilter: 'blur(12px)',
        }}
      >
        <span
          className="serif"
          style={{
            fontStyle: 'italic',
            fontSize: 22,
            color: 'var(--ink)',
          }}
        >
          Vocescribe
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ThemeToggle />
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* Main content */}
      <main style={{ padding: '0 16px 170px' }}>
        {children}
      </main>

      {/* Tab bar */}
      <nav className="tabbar">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href.split('?')[0];
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={`tab ${isActive ? 'on' : ''}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */
function BookIcon() {
  return (
    <svg className="icn" viewBox="0 0 24 24">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
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

function GridIcon() {
  return (
    <svg className="icn" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="icn" viewBox="0 0 24 24">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard layout                                                   */
/* ------------------------------------------------------------------ */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();

  return (
    <>
      <SignedIn>
        {isMobile ? (
          <MobileShell>{children}</MobileShell>
        ) : (
          <DesktopShell>{children}</DesktopShell>
        )}
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
