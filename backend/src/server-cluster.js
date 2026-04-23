// backend/src/server-cluster.js
require("dotenv").config();

const cluster = require("cluster");
const os = require("os");
const process = require("process");

const numCPUs = os.cpus().length;
const PORT = process.env.PORT || 5000;

if (cluster.isPrimary) {
  console.log(` Master ${process.pid} is running`);
  console.log(` Forking ${numCPUs} workers...\n`);

  // Tạo worker theo số core CPU
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Nếu worker chết → restart
  cluster.on("exit", (worker, code, signal) => {
    console.log(` Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });

} else {
  // Worker process
  const app = require("./app");
  const { getPool } = require("./config/database");

  const startWorker = async () => {
    try {
      await getPool(); // mỗi worker có DB connection riêng

      app.listen(PORT, () => {
        console.log(` Worker ${process.pid} running on port ${PORT}`);
      });

    } catch (err) {
      console.error(` Worker ${process.pid} failed:`, err);
      process.exit(1);
    }
  };

  startWorker();
}