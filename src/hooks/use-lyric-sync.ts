import { useState, useEffect, useCallback, type RefObject } from 'react';

export interface AlignedSentence {
  index: number;
  text: string;
  start_time: number;
  end_time: number;
  start_char: number;
  end_char: number;
}

function binarySearchSentence(sentences: AlignedSentence[], t: number): number {
  let lo = 0, hi = sentences.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const s = sentences[mid];
    if (t < s.start_time) hi = mid - 1;
    else if (t > s.end_time) lo = mid + 1;
    else return mid;
  }
  return Math.max(0, lo - 1);
}

export function useLyricSync(
  audioRef: RefObject<HTMLAudioElement | null>,
  sentences: AlignedSentence[],
) {
  const [currentIndex, setCurrentIndex] = useState(-1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || sentences.length === 0) return;

    function onTimeUpdate() {
      const t = audio!.currentTime;
      const idx = binarySearchSentence(sentences, t);
      setCurrentIndex(idx);
    }

    audio.addEventListener('timeupdate', onTimeUpdate);
    return () => audio.removeEventListener('timeupdate', onTimeUpdate);
  }, [audioRef, sentences]);

  const seekToSentence = useCallback((index: number) => {
    if (audioRef.current && sentences[index]) {
      audioRef.current.currentTime = sentences[index].start_time;
    }
  }, [audioRef, sentences]);

  return { currentIndex, seekToSentence };
}
