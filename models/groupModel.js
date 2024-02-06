const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide group name"],
    maxlength: 100,
  },
  description: String,
  lastActive: {
    type: Date,
    default: Date.now(),
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  permanentGroup: {
    type: Boolean,
    default: false,
  },
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
