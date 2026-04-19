import { pgTable, text, uuid, integer, jsonb, bigint, real, timestamp, index, check, uniqueIndex, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const bookStatus = pgEnum('book_status', ['uploaded', 'processing', 'ready', 'failed']);

export const books = pgTable('books', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  author: text('author'),
  description: text('description'),
  coverR2Key: text('cover_r2_key'),
  epubR2Key: text('epub_r2_key').notNull(),
  language: text('language').default('en'),
  status: bookStatus('status').default('uploaded').notNull(),
  contentHash: text('content_hash'),
  totalChapters: integer('total_chapters'),
  totalWordCount: integer('total_word_count'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ idxBooksUserId: index('idx_books_user_id').on(t.userId) }));

export const chapters = pgTable('chapters', {
  id: uuid('id').defaultRandom().primaryKey(),
  bookId: uuid('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  chapterNumber: integer('chapter_number').notNull(),
  title: text('title'),
  rawText: text('raw_text').notNull(),
  cleanedText: text('cleaned_text'),
  sentences: jsonb('sentences'),
  wordCount: integer('word_count'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ idxChaptersBookNumber: uniqueIndex('idx_chapters_book_number').on(t.bookId, t.chapterNumber) }));

export const voiceEnum = pgEnum('voice', ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']);
export const jobStatus = pgEnum('job_status', ['queued', 'running', 'done', 'failed']);

export const audioJobs = pgTable('audio_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  chapterId: uuid('chapter_id').notNull().references(() => chapters.id, { onDelete: 'cascade' }),
  voice: voiceEnum('voice').default('alloy').notNull(),
  status: jobStatus('status').default('queued').notNull(),
  audioR2Key: text('audio_r2_key'),
  alignmentR2Key: text('alignment_r2_key'),
  durationSec: real('duration_sec'),
  fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }),
  errorMessage: text('error_message'),
  attempts: integer('attempts').default(0).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ idxAudioJobsChapter: index('idx_audio_jobs_chapter').on(t.chapterId) }));

export const playbackStates = pgTable('playback_states', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bookId: uuid('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  chapterId: uuid('chapter_id').references(() => chapters.id, { onDelete: 'set null' }),
  positionSec: real('position_sec').default(0).notNull(),
  playbackSpeed: real('playback_speed').default(1.0).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ idxPlaybackUserBook: uniqueIndex('idx_playback_user_book').on(t.userId, t.bookId) }));
