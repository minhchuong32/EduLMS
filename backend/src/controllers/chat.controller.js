const { query } = require("../config/database");
const { getIo } = require("../socket/chat.socket");

const normalizeRole = (role) => String(role || "").toLowerCase();
const canChatRole = (role) => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === "admin" || normalizedRole === "teacher";
};

const mapMessage = (row) => ({
  id: row.id,
  senderId: row.senderid || row.senderId,
  receiverId: row.receiverid || row.receiverId,
  content: row.content,
  fileUrl: row.fileurl || row.fileUrl,
  fileName: row.filename || row.fileName,
  fileMimeType: row.filemimetype || row.fileMimeType,
  isRead: Boolean(row.isread ?? row.isRead),
  createdAt: row.createdat || row.createdAt,
  senderName: row.sendername || row.senderName,
  receiverName: row.receivername || row.receiverName,
});

const emitMessageEvent = (message) => {
  const io = getIo();
  if (!io || !message) return;

  io.to(`user:${message.senderId}`).emit("chat:new-message", message);
  io.to(`user:${message.receiverId}`).emit("chat:new-message", message);
};

const emitHistoryClearedEvent = () => {
  const io = getIo();
  if (!io) return;
  io.emit("chat:history-cleared", {});
};

const getChatContacts = async (req, res, next) => {
  try {
    const me = req.user;
    const myRole = normalizeRole(me.role);

    if (!canChatRole(myRole)) {
      return res
        .status(403)
        .json({ error: "Chat is only available for teacher/admin" });
    }

    const targetRole = myRole === "admin" ? "teacher" : "admin";

    const contactsResult = await query(
      `SELECT id, fullName, email, role, avatar
       FROM users
       WHERE LOWER(role) = @targetRole AND isActive = true
       ORDER BY fullName ASC`,
      { targetRole },
    );

    const unreadResult = await query(
      `SELECT senderId, COUNT(*)::int AS unreadCount
       FROM chatmessages
       WHERE receiverId = @meId AND isRead = false
       GROUP BY senderId`,
      { meId: me.id },
    );

    const unreadMap = new Map(
      unreadResult.recordset.map((row) => [
        row.senderid || row.senderId,
        row.unreadcount || row.unreadCount || 0,
      ]),
    );

    const contacts = contactsResult.recordset.map((contact) => ({
      id: contact.id,
      fullName: contact.fullname || contact.fullName,
      email: contact.email,
      role: contact.role,
      avatar: contact.avatar,
      unreadCount: unreadMap.get(contact.id) || 0,
    }));

    return res.json(contacts);
  } catch (err) {
    return next(err);
  }
};

