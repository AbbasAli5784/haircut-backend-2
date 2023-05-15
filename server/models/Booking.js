const mongoose = require("mongoose");

const BookingScehma = new mongoose.Schema({
  user: {
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
  },

  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  service: {
    type: String,
    required: true,
  },
});

const Booking = mongoose.model("Booking", BookingScehma);

module.exports = Booking;
