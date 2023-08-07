const jwt = require("jsonwebtoken");
const CustomError = require("../../CustomError");
const User = require("../models/User");

const auth = async (req, res, next) => {
  const bearerToken = req.header("authorization");
  // console.log("Bearer Token: ", bearerToken);
  // console.log("All headers: ", req.headers);

  if (!bearerToken) {
    //Implemented the custom error class here as i believe it keeps the code more organized and smooth
    return next(
      new CustomError(401, "Authorization denied, please acquire a token.")
    );
    // return res.status(401).json({ message: "No token autorization denied" });
  }

  const token = bearerToken.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch the user from the database using the userId
    const user = await User.findById(decoded.userId);

    if (!user) {
      return next(new CustomError(401, "Invalid token, user not found."));
    }

    req.user = {
      userId: user._id, // Change this to user._id if the ID is stored like this
      role: user.role,
      email: user.email,
    };
    next();
  } catch (error) {
    //Not quite sure if this change is correct, id assume it may not be correct because the code below made it seem like it was an expected error, however since this is in
    // a try catch block i assumed that the catch part is reserved for unexpected errors, therefore i added in the next() callback function instead having it catch any unexpected errors.
    next(error);
    //res.status(400).json({ message: "Token is not valid" });
  }
};

const isAdmin = (req, res, next) => {
  console.log("User role:", req.user.role);
  if (req.user.role !== "admin") {
    // This seems to be an expected error so i decided to use my custom middleware for it as its the more clean and organized method

    return next(
      new CustomError(403, "Access denied, Admin privelages required!")
    );
    // return res
    //   .status(403)
    //   .json({ message: "Access denied. Required admin privelages required " });
  }
  next();
};

module.exports = { auth, isAdmin };
