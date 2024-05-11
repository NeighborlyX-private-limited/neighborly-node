const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Please enter username"],
    unique: true,
  },
  password: {
    type: String,
  },
  picture: {
    type: String,
  },
  email: {
    type: String,
    required: [true, "Please enter email"],
    unique: true,
  },
  current_coordinates: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
    },
  },
  city: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
    },
  },
  findMe: {
    type: Boolean,
    default: true,
  },
  groups: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
    },
  ],
  karma: {
    type: Number,
    default: 1000,
  },
  auth_type: {
    type: String
  }
});

userSchema.pre("save", async function () {
  if (this.password !== undefined)
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

// Add 2dsphere index on current_coordinates
userSchema.index({ current_coordinates: "2dsphere" });
userSchema.index({ city: "2dsphere" });
module.exports = mongoose.model("User", userSchema);
