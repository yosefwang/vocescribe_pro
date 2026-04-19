import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'vocescribe',
  eventKey: process.env.INNGEST_EVENT_KEY,
});
