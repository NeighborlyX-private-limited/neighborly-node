// const mongoose = require("mongoose");

// const groupSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: [true, "Please provide group name"],
//     maxlength: 100,
//   },
//   description: String,
//   lastActive: {
//     type: Date,
//     default: Date.now(),
//   },
//   admin: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true,
//   },
//   permanentGroup: {
//     type: Boolean,
//     default: false,
//   },
//   participants: [
//     {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//     },
//   ],
  
//   messages: [
//     {
//       username: String,
//       content: String,
//       sentAt: {
//         type: Date,
//         default: Date.now()
//       },
//     }
//   ]
// });

// // Auto-delete groups after 24 hours if not permanent
// groupSchema.index(
//   { lastActive: 1 },
//   {
//     expireAfterSeconds: 24 * 60 * 60,
//     partialFilterExpression: { permanentGroup: false },
//   }
// );

// const Group = mongoose.model("Group", groupSchema);
// module.exports = Group;


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
  created_at: {
    type: Date,
    default: Date.now(),
  },
}, { timestamps: true });

// Correct index field to 'location'
groupSchema.index({ location: '2dsphere' });

// Auto-delete groups after 24 hours with the correct option
groupSchema.index({ created_at: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

const Group = mongoose.model("Group", groupSchema);
module.exports = Group;
