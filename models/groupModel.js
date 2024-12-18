const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide group name"],
    maxlength: 100,
  },
  displayname: {
    type: String,
    required: true
  },
  icon: {
    type: String,
  },
  description: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
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
    required: true
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
      userName: String,
      picture: String,
      karma: Number,
      fcmToken: {
      type: String,
      required: true
    },
      mutedGroups: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Group",
        },
      ]
    },
  ],
  members: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      userName: String,
      picture: String,
      karma: Number,
      fcmToken: {
        type: String,
        required: true
      },
      mutedGroups: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Group",
        },
      ]
    },
  ],

  blockList: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      userName: String,
      picture: String,
      karma: Number,
      fcmToken: {
        type: String,
        required: true
      },
      mutedGroups: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Group",
        },
      ]
    },
  ]
});

// Auto-delete groups after 24 hours if not permanent
groupSchema.index(
  { lastActive: 1 },
  {
    expireAfterSeconds: 24 * 60 * 60,
    partialFilterExpression: { permanentGroup: false },
  }
);

// This is very important so that we can query the coordinates DO NOT REMOVE
groupSchema.index({ location: "2dsphere" });
const Group = mongoose.model("Group", groupSchema);
module.exports = Group;
