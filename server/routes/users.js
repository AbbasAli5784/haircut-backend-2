const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { auth, isAdmin } = require("../routes/auth");
const { check, validationResult } = require("express-validator");
const CustomError = require("../../CustomError");

//get all users
router.get("/all-users", auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//User registration
router.post(
  "/register",
  [
    check("username", "Username is required").notEmpty(),
    check("email", "Email is required").isEmail(),
    check(
      "password",
      "Password is required and should be at least 6 characters "
    ).isLength({ min: 6 }),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { username, email, password } = req.body;

    //Check if email already exists
    const existingEmail = await User.findOne({ email });
    const existingUserName = await User.findOne({ username });

    if (existingEmail) {
      return next(new CustomError(400, "Email already in use"));
    }
    if (existingUserName) {
      return next(new CustomError(400, "Username already exists!"));
    }

    //Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    //Create a new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role: "user",
    });

    try {
      await newUser.save();
      res.status(201).json({ message: "User regiestered succesfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.put(
  "/:userId/role",
  auth,
  isAdmin,
  [check("newRole", "Invalid role").isIn(["user", "admin"])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { userId } = req.params;
    const { newRole } = req.body;
    try {
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      user.role = newRole;
      await user.save();

      res.status(200).json({ message: "User role updated succesfully" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    //Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return next(new CustomError(400, "User not found"));
    }

    //Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return next(new CustomError(400, "Incorrect password!"));
    }

    //Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );
    res.status(200).json({ token });
  } catch (error) {
    next(new CustomError(500, error.message));
  }
});

module.exports = router;
