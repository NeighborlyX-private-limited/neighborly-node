const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Please enter username"],
    unique: true
  },
  password: {
    type: String,
    required: [true, "Please enter password"],
  },
  email: {
    type: String,
    required: [true, "Please enter email"],
    unique: true
  },
  current_coordinates: { //TODO: Change to standard MongoDB Location Object
    longitude: Number,
    latitude: Number,
  },
  local_coordinates: [  //TODO: Replace with Cities Array
    {
      longitude: Number,
      latitude: Number,
    },
  ],
  groups: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
    },
  ],
  karma: {
    type: Number,
    default: 0,
  },
});

userSchema.pre("save", async function () {
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.getJWTToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY,
  });
};

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", userSchema);
