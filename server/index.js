const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const bookingRoutes = require("./routes/bookings");
const app = express();
const userRoutes = require("./routes/users");
const servicesRoute = require("./routes/services");

dotenv.config();

app.use(express.json());
app.use(cors());

app.use("/services", servicesRoute);
app.use("/api/bookings", bookingRoutes);
app.use("/api/users", userRoutes);
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({ message: err.message });
});

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", (error) => console.error(error));
db.once("open", () => console.log("Connected to MongoDB"));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
