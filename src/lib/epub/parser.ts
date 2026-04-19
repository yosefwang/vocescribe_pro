import EPub from 'epub2';
import sharp from 'sharp';
import { uploadObject } from '../storage/r2';

export interface EpubMetadata {
  title: string;
  author: string | null;
  language: string;
  description: string | null;
}

export interface ChapterDraft {
  chapterNumber: number;
  title: string;
  rawText: string;
  wordCount: number;
}

export interface ParseResult {
  metadata: EpubMetadata;
  coverR2Key: string | null;
  chapters: ChapterDraft[];
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function parseEpub(
  filePath: string,
  userId: string,
  bookId: string,
): Promise<ParseResult> {
  const book = await EPub.createAsync(filePath);

  const metadata: EpubMetadata = {
    title: book.metadata?.title ?? 'Untitled',
    author: book.metadata?.creator ?? null,
    language: book.metadata?.language ?? 'en',
    description: book.metadata?.description ?? null,
  };

  let coverR2Key: string | null = null;

  try {
    if (book.metadata?.cover) {
      const [coverBuffer] = await book.getImageAsync(book.metadata.cover);
      if (coverBuffer) {
        const jpeg = await sharp(coverBuffer).jpeg({ quality: 85 }).toBuffer();
        coverR2Key = `${userId}/${bookId}/cover.jpg`;
        await uploadObject(coverR2Key, jpeg, 'image/jpeg');
      }
    }
  } catch {
    // Cover extraction is optional
  }

  const chapters: ChapterDraft[] = [];
  let chapterIndex = 0;

  for (let i = 0; i < book.flow.length; i++) {
    const item = book.flow[i];
    if (!item?.id) continue;

    try {
      const html = await (book as any).getChapterAsync(item.id);
      const rawText = stripHtml(html ?? '');

      if (rawText.length < 50) continue;

      const wordCount = rawText.split(/\s+/).filter(Boolean).length;
      const title = item.title ?? `Chapter ${chapters.length + 1}`;

      chapterIndex++;
      chapters.push({ chapterNumber: chapterIndex, title, rawText, wordCount });
    } catch {
      continue;
    }
  }

  return { metadata, coverR2Key, chapters };
}
