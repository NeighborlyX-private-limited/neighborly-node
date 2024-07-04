const mongoose = require("mongoose");
const { activityLogger, errorLogger } = require("../utils/logger");
const Sequelize = require("sequelize");

exports.connectDatabase = () => {
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

// Connect to PostgreSQL
const sequelize = new Sequelize(
  process.env.PG_DATABASE,
  process.env.PG_USERNAME,
  process.env.PG_PASSWORD,
  {
    host: process.env.PG_HOSTNAME,
    dialect: "postgres",
    logging: false,
  }
);

sequelize
  .authenticate()
  .then(() => {
    console.log("PostgreSQL connected successfully...");
    activityLogger.info("PostgreSQL connected successfully");
  })
  .catch((err) => {
    errorLogger.error(`PostgreSQL connection error:`, err);
    console.log("PostgreSQL connection failed:", err);
  });

exports.sequelize = sequelize;
