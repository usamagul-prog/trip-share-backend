import { Server } from 'socket.io';
export function registerChatGateway(io: Server): void {
  io.on('connection', (_socket) => {
    // TODO: implement join-room, send-message, disconnect events
  });
}
