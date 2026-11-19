import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'attendwise-workflow-worker',
  name: 'AttendWise AI Workflow Engine',
  eventKey: process.env.INNGEST_EVENT_KEY || 'local-dev-event-key',
});
