import { Inngest } from 'inngest';

const inngest = new Inngest({
  id: 'attendwise-core-api',
  eventKey: process.env.INNGEST_EVENT_KEY || 'local-dev-event-key',
});

export async function publishEvent(name: string, data: Record<string, any>): Promise<void> {
  // Fire-and-forget — never block the caller
  setImmediate(async () => {
    try {
      await inngest.send({ name, data });
    } catch (err) {
      console.warn(`[events] Could not publish ${name}:`, (err as Error).message);
    }
  });
}
