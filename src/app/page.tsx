import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <>
      <SignedIn>
        <RedirectToSignIn redirectUrl="/library" />
      </SignedIn>
      <SignedOut>
        <div className="min-h-screen flex flex-col items-center justify-center paper-tex" style={{ padding: '40px 24px' }}>
          <div style={{ maxWidth: 480, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
            {/* Logo */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <span
                className="serif"
                style={{
                  fontSize: 48,
                  fontStyle: 'italic',
                  fontWeight: 400,
                  color: 'var(--ink)',
                  lineHeight: 1,
                }}
              >
                V
              </span>
              <span
                className="serif"
                style={{
                  fontSize: 28,
                  letterSpacing: '-0.02em',
                  color: 'var(--ink)',
                }}
              >
                Vocescribe
              </span>
              <span className="meta" style={{ maxWidth: 300, lineHeight: 1.5 }}>
                Transform your ebooks into beautifully narrated audiobooks with karaoke-style sync.
              </span>
            </div>

            {/* CTA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 260 }}>
              <Link href="/sign-up" className="btn primary xl" style={{ justifyContent: 'center', width: '100%' }}>
                Get Started
              </Link>
              <Link href="/sign-in" className="btn xl" style={{ justifyContent: 'center', width: '100%' }}>
                Sign In
              </Link>
            </div>

            {/* Tagline */}
            <p className="eyebrow" style={{ marginTop: 24 }}>
              AI-Powered Audiobook Generation
            </p>
          </div>
        </div>
      </SignedOut>
    </>
  );
}
