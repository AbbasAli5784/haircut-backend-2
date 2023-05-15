const express = require("express");
const { route } = require("./bookings");
const router = express.Router();

const services = [
  { id: 1, name: "Haircut" },
  { id: 2, name: "Haircut + Beard" },
  { id: 3, name: "Lineup" },
];

router.get("/", async (req, res) => {
  try {
    res.status(200).json(services);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
