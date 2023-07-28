const express = require("express");
const { restart } = require("nodemon");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const Booking = require("../models/Booking");
const { auth, isAdmin } = require("../routes/auth");
const CustomError = require("../../CustomError");
const { startOfDay, endOfDay } = require("date-fns");
const moment = require("moment-timezone");
const nodemailer = require("nodemailer");
const User = require("../models/User");

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
    check("service", "Service is not selected").notEmpty(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const authUser = await User.findById(req.user._id);

    const { date, time, service, user } = req.body;

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
      const savedBooking = await newBooking.save();

      console.log("Saved booking:", savedBooking);

      // Create Transporter
      const transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        auth: {
          user: "emilia.bode@ethereal.email",
          pass: "F1YwHsm8tBHTCuvQb1",
        },
      });

      // Send Email
      console.log("Logging user email", req.user);
      let info = await transporter.sendMail({
        from: '"MEENCUTZ INC" <abbasali5784@gmail.com>',
        to: req.user.email, // Use req.user.email instead of getting email from req.body
        subject: "Booking Confirmation",
        text: `Your booking has been confirmed! Service: ${service}, Date: ${date}, Time: ${time}.`,
        html: `<p>Your booking has been confirmed! Service: ${service}, Date: ${date}, Time: ${time}.</p>`,
      });

      res.status(201).json(savedBooking);
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
);

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

// Booking Confirmation
router.post("/booking-confirmation", auth, async (req, res) => {
  try {
    const { email, service, date, time } = req.body; // Assuming these details are coming in the request body

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "User does not exist" });
    }

    // Create Transporter
    const transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      auth: {
        user: "itzel41@ethereal.email",
        pass: "tuc5fkxZayG2mMYssM",
      },
    });

    // Send Email
    let info = await transporter.sendMail({
      from: '"MEENCUTZ INC" <abbasali5784@gmail.com>',
      to: email,
      subject: "Booking Confirmation",
      text: `Your booking has been confirmed! Service: ${service}, Date: ${date}, Time: ${time}.`,
      html: `<p>Your booking has been confirmed! Service: ${service}, Date: ${date}, Time: ${time}.</p>`,
    });

    res.status(200).json({ message: "Booking confirmation email sent" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred", details: error.message });
  }
});

module.exports = router;
