const { createLogger, transports, format } = require("winston");
const path = require("path");
const logsDir = path.join(__dirname, "..", "logs");

require("fs").promises.mkdir(logsDir, { recursive: true });

const customTimestampFormat = format.timestamp({
  format: "DD-MM-YYYY HH:mm:ss",
});

const errorLogFormat = format.printf(({ timestamp, level, message, stack }) => {
  if (level === "error") {
    return `${timestamp} - ${level.toUpperCase()}: ${message}\n${stack}`;
  }
  return `${timestamp} - ${level.toUpperCase()}: ${message}`;
});

const activityLogFormat = format.printf(({ timestamp, level, message }) => {
  return `${timestamp} - ${level.toUpperCase()}: ${message}`;
});

const activityLogger = createLogger({
  level: "info",
  format: format.combine(customTimestampFormat, activityLogFormat),
  transports: [
    new transports.File({ filename: path.join(logsDir, "activity.log") }),
  ],
});

// Create logger for error log
const errorLogger = createLogger({
  level: "error",
  format: format.combine(customTimestampFormat, errorLogFormat),
  transports: [
    new transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
    }),
  ],
});

// Handle uncaught exceptions
process.on("uncaughtException", (ex) => {
  errorLogger.error("An uncaught exception occurred:", ex);
  process.exit(1);
});

module.exports = {
  activityLogger,
  errorLogger,
};
