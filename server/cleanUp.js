const dotenv = require("dotenv");
dotenv.config();
const mongoose = require("mongoose");
const moment = require("moment-timezone");
const TimeSlot = require("./models/TimeSlot");
const Booking = require("./models/Booking");

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", (error) => {
  console.error(error);
  process.exit(1); // Exit with an error code
});
db.once("open", async () => {
  console.log("Connected to MongoDB");
  mongoose.connection.close(); // Close the connection after cleanup
});

async function deletePreviousDayData() {
  const currentDateNY = moment.tz("America/New_York").startOf("day");
  const currentDateUTC = moment.utc(
    currentDateNY.format("YYYY-MM-DDTHH:mm:ss")
  );

  await TimeSlot.deleteMany({ date: { $lt: currentDateUTC.toDate() } });
  await Booking.deleteMany({ date: { $lt: currentDateUTC.toDate() } });

  console.log("Deleted previous day timeslots and appointments.");
}

deletePreviousDayData();
