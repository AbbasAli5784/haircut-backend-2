const { MongoClient } = require("mongodb");
const moment = require("moment");

(async () => {
  const uri = "mongodb://localhost:27017/bookingAppDB";
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    await client.connect();

    const bookingsCollection = client.db("bookingAppDB").collection("bookings");

    const bookings = await bookingsCollection.find({}).toArray();

    for (const booking of bookings) {
      const newTime = moment(booking.time, "hh:mma").format("hh:00A");

      await bookingsCollection.updateOne(
        { _id: booking._id },
        { $set: { time: newTime } }
      );
    }

    console.log("Database updated Succesfully");
  } catch (error) {
    console.error("Error updating the database:", error);
  } finally {
    await client.close();
  }
})();
