const { type } = require("express/lib/response");
const mongoose = require("mongoose");
const { required } = require("nodemon/lib/config");

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide group name"],
    maxlength: 100,
  },
  topic: {
    type: String
  },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number,],
      default: [0, 0], // Default coordinates, update as needed
    },
  },
  radius: {
    type: Number,
  },
  admin: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    username: String,
  },
  members: [
    {
      user: {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        username: String,
      },
      status: {
        type: String,
        enum: ["pending", "accepted"],
        default: "pending",
      },
    },
  ],
  group_type: {
    type: String,
    required: true
  }
});

// Auto-delete groups after 24 hours if not permanent
groupSchema.index(
  { lastActive: 1 },
  {
    expireAfterSeconds: 24 * 60 * 60,
    partialFilterExpression: { permanentGroup: false },
  }
);

const Group = mongoose.model("Group", groupSchema);
module.exports = Group;
