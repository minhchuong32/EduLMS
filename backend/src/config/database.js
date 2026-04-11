const { Pool } = require("pg");
require("dotenv").config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("Missing DATABASE_URL (PostgreSQL connection string).");
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl:
    process.env.PG_SSL === "true"
      ? { rejectUnauthorized: false }
      : undefined,
  max: parseInt(process.env.PG_POOL_MAX || "10", 10),
  idleTimeoutMillis: 30000,
});

const legacyKeyMap = {
  fullname: "fullName",
  passwordhash: "passwordHash",
  dateofbirth: "dateOfBirth",
  isactive: "isActive",
  createdat: "createdAt",
  updatedat: "updatedAt",
  gradelevel: "gradeLevel",
  academicyear: "academicYear",
  studentid: "studentId",
  teacherid: "teacherId",
  subjectid: "subjectId",
  classid: "classId",
  joinedat: "joinedAt",
  courseenrollmentid: "courseEnrollmentId",
  fileurl: "fileUrl",
  videourl: "videoUrl",
  orderindex: "orderIndex",
  ispublished: "isPublished",
  publishedat: "publishedAt",
  duedate: "dueDate",
  startdate: "startDate",
  timelimitminutes: "timeLimitMinutes",
  totalpoints: "totalPoints",
  maxattempts: "maxAttempts",
  shufflequestions: "shuffleQuestions",
  showresultimmediately: "showResultImmediately",
  assignmentid: "assignmentId",
  questiontext: "questionText",
  questiontype: "questionType",
  iscorrect: "isCorrect",
  attemptnumber: "attemptNumber",
  essaycontent: "essayContent",
  submittedat: "submittedAt",
  gradedby: "gradedBy",
  gradedat: "gradedAt",
  selectedoptionids: "selectedOptionIds",
  pointsearned: "pointsEarned",
  referenceid: "referenceId",
  userid: "userId",
  expiresat: "expiresAt",
  parentid: "parentId",
  authorid: "authorId",
  lessonid: "lessonId",
  subjectname: "subjectName",
  teachername: "teacherName",
  teacheravatar: "teacherAvatar",
  classname: "className",
  authorname: "authorName",
  authoravatar: "authorAvatar",
  authorrole: "authorRole",
  studentname: "studentName",
  studentavatar: "studentAvatar",
  assignmenttitle: "assignmentTitle",
  assignmenttype: "assignmentType",
  questionpoints: "questionPoints",
};

const mapRowKeys = (row) => {
  const mapped = { ...row };
  Object.entries(row).forEach(([key, value]) => {
    const legacyKey = legacyKeyMap[key];
    if (legacyKey && mapped[legacyKey] === undefined) {
      mapped[legacyKey] = value;
    }
  });
  return mapped;
};

const replaceNamedParams = (text, params) => {
  if (!params || Array.isArray(params)) {
    return { text, values: params || [] };
  }

  const keys = Object.keys(params);
  if (keys.length === 0) return { text, values: [] };

  // Only bind params that appear in the SQL, in order of first occurrence.
  // Otherwise optional fragments (e.g. no `avatar = @avatar`) leave gaps like $1..$6,$8 and break pg.
  const ordered = keys
    .map((key) => {
      const re = new RegExp(`@${key}\\b`);
      const pos = text.search(re);
      if (pos < 0) return null;
      return { key, pos };
    })
    .filter(Boolean)
    .sort((a, b) => a.pos - b.pos);

  let out = text;
  const values = [];
  ordered.forEach(({ key }, i) => {
    out = out.replace(new RegExp(`@${key}\\b`, "g"), `$${i + 1}`);
    const v = params[key];
    values.push(v === undefined ? null : v);
  });
  return { text: out, values };
};

// Keep MSSQL-like return shape: { recordset, rowsAffected }
const query = async (text, params = {}, client = null) => {
  const { text: q, values } = replaceNamedParams(text, params);
  const runner = client || pool;
  const result = await runner.query(q, values);
  return {
    recordset: result.rows.map(mapRowKeys),
    rowsAffected: [result.rowCount],
  };
};

const withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
};

const getPool = async () => pool;

const closePool = async () => pool.end();

module.exports = { pool, getPool, query, withTransaction, closePool };
