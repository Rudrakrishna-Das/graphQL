const { Server } = require("socket.io");

let io;

module.exports = {
  init: (httpServer) => {
    io = new Server(httpServer, {
      cors: {
        allowedHeaders: ["socket.io"],
        credentials: true,
      },
    });

    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error("socket.io is not initialized");
    }
    return io;
  },
};
