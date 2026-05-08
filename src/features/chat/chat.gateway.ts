import { Server, Socket } from 'socket.io';
import { verifyToken } from '../../utils/jwt';
import { chatService } from './chat.service';

async function authenticateSocket(socket: Socket): Promise<string | null> {
  try {
    const token = socket.handshake.auth.token as string;
    if (!token) return null;
    const payload = verifyToken(token);
    return payload._id;
  } catch {
    return null;
  }
}

export function registerChatGateway(io: Server): void {
  io.on('connection', async (socket) => {
    const userId = await authenticateSocket(socket);
    if (!userId) {
      socket.disconnect();
      return;
    }

    socket.on('join-room', async (bookingId: string) => {
      const hasAccess = await chatService.validateBookingAccess(bookingId, userId);
      if (!hasAccess) return;
      await socket.join(bookingId);
      await chatService.markRead(bookingId, userId);
    });

    socket.on('send-message', async ({ bookingId, text }: { bookingId: string; text: string }) => {
      if (!text?.trim()) return;
      const hasAccess = await chatService.validateBookingAccess(bookingId, userId);
      if (!hasAccess) return;
      const msg = await chatService.saveMessage(bookingId, userId, text.trim());
      const populated = await msg.populate('sender', 'name avatar_url');
      io.to(bookingId).emit('new-message', populated.toObject());
    });

    socket.on('mark-read', async (bookingId: string) => {
      await chatService.markRead(bookingId, userId);
    });
  });
}
