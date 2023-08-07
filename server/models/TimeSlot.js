const mongoose = require("mongoose");

const TimeslotSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["available", "blocked"],
    default: "blocked",
  },
  booked: {
    type: Boolean,
    default: false
  }
});

// Create the model only once and export it
const TimeSlot =
  mongoose.models.TimeSlot || mongoose.model("TimeSlot", TimeslotSchema);
module.exports = TimeSlot;
