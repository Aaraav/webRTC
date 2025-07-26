const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const users = {};
const rooms = {};

io.on('connection', (socket) => {
  console.log('A user connected: ' + socket.id);

  socket.on("join", (params) => {
    const roomId = params.roomId;
    socket.join(roomId);

    users[socket.id] = { roomId };

    if (!rooms[roomId]) {
      rooms[roomId] = { users: [] };
    }

    const otherUsers = rooms[roomId].users;
    if (otherUsers.length > 0) {
      io.to(socket.id).emit("other-users", otherUsers);
    }

    rooms[roomId].users.push(socket.id);
    console.log(`User ${socket.id} added to room ${roomId}`);
  });

  socket.on("disconnect", () => {
    console.log(`A user disconnected: ${socket.id}`);
    const user = users[socket.id];

    if (user) {
      const roomId = user.roomId;
      const room = rooms[roomId];

      if (room) {
        room.users = room.users.filter(id => id !== socket.id);

        if (room.users.length === 0) {
          delete rooms[roomId];
          console.log(`Room ${roomId} is empty and has been closed.`);
        } else {
          socket.to(roomId).emit("peer-left", { socketId: socket.id });
        }
      }
      delete users[socket.id];
    }
  });

  const broadcastToRoom = (eventName, params) => {
    const user = users[socket.id];
    if (user) {
      const roomId = user.roomId;
      socket.to(roomId).emit(eventName, params);
    } else {
      console.log(`Warning: User ${socket.id} tried to emit '${eventName}' but was not in a room.`);
    }
  };

  socket.on("localDescription", (params) => {
    broadcastToRoom("localDescription", { description: params.description });
  });

  socket.on("remoteDescription", (params) => {
    broadcastToRoom("remoteDescription", { description: params.description });
  });

  socket.on("iceCandidate", (params) => {
    broadcastToRoom("iceCandidate", { candidate: params.candidate });
  });

  socket.on("iceCandidateReply", (params) => {
    broadcastToRoom("iceCandidateReply", { candidate: params.candidate });
  });

  socket.on('chat-message', (params) => {
    broadcastToRoom('chat-message', {
      text: params.text,
      author: params.author,
    });
  });
});

server.listen(3001, () => {
  console.log('Server is listening on *:3001');
});
