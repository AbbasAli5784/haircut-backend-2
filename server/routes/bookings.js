const express = require("express");

const router = express.Router();
const { check, validationResult } = require("express-validator");
const Booking = require("../models/Booking");
const { auth, isAdmin } = require("../routes/auth");
const CustomError = require("../../CustomError");
const { startOfDay, endOfDay } = require("date-fns");
const moment = require("moment-timezone");
const dotenv = require("dotenv");
dotenv.config();
const nodemailer = require("nodemailer");
const sgTransport = require("nodemailer-sendgrid-transport");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const User = require("../models/User");
const TimeSlot = require("../models/TimeSlot");

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
  auth, // Include the auth middleware here
  [
    check("date", "Date is required").isISO8601(),
    check("time", "Time is required").matches(
      /^((0[0-9]|1[0-2]):[0-5][0-9](AM|PM))$/i
    ),
    check("service", "Service is required").notEmpty(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { service, date, time, user } = req.body;

    console.log("Request Body:", req.body);

    // Check if timeslot is available
    const timeslot = await TimeSlot.findOne({ date, time });
    console.log("Test:", date);
    console.log("Test2:", time);
    if (!timeslot || timeslot.status !== "available") {
      return res
        .status(400)
        .json({ message: "The selected timeslot is not available" });
    }

    // Proceed with booking
    const bookingDateTime = moment.tz(
      `${date} ${time}`,
      "YYYY-MM-DD hh:mma",
      "America/New_York"
    );

    console.log("User info:", req.user, "Username:");
    const newBooking = new Booking({
      user: {
        id: req.user.userId,
        name: user.name, // Accessing name and phone from user object in req.body
        phone: user.phone,
      },
      date: date,
      time: time,
      service: service,
    });

    console.log("Booking info:", newBooking);

    try {
      // Save the booking
      const savedBooking = await newBooking.save();

      // Update the timeslot status
      timeslot.status = "blocked";
      timeslot.booked = true;
      await timeslot.save();

      // The rest of the code
    } catch (err) {
      console.error(err);
      next(err);
    }
    return res.status(200).json({ message: "success" });
  }
);

//Retrive user bookings
router.get("/mybookings", auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ "user.id": req.user.userId });
    return res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get("/fully-booked-dates", async (req, res, next) => {
  console.log("Test message");
  try {
    // Looping through all the Booking objects
    const bookings = await Booking.find({});
    console.log("Bookings", bookings);
    //Using the reduce function to loop through the booking objects
    const fullyBookedDates = bookings.reduce((acc, curr) => {
      /* using the current object variable from the reduce function to isolate the date 
      and using ISOString   to remove the access that comes with 
       Pulling a date, storing this value within the date variable.*/
      const date = curr.date.toISOString().split("T")[0];

      /*Running an if else statement to help organize how many bookings each date has, if a booking already exists in the database
      Than we increment by 1, if there is no previous mention of this date than we set its value from one and if it reoccurs in the
      Databse than we increment it by 1, this step is vital as we are looking to isolate dates that have 8 bookings*/
      if (acc[date]) {
        acc[date]++;
      } else {
        acc[date] = 1;
      }
      return acc;
    }, {});

    console.log("bookedDates Value:", fullyBookedDates);
    // Filtering through the fullBookedDates to isolate only dates that have 8 bookings so that they can be greyed out in the front end
    const fullyBookedDatesArray = Object.keys(fullyBookedDates).filter(
      (date) => fullyBookedDates[date] >= 8
    );

    res.status(200).json(fullyBookedDatesArray);
  } catch (err) {
    console.log("Error", err);
    return next(new CustomError(400, "Invalid date format!"));
  }
});

router.get("/booked", async (req, res) => {
  try {
    const fullyBooked = await Booking.find({});
    console.log("All Booked Times", fullyBooked);
    return res
      .status(200)
      .json({ message: "Here are the bookings", data: fullyBooked });
  } catch (err) {
    console.error("error", err);
  }

  return res.status(200).json({ message: "Here are the bookings" });
});

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

//Update A Booking time
router.put("/:id", async (req, res) => {
  try {
    const { date, time, name, phoneNumber, service } = req.body;

    console.log("Put Request Body", req.body);

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (date && time) {
      const newTimeslot = await TimeSlot.findOne({ date, time });
      if (!newTimeslot || newTimeslot.status !== "available") {
        return res
          .status(400)
          .json({ message: "The selected new timeslot is not available" });
      }

      const oldTimeslot = await TimeSlot.findOne({
        date: booking.date,
        time: booking.time,
      });

      oldTimeslot.status = "available";
      oldTimeslot.booked = false;
      await oldTimeslot.save();

      newTimeslot.status = "blocked";
      newTimeslot.booked = true;
      await newTimeslot.save();

      booking.date = date;
      booking.time = time;
    }

    booking.user.name = name || booking.user.name;
    booking.user.phone = phoneNumber || booking.user.phone;
    booking.service = service || booking.service;

    await booking.save();

    res.status(200).json({ message: "Booking updated successfully", booking });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Remove a booking

router.delete("/:id", async (req, res) => {
  try {
    // Find the booking in the database using the id
    const booking = await Booking.findById(req.params.id);

    // If booking is not found, return a 404 status code
    if (!booking) {
      return res.status(404).json({ message: "Booking not found " });
    }

    // Find the timeslot with corresponding date and time
    const timeslot = await TimeSlot.findOne({
      date: booking.date,
      time: booking.time,
    });

    // If timeslot is not found, return a 404 status code
    if (!timeslot) {
      return res.status(404).json({ message: "Timeslot not found " });
    }

    // Update the status of the timeslot to "available" and save the changes
    timeslot.status = "available";
    timeslot.booked = false;
    await timeslot.save();

    // Delete the booking
    await Booking.deleteOne({ _id: booking._id });

    // Return a success message
    res
      .status(200)
      .json({ message: "Booking deleted and Timeslot updated successfully" });
  } catch (err) {
    // If there's an error, return it
    res.status(500).json({ message: err.message });
  }
});

// Booking Confirmation
router.post("/booking-confirmation", auth, async (req, res) => {
  try {
    const { email, service, date, time } = req.body; // Assuming these details are coming in the request body

    console.log("Request Body Confirmation:", req.body);
    // Check if user exists
    const user = await User.findOne({ email });
  
    if (!user) {
      return res.status(400).json({ error: "User does not exist" });
    }

    // Create Transporter
    const msg = {
      to: [email, "abbasali5784@gmail.com"],
      from: "bookings@meencutz.com",
      templateId: "d-b6415612ac014a0089f418fac6d8986f",
      dynamicTemplateData: {
        name: user.name,
        service: service,
        date: date,
        time: time,
      },
    };

    await sgMail.send(msg);

    console.log("Success");

    res.status(200).json({ message: "Booking confirmation email sent" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred", details: error.message });
  }
});

router.put(
  "/unblock/:time",
  auth,
  isAdmin,
  [
    check("time", "Invalid Time").matches(
      /^((0[0-9]|1[0-2]):[0-5][0-9](AM|PM))$/i
    ),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { time } = req.params;

    try {
      const timeslot = await TimeSlot.findOne({
        date: new Date(),
        time: time,
      });

      if (!timeslot) {
        return res.status(404).json({ message: "TimeSlot not found" });
      }

      timeslot.status = "available";
      await timeslot.save();

      res.status(200).json({ message: "Timeslot status updated successfully" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;
