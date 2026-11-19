import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { serve } from 'inngest/express';
import { inngest } from './inngest/client.js';
import { investigateExceptionFn } from './inngest/workflows/investigateException.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT_WORKFLOW_WORKER || 3002;

app.use(cors());
app.use(express.json());

// Inngest serve endpoint
app.use(
  '/api/inngest',
  serve({
    client: inngest,
    functions: [investigateExceptionFn],
  })
);

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status:    'healthy',
    service:   'AttendWise Workflow Worker',
    functions: ['attendwise-investigate-exception'],
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`[Workflow Worker] Running on http://localhost:${PORT}`);
  console.log(`[Workflow Worker] Inngest endpoint: http://localhost:${PORT}/api/inngest`);
});
