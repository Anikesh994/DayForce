import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app.js';

const PORT = process.env.PORT_CORE_API || 3001;
const app = createApp();

app.listen(PORT, () => {
  console.log(`[Core API] Server running on http://localhost:${PORT}`);
});
