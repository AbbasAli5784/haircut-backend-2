const express = require("express");
const mongoose = require("mongoose");

const cors = require("cors");
const dotenv = require("dotenv");
const bookingRoutes = require("./routes/bookings");
const userRoutes = require("./routes/users");
const servicesRoute = require("./routes/services");
const timeslotRoutes = require("./routes/timeslotRoutes");
const moment = require("moment");
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
  for (let day = 0; day < 7; day++) {
    const date = moment().add(day, "days").startOf("day");
    // new Date(date).toUTCString();
    // Loop over each hour from 9AM to 5PM.
    for (let hour = 9; hour < 17; hour++) {
      // Format the time in a 12-hour format
      const time = moment({ hour }).format("hh:mmA");

      // Create a new date object for the current day and hour
      const dateTime = moment(date).add(hour, "hours").toDate();

      // Check if a time slot with the specified date and time already exists.
      const existingTimeSlot = await TimeSlot.findOne({ date: dateTime });
      if (!existingTimeSlot) {
        // If it doesn't exist, create the time slot.
        const newTimeSlot = new TimeSlot({ date: dateTime, time });
        await newTimeSlot.save();
      }
    }
  }
}
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
