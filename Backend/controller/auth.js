const { validationResult, Result } = require("express-validator");
const USER = require("../models/user");
const jwt = require("jsonwebtoken");

const bcrypt = require("bcryptjs");
const { helper } = require("../helper/helper");

exports.signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation errors");
    error.statusCode = 422;
    error.data = errors.array();

    throw error;
  }
  const email = req.body.email;
  const name = req.body.name;
  const password = req.body.password;
  console.log(email, name, password);
  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new USER({ email, name, password: hashedPassword });
    const result = await user.save();

    res.status(200).json({ message: "User created", userId: result._id });
  } catch (err) {
    helper(err, next);
  }
};

exports.login = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  try {
    const user = await USER.findOne({ email: email });
    if (!user) {
      const error = new Error("no user found with this email");
      error.statusCode = 401;
      throw error;
    }

    const isEqual = await bcrypt.compare(password, user.password);

    if (!isEqual) {
      const error = new Error("You entered a wrong password");
      error.statusCode = 401;
      throw error;
    }

    const token = jwt.sign(
      {
        email: user.email,
        userId: user._id.toString(),
      },
      "secret",
      { expiresIn: "1h" }
    );

    res.status(200).json({ token, userId: user._id.toString() });
  } catch (err) {
    helper(err, next);
  }
};
