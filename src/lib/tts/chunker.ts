export interface Sentence {
  index: number;
  text: string;
  start_char: number;
  end_char: number;
}

export function chunkSentences(sentences: Sentence[], maxChars = 4000): Sentence[][] {
  const chunks: Sentence[][] = [];
  let current: Sentence[] = [];
  let currentLen = 0;

  for (const sentence of sentences) {
    if (currentLen + sentence.text.length > maxChars && current.length > 0) {
      chunks.push(current);
      current = [];
      currentLen = 0;
    }
    current.push(sentence);
    currentLen += sentence.text.length;
  }

  if (current.length > 0) chunks.push(current);
  return chunks;
}
