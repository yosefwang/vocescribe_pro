import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { cleanupChapterText, generateTtsChunk } from '../openai/client';
import { chunkSentences, type Sentence } from './chunker';
import { distributeTimestamps, applyChunkOffset, type AlignmentJson, type AlignedSentence } from './alignment';
import { uploadObject } from '../storage/r2';
import { db } from '../db/client';
import { chapters, audioJobs } from '../db/schema';
import { eq } from 'drizzle-orm';

const execFileAsync = promisify(execFile);

async function getMp3Duration(buffer: Buffer): Promise<number> {
  // Rough estimate: ~1MB per minute at 128kbps. Used when ffprobe isn't available.
  // More accurate: use ffprobe
  const bytesPerSecond = 128000 / 8; // 128kbps = 16000 bytes/sec
  return buffer.length / bytesPerSecond;
}

async function concatMp3Files(files: string[], output: string): Promise<void> {
  const listFile = join(tmpdir(), `concat_${Date.now()}.txt`);
  const content = files.map((f) => `file '${f}'`).join('\n');
  await writeFile(listFile, content, 'utf-8');
  await execFileAsync('ffmpeg', ['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', output, '-y']);
  await unlink(listFile).catch(() => {});
}

export async function processChapter(jobId: string): Promise<void> {
  // Fetch job
  const [job] = await db.select().from(audioJobs).where(eq(audioJobs.id, jobId));
  if (!job) throw new Error(`Job ${jobId} not found`);

  // Mark running
  await db.update(audioJobs)
    .set({ status: 'running', startedAt: new Date(), attempts: job.attempts + 1 })
    .where(eq(audioJobs.id, jobId));

  try {
    // Fetch chapter
    const [chapter] = await db.select().from(chapters).where(eq(chapters.id, job.chapterId));
    if (!chapter) throw new Error(`Chapter ${job.chapterId} not found`);

    // Step 1: GPT-4o text cleanup
    let cleanedText = chapter.cleanedText;
    let sentences: Sentence[] = (chapter.sentences as Sentence[]) ?? [];

    if (!cleanedText || sentences.length === 0) {
      const result = await cleanupChapterText(chapter.rawText);
      cleanedText = result.cleaned_text;
      sentences = result.sentences;
      await db.update(chapters)
        .set({ cleanedText, sentences: sentences as any })
        .where(eq(chapters.id, chapter.id));
    }

    // Step 2: Chunk sentences
    const chunks = chunkSentences(sentences);

    // Step 3: TTS per chunk
    const tmpDir = join(tmpdir(), `vocescribe_${jobId}`);
    await mkdir(tmpDir, { recursive: true });

    const chunkFiles: string[] = [];
    const chunkDurations: number[] = [];
    const allAligned: AlignedSentence[][] = [];
    let charOffset = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i].map((s) => s.text).join(' ');
      const { mp3Buffer } = await generateTtsChunk(chunkText, job.voice);

      const chunkFile = join(tmpDir, `chunk_${i}.mp3`);
      await writeFile(chunkFile, mp3Buffer);
      chunkFiles.push(chunkFile);

      const duration = await getMp3Duration(mp3Buffer);
      chunkDurations.push(duration);

      const aligned = distributeTimestamps(chunks[i], duration, 0);
      // Adjust char offsets
      for (const s of aligned) {
        s.start_char += charOffset;
        s.end_char += charOffset;
      }
      allAligned.push(aligned);
      charOffset += chunkText.length + 1;
    }

    // Step 4: Apply cumulative offsets
    const finalSentences = applyChunkOffset(allAligned, chunkDurations);

    // Step 5: Concat MP3s if multi-chunk
    let finalMp3: Buffer;
    const outputFile = join(tmpDir, 'final.mp3');

    if (chunkFiles.length === 1) {
      finalMp3 = await import('fs/promises').then((f) => f.readFile(chunkFiles[0]));
    } else {
      await concatMp3Files(chunkFiles, outputFile);
      finalMp3 = await import('fs/promises').then((f) => f.readFile(outputFile));
    }

    // Calculate total duration
    const totalDuration = chunkDurations.reduce((a, b) => a + b, 0);

    // Step 6: Build alignment JSON
    const alignmentJson: AlignmentJson = {
      chapter_id: chapter.id,
      voice: job.voice,
      total_duration_sec: totalDuration,
      sentences: finalSentences,
    };

    // Step 7: Upload to R2
    // Fetch book for userId
    const [book] = await db.select().from(require('../db/schema').books).where(
      eq(require('../db/schema').books.id, chapter.bookId)
    );

    const audioKey = `${book!.userId}/${book!.id}/ch${chapter.chapterNumber}.mp3`;
    const alignmentKey = `${book!.userId}/${book!.id}/ch${chapter.chapterNumber}_align.json`;

    await uploadObject(audioKey, finalMp3, 'audio/mpeg');
    await uploadObject(alignmentKey, Buffer.from(JSON.stringify(alignmentJson)), 'application/json');

    // Step 8: Update job
    await db.update(audioJobs)
      .set({
        status: 'done',
        audioR2Key: audioKey,
        alignmentR2Key: alignmentKey,
        durationSec: totalDuration,
        fileSizeBytes: finalMp3.length,
        completedAt: new Date(),
      })
      .where(eq(audioJobs.id, jobId));

    // Cleanup temp files
    for (const f of chunkFiles) await unlink(f).catch(() => {});
    await unlink(outputFile).catch(() => {});
  } catch (err: any) {
    await db.update(audioJobs)
      .set({ status: 'failed', errorMessage: err.message?.slice(0, 500) ?? 'Unknown error' })
      .where(eq(audioJobs.id, jobId));
    throw err;
  }
}
