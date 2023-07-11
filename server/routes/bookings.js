const express = require("express");
const { restart } = require("nodemon");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const Booking = require("../models/Booking");
const { auth, isAdmin } = require("../routes/auth");
const CustomError = require("../../CustomError");
const { startOfDay, endOfDay } = require("date-fns");
const moment = require("moment-timezone");

//Get booked time slots for a specific date
router.get("/date/:date", async (req, res, next) => {
  try {
    const dateParam = req.params.date;

    const date = moment.tz(dateParam, "America/New_York").startOf("day");
    const nextDay = date.clone().add(1, "days");

    if (!date.isValid()) {
      return next(new CustomError(400, "Invalid date format!"));
    }

    const bookings = await Booking.find({
      date: {
        $gte: date.toDate(),
        $lt: nextDay.toDate(),
      },
    });

    const bookedTimeSlots = bookings.map((booking) => booking.time);

    res.status(200).json(bookedTimeSlots);
  } catch (err) {
    next(err);
  }
});

//Add a new booking
router.post(
  "/",
  [
    check("user", "User is required").notEmpty(),
    check("date", "Date is required").isISO8601(),
    check("time", "Time is required").matches(
      /^((0[0-9]|1[0-2]):[0-5][0-9](AM|PM))$/i
    ),
    check("service", "Service is not selected").notEmpty(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { date, time, ...rest } = req.body;

    const bookingDateTime = moment.tz(
      `${date} ${time}`,
      "YYYY-MM-DD hh:mma",
      "America/New_York"
    );

    const newBooking = new Booking({
      ...rest,
      date: bookingDateTime.toDate(),
      time: time,
    });

    try {
      const savedBooking = await newBooking.save();
      res.status(201).json(savedBooking);
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
);

//Get booking by ID
router.get("/:id", async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return next(new CustomError(400, "Booking already exists!"));
    } else {
      res.status(200).json(booking);
    }
  } catch (err) {
    next(err);
  }
});

//Update A Booking
router.put("/:id", async (req, res) => {
  try {
    const updateBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updateBooking) {
      return next(new CustomError(404, "Booking not found!"));
    } else {
      res.status(200).json(updateBooking);
    }
  } catch (err) {
    next(err);
  }
});

//Remove a booking
router.delete("/:id", async (req, res, next) => {
  const { id } = req.params;

  try {
    const removedBooking = await Booking.findByIdAndRemove(id);
    if (!removedBooking) {
      return next(new CustomError(404, "Booking not found!"));
    } else {
      res.status(200).json(removedBooking);
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
