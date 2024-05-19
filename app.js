const express = require("express");
const userRoute = require("./routes/userRoute");
const authRoute = require("./routes/authRoute");
const dummyRoute = require("./routes/dummyRoute");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const {connectDatabase} = require("./config/database");
const errorMiddleware = require("./middlewares/error");
const groupRoute = require("./routes/groupRoute");
const wallRoute = require("./routes/wallRoute");
const cors = require("cors");
const session = require('express-session');
const { activityLogger, errorLogger } = require("./utils/logger");
dotenv.config({ path: "./config/config.env" });

const app = express();
const PORT = process.env.PORT;
const API_PREFIX = process.env.API_PREFIX || "";
const CORS_URL = process.env.CORS_URL || "http://localhost:5173";

app.use(session({
  resave: false,
  saveUninitialized: true,
  secret: process.env.SESSION_SECRET
}));

//Connecting Database
connectDatabase();

// Applying Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
// app.use(cors());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", CORS_URL);
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Credentials", true);
  next();
});

// Routes
app.use(`${API_PREFIX}/user`, userRoute);
app.use(`${API_PREFIX}/authentication`,authRoute);
app.use(`${API_PREFIX}/group`, groupRoute);
app.use(`${API_PREFIX}/dummy`, dummyRoute);
app.use(`${API_PREFIX}/wall`, wallRoute);

app.use(errorMiddleware);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  activityLogger.info(`Server is running on http://localhost:${PORT}`);
});
