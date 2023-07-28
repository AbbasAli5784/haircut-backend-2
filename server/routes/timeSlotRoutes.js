const express = require("express");
const router = express.Router();
const Timeslot = require("../models/Timeslot");
const { auth, isAdmin } = require("../routes/auth");
const { check, validationResult } = require("express-validator");

router.put(
  "/:id",
  auth,
  isAdmin,
  [check("status", "Invalid Status").isIn(["available", "blocked"])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { id } = req.params;
    const { status } = req.body;

    try {
      const timeslot = await Timeslot.findById(id);
      if (!timeslot) {
        return res.status(404).json({ message: "TimeSlot not found " });
      }
      timeslot.status = status;
      await timeslot.save();

      res.status(200).json({ message: "Timeslot status updated successfully" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

router.get("/", auth, isAdmin, async (req, res) => {
  try {
    const timeslots = await Timeslot.find();
    res.json(timeslots);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/date/:date", auth, isAdmin, async (req, res) => {
  try {
    const date = new Date(req.params.date);
    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + 1);

    const timeslots = await Timeslot.find({
      date: {
        $gte: date,
        $lt: nextDate,
      },
    });

    res.json(timeslots);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:time/block", auth, isAdmin, async (req, res) => {
  const { time } = req.params;
  console.log("User:", req.user);
  const adminId = "6420ffdfed8d816c855aa500"; // Assume the ID of the admin is in req.user._id

  try {
    const timeslot = await Timeslot.findOne({ date: new Date(time) });
    if (!timeslot) {
      return res.status(404).json({ message: "Timeslot not found " });
    }
    timeslot.status = "blocked";
    timeslot.adminId = adminId; // Store the ID of the admin who blocked this timeslot.
    await timeslot.save();

    res.status(200).json({ message: "Timeslot blocked successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
