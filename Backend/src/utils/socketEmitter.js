const { getIO } = require("../config/socket");

const emitEvent = (event, data, room = null) => {
  try {
    const io = getIO();
    if (room) {
      io.to(room).emit(event, data);
    } else {
      io.emit(event, data);
    }
  } catch {
    // socket not initialized
  }
};

module.exports = { emitEvent };
