const mongoose = require('mongoose');

const TimeslotSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ["available", "blocked"],
    default: "available",
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
});

module.exports = mongoose.model("TimeSlot", TimeslotSchema);
