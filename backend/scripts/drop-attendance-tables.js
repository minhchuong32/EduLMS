const { query, closePool } = require("../src/config/database");

const run = async () => {
  try {
    await query("DROP TABLE IF EXISTS attendancerecords");
    await query("DROP TABLE IF EXISTS attendancesessions");

    const check = await query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('attendancesessions', 'attendancerecords')
      ORDER BY tablename
    `);

    console.log("Remaining attendance tables:", check.recordset);
  } finally {
    await closePool();
  }
};

run().catch((err) => {
  console.error("Failed to drop attendance tables:", err);
  process.exit(1);
});
