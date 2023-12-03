const express = require("express");
const userRoute = require("./routes/userRoute");
const dummyRoute = require("./routes/dummyRoute");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const connectDatabase = require("./config/database");
const errorMiddleware = require("./middlewares/error");
const groupRoute = require("./routes/groupRoute");


dotenv.config({ path: "./config/config.env" });
const app = express();
const PORT = process.env.PORT;

//Connecting Database
connectDatabase();

// Applying Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());


// Routes
app.use("/user", userRoute);
app.use("/group", groupRoute);
app.use("/dummy", dummyRoute);


app.get("/", (req, res) => {
  res.json({
    message: "Hello World",
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

app.use(errorMiddleware)
