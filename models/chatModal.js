const mongoose = require("mongoose");

const userChatSchema = new mongoose.Schema(
  {
    business_id: {
      type: String,
      required: [true, "Business id is required"],
      trim: true,
      type: mongoose.Schema.ObjectId,
      ref: "Business",
    },

    business_name: {
      type: String,
      required: [true, "Business name is required"],
      trim: true,
    },

    user_id: {
      type: String,
      required: [true, "User id is required"],
      trim: true,
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },

    user_name: {
      type: String,
      required: [true, "User name id is required"],
      trim: true,
    },

    channel_id: {
      type: String,
      required: [true, "Channel id is required"],
      trim: true,
    },

    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userChatSchema.index({ user_id: 1 });
userChatSchema.index({ business_id: 1 });
userChatSchema.index({ channel_id: 1 });

// virtual populate
userChatSchema.virtual("services", {
  ref: "Service",
  foreignField: "business",
  localField: "_id",
});

// virtual populate
userChatSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "business",
  localField: "_id",
});

const ChatUser = mongoose.model("ChatUser", userChatSchema);

module.exports = ChatUser;
