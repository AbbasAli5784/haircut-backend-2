const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const sgMail = require("@sendgrid/mail");
const sgTransport = require("nodemailer-sendgrid-transport");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const { auth, isAdmin } = require("../routes/auth");
const { check, validationResult } = require("express-validator");
const CustomError = require("../../CustomError");

//Password reset request

router.post("/request-password-reset", async (req, res) => {
  try {
    const { email } = req.body;
    console.log("Test 1");
    //Check if user exists
    const user = await User.findOne({ email });
    console.log("Test 2");
    if (!user) {
      return res.status(400).json({ error: "User does not exist" });
    }
    console.log("Test 3");

    //Generate a password reset token
    const resetToken = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    //Create Transporter
    const resetLink = `http://${req.headers.host}/reset-password?token=${resetToken}`;
    console.log("Reset Link:", resetLink);
    const msg = {
      to: [email, "abbasali5784@gmail.com"],
      from: "bookings@meencutz.com",
      templateId: "d-56d8ee0c81fb4279aeb4f818837c4f36",
      dynamicTemplateData: {
        resetLink: resetLink,
      },
    };

    //Send Email
    await sgMail.send(msg);

    console.log("Success");

    res.status(200).json({ message: "Password reset email sent" });
    console.log("Reset Token: ", resetToken);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred", details: error.message });
  }
});

//Password Reset

router.post("/reset-password", async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    //Verify the token
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);

    //Has the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    //Update the user's password
    await User.updateOne({ _id: decoded._id }, { password: hashedPassword });

    res.status(200).json({ message: "Password reset succesful" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred", details: error.message });
  }
});

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
      return res.status(400).json({ message: "User not found" });
    }

    //Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect Password" });
    }

    //Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role, userEmail: user.email },
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
