import 'dotenv/config';
import { initSentry } from './config/sentry';
initSentry();

import http from 'http';
import { Server as IOServer } from 'socket.io';
import app from './app';
import { connectDB } from './config/db';
import { initFirebase } from './config/firebase';
import { initCloudinary } from './config/cloudinary';
import { registerChatGateway } from './features/chat/chat.gateway';
import logger from './utils/logger';

const PORT = process.env.PORT || 5000;

try {
  initFirebase();
  initCloudinary();
} catch (err) {
  logger.error('Startup config error', { err });
  process.exit(1);
}

const httpServer = http.createServer(app);

const io = new IOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
});

registerChatGateway(io);

connectDB()
  .then(() => httpServer.listen(PORT, () => logger.info(`Server running on port ${PORT}`)))
  .catch((err) => { logger.error('DB connection failed', { err }); process.exit(1); });
