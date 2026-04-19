import type { Metadata } from 'next';
import { Newsreader, Inter_Tight, JetBrains_Mono } from 'next/font/google';
import { ClerkProvider } from '@/components/ClerkProvider';
import './globals.css';

export const dynamic = 'force-dynamic';

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Vocescribe -- AI Audiobook Generator',
  description: 'Transform EPUB ebooks into narrated audio with per-sentence timestamp sync.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        data-theme="light"
        className={`${newsreader.variable} ${interTight.variable} ${jetbrainsMono.variable}`}
      >
        <body className="paper-tex">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
