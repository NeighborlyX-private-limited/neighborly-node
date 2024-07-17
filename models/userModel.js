const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Please enter username"],
    unique: true,
    sparse: true,
  },
  password: {
    type: String,
  },
  picture: {
    type: String,
  },
  gender: {
    type: String,
  },
  dob: {
    type: Date,
  },
  email: {
    type: String,
    unique: true,
    sparse: true, // Allow multiple null values
  },
  phoneNumber: {
    type: String,
    unique: true,
    sparse: true, // Allow multiple null values
  },
  current_coordinates: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
      default: [28.5643, 77.2442],
    },
  },
  home_coordinates: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
      default: [28.5643, 77.2442],
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
    default: 0,
  },
  auth_type: {
    type: String,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  otp: {
    type: String,
  },
  otpExpiry: {
    type: Date,
  },
  bio: {
    type: String,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  dobSet: {
    type: Boolean,
    default: false,
    required: true,
  },
  awards: {
    type: Object,
    default: {
      "Local Legend": 2,
      "Sunflower": 2,
      "Streetlight": 2,
      "Park Bench": 2,
      "Map": 2
    }
  }
});

userSchema.pre("save", async function () {
  if (this.password !== undefined)
    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.getJWTToken = function (expiry, secret) {
  return jwt.sign({ id: this._id }, secret, {
    expiresIn: expiry,
  });
};

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Add 2dsphere index on current_coordinates
userSchema.index({ current_coordinates: "2dsphere" });
userSchema.index({ city: "2dsphere" });

module.exports = mongoose.model("User", userSchema);
