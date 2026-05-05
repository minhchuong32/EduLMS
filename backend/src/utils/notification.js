const { query } = require("../config/database");

let notificationSchemaReady;

const ensureNotificationSchema = async () => {
  if (!notificationSchemaReady) {
    notificationSchemaReady = query(`
      ALTER TABLE notifications
      ADD COLUMN IF NOT EXISTS senderRole varchar(20);
    `).catch((error) => {
      notificationSchemaReady = null;
      throw error;
    });
  }

  return notificationSchemaReady;
};

const notifyClassStudents = async (
  { classId, title, message, type, referenceId, senderRole },
  client = null,
) => {
  if (!classId) return 0;

  await ensureNotificationSchema();

  const result = await query(
    `
      INSERT INTO Notifications (userId, title, message, type, referenceId, senderRole)
      SELECT DISTINCT sc.studentId, @title, @message, @type, @referenceId::uuid, @senderRole
      FROM StudentClasses sc
      WHERE sc.classId = @classId
      RETURNING id
    `,
    {
      classId,
      title,
      message: message || null,
      type: type || null,
      referenceId: referenceId || null,
      senderRole: senderRole || null,
    },
    client,
  );

  return result.recordset.length;
};

module.exports = { ensureNotificationSchema, notifyClassStudents };
