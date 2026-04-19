import OpenAI from 'openai';

// Chat client — uses OPENAI_CHAT_BASE_URL if set, falls back to OPENAI_BASE_URL, then OpenAI default
const chatBaseURL = process.env.OPENAI_CHAT_BASE_URL || process.env.OPENAI_BASE_URL || undefined;
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'placeholder',
  baseURL: chatBaseURL,
});

// TTS client — uses OPENAI_TTS_BASE_URL if set, falls back to OPENAI_BASE_URL, then OpenAI default
// For Gemini: set OPENAI_TTS_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
const ttsBaseURL = process.env.OPENAI_TTS_BASE_URL || process.env.OPENAI_BASE_URL || undefined;
export const ttsClient = new OpenAI({
  apiKey: process.env.OPENAI_TTS_API_KEY || process.env.OPENAI_API_KEY || 'placeholder',
  baseURL: ttsBaseURL,
});

const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL ?? process.env.OPENAI_MODEL ?? 'gpt-4o';
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
  console.log(`[cleanup] Using model=${CHAT_MODEL} baseURL=${chatBaseURL ?? 'default'}`);
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

export async function generateTtsChunk(text: string, voice: string): Promise<{ mp3Buffer: Buffer }> {
  // Gemini OpenAI-compatible TTS requires lowercase voice names
  const voiceName = voice.toLowerCase() as OpenAI.Audio.SpeechCreateParams['voice'];
  console.log(`[tts] model=${TTS_MODEL} voice=${voiceName} baseURL=${ttsBaseURL ?? 'default'} textLen=${text.length}`);

  const resp = await ttsClient.audio.speech.create({
    model: TTS_MODEL,
    voice: voiceName,
    input: text,
    response_format: 'mp3',
  });

  const mp3Buffer = Buffer.from(await resp.arrayBuffer());
  console.log(`[tts] received ${mp3Buffer.length} bytes`);
  return { mp3Buffer };
}
