const { Server } = require("socket.io");

let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:5173",
        "http://localhost:3000",
        process.env.CLIENT_URL,
      ].filter(Boolean),
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`[SOCKET] Client connected: ${socket.id}`);

    // Join a personal room based on userId (sent on connection)
    socket.on("join", (userId) => {
      if (userId) {
        socket.join(`user:${userId}`);
        console.log(`[SOCKET] ${socket.id} joined user:${userId}`);
      }
    });

    // Join admin room
    socket.on("join-admin", () => {
      socket.join("admin");
      console.log(`[SOCKET] ${socket.id} joined admin room`);
    });

    socket.on("disconnect", () => {
      console.log(`[SOCKET] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};

module.exports = { initSocket, getIO };
