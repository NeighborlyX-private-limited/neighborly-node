const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide group name"],
    maxlength: 100,
  },
  icon: {
    type: String,
  },
  description: {
    type: String,
  },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
      default: [0, 0], // Default coordinates, update as needed
    },
  },
  isOpen: {
    type: Boolean,
  },
  radius: {
    type: Number,
  },
  karma: {
    type: Number,
  },
  admin: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      username: String,
    },
  ],
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
    },
  ],
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
