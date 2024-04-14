const mongoose = require("mongoose");

const connectDatabase = () => {
  mongoose.connect(process.env.DB_URI).then(() => {
      console.log("Database connected Successfully...");
    })
    .catch((err) => {
      console.log("connection failed due to:"+err);
    });
};

module.exports = connectDatabase;
