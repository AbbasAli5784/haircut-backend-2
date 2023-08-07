// Import the necessary libraries and modules
const express = require("express");
const router = express.Router();
const TimeSlot = require("../models/TimeSlot"); // Import TimeSlot model
const Booking = require("../models/Booking"); // Import Booking model
const { auth, isAdmin } = require("../routes/auth"); // Import auth middleware and isAdmin function
const { check, validationResult } = require("express-validator"); // Import express-validator for validating inputs

// Create a PUT request route for updating the status of a specific timeslot
router.put(
  "/:id",
  auth, // Use the auth middleware to ensure the user is authenticated
  isAdmin, // Use the isAdmin function to ensure the user is an admin
  [check("status", "Invalid Status").isIn(["available", "blocked"])], // Validate that the status is either "available" or "blocked"
  async (req, res) => {
    // Perform validation on the request
    const errors = validationResult(req);
    // If there are validation errors, return a 400 status code with the errors
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Extract id from request parameters and status from request body
    const { id } = req.params;
    const { status } = req.body;

    try {
      // Find the timeslot in the database using the id
      const timeslot = await TimeSlot.findById(id);

      // If timeslot is not found, return a 404 status code
      if (!timeslot) {
        return res.status(404).json({ message: "TimeSlot not found " });
      }

      // Check if there is a booking for this timeslot
      const booking = await Booking.findOne({
        date: timeslot.date,
        time: timeslot.time,
      });

      // If a booking exists and the admin is trying to make it available, return an error
      if (booking && status === "available") {
        return res.status(400).json({
          message:
            "This timeslot is already booked, cannot change status to available",
        });
      }

      // If a booking exists and the admin is trying to block it, delete the booking
      if (booking && status === "blocked") {
        await Booking.deleteOne({ _id: booking._id });
      }

      // Update the status of the timeslot and save the changes
      timeslot.status = status;
      await timeslot.save();

      // Return a success message
      res.status(200).json({ message: "Timeslot status updated successfully" });
    } catch (err) {
      // If there's an error, return it
      res.status(500).json({ message: err.message });
    }
  }
);

// Create a GET request route for fetching all timeslots
router.get("/", async (req, res) => {
  try {
    // Retrieve all timeslots from the database
    const timeslots = await TimeSlot.find({});
    // Send the timeslots as a response
    return res
      .status(200)
      .json({ message: "Here is your data", data: timeslots });
    console.log("Endpoint hit succesfully");
  } catch (err) {
    // If there's an error, return it
    res.status(500).json({ message: err.message });
  }
});

// Create a GET request route for fetching timeslots by a specific date
router.get("/date/:date", async (req, res) => {
  try {
    // Convert the provided date string into a Date object
    const date = new Date(req.params.date);
    // Create a new Date object for the next day
    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + 1);
    console.log("Next Date:", nextDate);

    // Retrieve all timeslots that occur between the provided date and the next day
    const timeslots = await TimeSlot.find({
      date: {
        $gte: date,
        $lt: nextDate,
      },
    });

    // Send the timeslots as a response
    res.json(timeslots);
  } catch (err) {
    // If there's an error, return it
    res.status(500).json({ message: err.message });
  }
});

// Create a PUT request route for blocking a timeslot
router.put("/:id/block", auth, isAdmin, async (req, res) => {
  // const { id } = req.params; // Extract id from request parameters
  // Assume the ID of the admin is in req.user._id
  // const adminId = "6420ffdfed8d816c855aa500";
  await TimeSlot.updateOne(
    { _id: req.params.id, status: "available" },
    { status: "blocked" }
  );
  res.json({ message: "Time slot Blocked" });
});

// return res.status(200).json({ message: "Endpoint hit" });

// try {
//   // Find the timeslot with the specific time
//   const timeslot = await TimeSlot.findOne({ date: new Date(time) });

//   // If timeslot is not found, return a 404 status code
//   if (!timeslot) {
//     return res.status(404).json({ message: "Timeslot not found " });
//   }

//   // Update the status of the timeslot to "blocked", store the ID of the admin who blocked it, and save the changes
//   timeslot.status = "blocked";
//   timeslot.adminId = adminId;
//   await timeslot.save();

//   // Return a success message
//   res.status(200).json({ message: "Timeslot blocked successfully" });
// } catch (err) {
//   // If there's an error, return it
//   res.status(500).json({ message: err.message });
// }

// Create a GET request route for fetching all timeslots for a day
router.get("/day/:date", async (req, res) => {
  try {
    // Convert the provided date string into a Date object
    const date = new Date(req.params.date);
    // Create a new Date object for the next day
    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + 1);

    // Retrieve all timeslots that occur between the provided date and the next day
    const timeslots = await TimeSlot.find({
      date: {
        $gte: date,
        $lt: nextDate,
      },
    });

    // Initialize an array to hold all the timeslots for the day
    // Initialize an array to hold all the timeslots for the day
    let allTimeslots = [];
    // Loop through each hour of the day from 9AM to 5PM
    for (let i = 9; i < 17; i++) {
      // Create a new Date object for the current hour
      const newDate = new Date(date);
      newDate.setHours(i);
      newDate.setMinutes(0);
      newDate.setSeconds(0);

      // Check if a timeslot exists at the current hour
      const isBooked = timeslots.some(
        (ts) => ts.date.getHours() === newDate.getHours()
      );

      // Add the timeslot to the array with the appropriate status
      allTimeslots.push({
        date: newDate,
        status: isBooked ? "booked" : "available",
      });
    }

    // Send the timeslots as a response
    res.json(allTimeslots);
  } catch (err) {
    // If there's an error, return it
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id/available", async (req, res) => {
  // Remove any bookings for the given time where the status is "blocked".
  await TimeSlot.updateOne(
    { _id: req.params.id, status: "blocked" },
    { status: "available" }
  );
  res.json({ message: "Time slot unblocked" });
});

router.get("/date/:date/blocked", async (req, res) => {
  // Fetch all bookings for the given date where the status is "blocked".
  const bookings = await Booking.find({
    date: req.params.date,
    status: "blocked",
  });

  // Extract the time of each booking and return it.
  const times = bookings.map((booking) => booking.time);
  return res.json(times);
});

// Export the router to be used in the application
module.exports = router;
