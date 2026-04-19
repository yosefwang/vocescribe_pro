import type { Sentence } from './chunker';

export interface AlignedSentence extends Sentence {
  start_time: number;
  end_time: number;
}

export interface AlignmentJson {
  chapter_id: string;
  voice: string;
  total_duration_sec: number;
  sentences: AlignedSentence[];
}

/**
 * Evenly distribute sentence timestamps across the chunk duration.
 * Used when word-level timestamps aren't available from the TTS API.
 */
export function distributeTimestamps(
  sentences: Sentence[],
  durationSec: number,
  offset = 0,
): AlignedSentence[] {
  if (sentences.length === 0) return [];

  const totalChars = sentences.reduce((sum, s) => sum + s.text.length, 0);
  let elapsed = 0;

  return sentences.map((s) => {
    const proportion = s.text.length / totalChars;
    const sentenceDuration = durationSec * proportion;
    const start = offset + elapsed;
    const end = start + sentenceDuration;
    elapsed += sentenceDuration;
    return { ...s, start_time: Math.round(start * 100) / 100, end_time: Math.round(end * 100) / 100 };
  });
}

export function applyChunkOffset(allChunks: AlignedSentence[][], chunkDurations: number[]): AlignedSentence[] {
  const result: AlignedSentence[] = [];
  let offset = 0;

  for (let i = 0; i < allChunks.length; i++) {
    for (const s of allChunks[i]) {
      result.push({
        ...s,
        start_time: Math.round((s.start_time + offset) * 100) / 100,
        end_time: Math.round((s.end_time + offset) * 100) / 100,
      });
    }
    offset += chunkDurations[i] ?? 0;
  }

  return result;
}
