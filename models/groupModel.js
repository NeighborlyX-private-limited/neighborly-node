const mongoose = require("mongoose");

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
  id : {
    type: String,
    required: [true, "Please provide group id"],
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
