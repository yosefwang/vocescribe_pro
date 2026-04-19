import OpenAI from 'openai';

// All model names and the API base URL are configurable via environment variables.
// This allows pointing to any OpenAI-compatible endpoint (Azure, local LLM, etc.).
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // OPENAI_BASE_URL: override to use a compatible API (e.g. Azure, Ollama, LiteLLM proxy)
  // Leave unset to use the official OpenAI endpoint (https://api.openai.com/v1)
  baseURL: process.env.OPENAI_BASE_URL || undefined,
});

// Model used for text cleanup and sentence splitting.
// Default: gpt-4o. Override via OPENAI_CHAT_MODEL env var.
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o';

// Model used for text-to-speech synthesis.
// Default: gpt-4o-mini-tts. Override via OPENAI_TTS_MODEL env var.
// Other valid values: tts-1, tts-1-hd
const TTS_MODEL = process.env.OPENAI_TTS_MODEL ?? 'gpt-4o-mini-tts';

const CLEANUP_SYSTEM_PROMPT = `You are a text preparation assistant for TTS.

Given raw chapter text from an EPUB:
1. Remove page numbers, headers, footers, footnote markers
2. Fix OCR artifacts (rn→m, ﬀ→ff)
3. Fix hyphenated line breaks (unfor-\\ntunately → unfortunately)
4. Remove image captions / figure references
5. Normalize quotes and dashes for spoken language
6. Split into sentences

Return JSON:
{
  "cleaned_text": "full cleaned string",
  "sentences": [
    {"index": 0, "text": "...", "start_char": 0, "end_char": 72}
  ]
}

Rules: start_char/end_char map to cleaned_text positions. Do NOT alter meaning.
For chapters > 6000 chars: split into sub-chunks, process separately, merge sentence arrays.`;

interface CleanupResult {
  cleaned_text: string;
  sentences: { index: number; text: string; start_char: number; end_char: number }[];
}

export async function cleanupChapterText(rawText: string): Promise<CleanupResult> {
  const resp = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: CLEANUP_SYSTEM_PROMPT },
      { role: 'user', content: rawText },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const content = resp.choices[0]?.message?.content;
  if (!content) throw new Error(`${CHAT_MODEL} returned empty response`);
  return JSON.parse(content) as CleanupResult;
}

export async function generateTtsChunk(text: string, voice: string): Promise<{ mp3Buffer: Buffer; words: TtsWord[] }> {
  const resp = await openai.audio.speech.create({
    model: TTS_MODEL as 'tts-1' | 'tts-1-hd' | 'gpt-4o-mini-tts',
    voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
    input: text,
    response_format: 'mp3',
  });

  const mp3Buffer = Buffer.from(await resp.arrayBuffer());
  // Note: word-level timestamps require additional API support.
  // For now, estimate sentence timestamps from chunk duration.
  return { mp3Buffer, words: [] };
}

export interface TtsWord {
  text: string;
  start: number;
  end: number;
  start_char: number;
  end_char: number;
}
