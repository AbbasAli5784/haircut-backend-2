const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const bookingRoutes = require("./routes/bookings");
const userRoutes = require("./routes/users");
const servicesRoute = require("./routes/services");
const timeslotRoutes = require("./routes/timeslotRoutes");
const moment = require("moment");
const momentTz = require("moment-timezone");

const TimeSlot = require("./models/TimeSlot");
// You need to adjust the path to your TimeSlot model

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

app.use("/services", servicesRoute);
app.use("/api/bookings", bookingRoutes);
app.use("/api/users", userRoutes);
app.use("/api/timeslots", timeslotRoutes);

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", (error) => console.error(error));
db.once("open", () => {
  console.log("Connected to MongoDB");
  // Run the createTimeSlots function once the MongoDB connection is open.
  createTimeSlots();
});

async function createTimeSlots() {
  // Loop over each day for the next 7 days.
  const timezone = "America/New_York";
  for (let day = 0; day < 365; day++) {
    const date = moment.tz(timezone).add(day, "days").startOf("day");
    // Loop over each hour from 12PM to 11PM.
    for (let hour = 12; hour <= 23; hour++) {
      // Format the time in a 12-hour format
      const time = moment({ hour }).tz(timezone).format("hh:mmA");

      // Create a new date object for the current day and hour in the America/New_York timezone
      const dateTimeNY = moment(date).add(hour, "hours").tz(timezone);
      
      // Convert the date to UTC without changing the hour
      const dateTimeUTC = moment.utc(dateTimeNY.format("YYYY-MM-DDTHH:mm:ss"));

      // Check if a time slot with the specified date and time already exists.
      const existingTimeSlot = await TimeSlot.findOne({ date: dateTimeUTC.toDate() });
      if (!existingTimeSlot) {
        // If it doesn't exist, create the time slot.
        const newTimeSlot = new TimeSlot({ date: dateTimeUTC.toDate(), time });
        await newTimeSlot.save();
      }
    }
  }
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
