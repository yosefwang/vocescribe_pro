import { inngest } from './client';
import { processChapter } from '../tts/pipeline';

export const generateChapterAudio = inngest.createFunction(
  {
    id: 'generate-chapter-audio',
    concurrency: [
      { limit: 3, key: 'event.data.userId' },
      { limit: 10 },
    ],
    retries: 3,
  },
  { event: 'audio/chapter.generate' },
  async ({ event, step }) => {
    const { audioJobId } = event.data as { audioJobId: string; chapterId: string; userId: string; voice: string };

    await step.run('process-chapter', async () => {
      await processChapter(audioJobId);
    });

    return { success: true };
  },
);
