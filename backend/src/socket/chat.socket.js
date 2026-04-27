const jwt = require("jsonwebtoken");
const { query } = require("../config/database");

let ioInstance;

const normalizeRole = (role) => String(role || "").toLowerCase();
const canChatRole = (role) => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === "admin" || normalizedRole === "teacher";
};

const getUserFromToken = async (token) => {
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query(
      "SELECT id, fullName, role, isActive FROM Users WHERE id = @id",
      { id: decoded.id },
    );

    if (!result.recordset.length) return null;

    const user = result.recordset[0];
    if (!user.isActive || !canChatRole(user.role)) return null;

    return user;
  } catch {
    return null;
  }
};

const mapMessage = (message) => ({
  id: message.id,
  senderId: message.senderid || message.senderId,
  receiverId: message.receiverid || message.receiverId,
  content: message.content,
  fileUrl: message.fileurl || message.fileUrl,
  fileName: message.filename || message.fileName,
  fileMimeType: message.filemimetype || message.fileMimeType,
  isRead: Boolean(message.isread ?? message.isRead),
  createdAt: message.createdat || message.createdAt,
});

const createChatMessage = async ({ senderId, receiverId, content }) => {
  const insertResult = await query(
    `INSERT INTO chatmessages (senderId, receiverId, content, fileUrl, fileName, fileMimeType, isRead)
     VALUES (@senderId, @receiverId, @content, @fileUrl, @fileName, @fileMimeType, false)
     RETURNING id`,
    {
      senderId,
      receiverId,
      content,
      fileUrl: null,
      fileName: null,
      fileMimeType: null,
    },
  );

  const insertedId = insertResult.recordset[0]?.id;
  if (!insertedId) {
    throw new Error("Failed to create message");
  }

  const detailResult = await query(
    `SELECT id, senderId, receiverId, content, fileUrl, fileName, fileMimeType, isRead, createdAt
     FROM chatmessages
     WHERE id = @id`,
    { id: insertedId },
  );

  return mapMessage(detailResult.recordset[0]);
};

const initChatSocket = (io) => {
  ioInstance = io;

  io.on("connection", (socket) => {
    socket.on("chat:join", async (payload = {}) => {
      const token = payload.token;
      const user = await getUserFromToken(token);
      if (!user) {
        socket.emit("chat:error", { message: "Unauthorized" });
        return;
      }

      socket.data.user = user;
      socket.join(`user:${user.id}`);
      socket.emit("chat:ready", {
        userId: user.id,
        role: user.role,
      });
    });

    socket.on("chat:send", async (payload = {}) => {
      try {
        const user = socket.data.user;
        if (!user) {
          socket.emit("chat:error", { message: "Unauthorized" });
          return;
        }

        const receiverId = payload.toUserId;
        const content = String(payload.content || "").trim();

        if (!receiverId || !content) {
          socket.emit("chat:error", { message: "Missing receiver or content" });
          return;
        }

        if (content.length > 2000) {
          socket.emit("chat:error", { message: "Message is too long" });
          return;
        }

        const targetResult = await query(
          "SELECT id, role, isActive FROM Users WHERE id = @id",
          { id: receiverId },
        );
        const target = targetResult.recordset[0];
        const myRole = normalizeRole(user.role);
        const targetRole = normalizeRole(target?.role);

        if (!target || !target.isActive || !canChatRole(target.role)) {
          socket.emit("chat:error", { message: "Recipient is unavailable" });
          return;
        }

        if (targetRole === myRole) {
          socket.emit("chat:error", {
            message: "Only teacher and admin can chat with each other",
          });
          return;
        }

        const message = await createChatMessage({
          senderId: user.id,
          receiverId,
          content,
        });

        io.to(`user:${user.id}`).emit("chat:new-message", message);
        io.to(`user:${receiverId}`).emit("chat:new-message", message);
      } catch {
        socket.emit("chat:error", { message: "Failed to send message" });
      }
    });
  });
};

const getIo = () => ioInstance;

module.exports = {
  initChatSocket,
  getIo,
};
