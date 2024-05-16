const { Pool } = require("pg");
const mongoose = require("mongoose");
const { activityLogger, errorLogger } = require("../utils/logger");

const connectDatabase = () => {
  mongoose
    .connect(process.env.DB_URI)
    .then(() => {
      console.log("Database connected Successfully...");
      activityLogger.info("Databse is connected successfully");
    })
    .catch((err) => {
      errorLogger.error(`Connection error occured due to:`, err);
      console.log("connection failed due to:" + err);
    });
};

const pool = new Pool({
  user: process.env.PG_USERNAME,
  host: process.env.PG_HOSTNAME,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

module.exports = pool;
module.exports = connectDatabase;