const getConversation = async (req, res, next) => {
  try {
    const me = req.user;
    const myRole = normalizeRole(me.role);
    const otherUserId = req.params.userId;
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);

    if (!canChatRole(myRole)) {
      return res
        .status(403)
        .json({ error: "Chat is only available for teacher/admin" });
    }

    const targetResult = await query(
      "SELECT id, role, isActive FROM users WHERE id = @id",
      { id: otherUserId },
    );
    const target = targetResult.recordset[0];

    if (
      !target ||
      !target.isactive ||
      normalizeRole(target.role) === myRole ||
      !canChatRole(target.role)
    ) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const messagesResult = await query(
      `SELECT
         m.id,
         m.senderId,
         m.receiverId,
         m.content,
         m.fileUrl,
         m.fileName,
         m.fileMimeType,
         m.isRead,
         m.createdAt,
         sender.fullName AS senderName,
         receiver.fullName AS receiverName
       FROM chatmessages m
       INNER JOIN users sender ON sender.id = m.senderId
       INNER JOIN users receiver ON receiver.id = m.receiverId
       WHERE (m.senderId = @meId AND m.receiverId = @otherId)
          OR (m.senderId = @otherId AND m.receiverId = @meId)
       ORDER BY m.createdAt DESC
       LIMIT @limit`,
      {
        meId: me.id,
        otherId: otherUserId,
        limit,
      },
    );

    return res.json(messagesResult.recordset.map(mapMessage).reverse());
  } catch (err) {
    return next(err);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    const me = req.user;
    const myRole = normalizeRole(me.role);
    const toUserId = req.body.toUserId;
    const content = String(req.body.content || "").trim();
    const file = req.file;
    const fileUrl = file ? `/uploads/chat/${file.filename}` : null;
    const fileName = file ? file.originalname : null;
    const fileMimeType = file ? file.mimetype : null;
    const hasText = Boolean(content);
    const hasFile = Boolean(fileUrl);

    if (!canChatRole(myRole)) {
      return res
        .status(403)
        .json({ error: "Chat is only available for teacher/admin" });
    }

    if (!toUserId || (!hasText && !hasFile)) {
      return res
        .status(400)
        .json({ error: "toUserId and content or file are required" });
    }

    if (content.length > 2000) {
      return res.status(400).json({ error: "Message is too long" });
    }

    if (file && !file.mimetype.startsWith("image/")) {
      return res.status(400).json({ error: "Only image files are allowed" });
    }

    const targetResult = await query(
      "SELECT id, role, isActive FROM users WHERE id = @id",
      { id: toUserId },
    );
    const target = targetResult.recordset[0];

    if (
      !target ||
      !target.isactive ||
      normalizeRole(target.role) === myRole ||
      !canChatRole(target.role)
    ) {
      return res.status(400).json({ error: "Invalid recipient" });
    }

    const insertResult = await query(
      `INSERT INTO chatmessages (senderId, receiverId, content, fileUrl, fileName, fileMimeType, isRead)
       VALUES (@senderId, @receiverId, @content, @fileUrl, @fileName, @fileMimeType, false)
       RETURNING id`,
      {
        senderId: me.id,
        receiverId: toUserId,
        content,
        fileUrl,
        fileName,
        fileMimeType,
      },
    );

    const insertedId = insertResult.recordset[0]?.id;
    const detailResult = await query(
      `SELECT
         m.id,
         m.senderId,
         m.receiverId,
         m.content,
         m.fileUrl,
         m.fileName,
         m.fileMimeType,
         m.isRead,
         m.createdAt,
         sender.fullName AS senderName,
         receiver.fullName AS receiverName
       FROM chatmessages m
       INNER JOIN users sender ON sender.id = m.senderId
       INNER JOIN users receiver ON receiver.id = m.receiverId
       WHERE m.id = @id`,
      { id: insertedId },
    );

    const message = mapMessage(detailResult.recordset[0]);
    emitMessageEvent(message);

    return res.status(201).json(message);
  } catch (err) {
    return next(err);
  }
};

const deleteAllHistory = async (req, res, next) => {
  try {
    const me = req.user;
    const myRole = normalizeRole(me.role);

    if (myRole !== "admin") {
      return res.status(403).json({ error: "Only admin can clear history" });
    }

    const result = await query("DELETE FROM chatmessages");
    emitHistoryClearedEvent();

    return res.json({ success: true, deleted: result.rowsAffected?.[0] || 0 });
  } catch (err) {
    return next(err);
  }
};

const markConversationRead = async (req, res, next) => {
  try {
    const me = req.user;
    const otherUserId = req.params.userId;

    if (!canChatRole(me.role)) {
      return res
        .status(403)
        .json({ error: "Chat is only available for teacher/admin" });
    }

    await query(
      `UPDATE chatmessages
       SET isRead = true
       WHERE senderId = @otherId
         AND receiverId = @meId
         AND isRead = false`,
      {
        otherId: otherUserId,
        meId: me.id,
      },
    );

    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getChatContacts,
  getConversation,
  sendMessage,
  markConversationRead,
  deleteAllHistory,
};
