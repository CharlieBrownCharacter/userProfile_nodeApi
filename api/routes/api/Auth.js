import UserRegSchema from "../../models/UserRegisterSchema.js";
import express from "express";
import bcrypt from "bcryptjs";
import jsonwt from "jsonwebtoken";
import { secret } from "../../setup/constants.js";
import passport from "passport";

export const router = express.Router();

const jwtTokenGeneration = function (payload) {
  const token = jsonwt.sign(payload, secret, { expiresIn: 3600 });
  return token;
};

const registration = async function (req, res) {
  const newUser = new UserRegSchema({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    userName: req.body.userName,
  });
  const salt = await bcrypt.genSalt(10);
  const hashpassword = await bcrypt.hash(newUser.password, salt);
  newUser.password = hashpassword;
  const userSignup = await newUser.save();

  const payloadForJwt = {
    id: userSignup.id,
    name: userSignup.name,
    email: userSignup.email,
  };

  const jwtToken = await jwtTokenGeneration(payloadForJwt);
  res.status(200).json({
    success: true,
    token: jwtToken,
  });
};

// @type    POST
// @route   /api/auth/register
// @desc    route for registration of users
// @access  PUBLIC

router.post("/register", (req, res) => {
  UserRegSchema.findOne({ email: req.body.email })
    .then((user) => {
      if (user) {
        res.status(404).json({ message: "Entered email already exists" });
      } else {
        // If email doesn't exists in records
        registration(req, res);
      }
    })
    .catch((error) => console.log(`Registration error: ${error}`));
});

// @type    POST
// @route    /api/auth/login
// @desc    route for login of registered users
// @access  PUBLIC

router.post("/login", (req, res) => {
  const password = req.body.password;
  const email = req.body.email;
  UserRegSchema.findOne({ email })
    .then((user) => {
      if (user) {
        bcrypt
          .compare(password, user.password)
          .then((correctPassword) => {
            if (!correctPassword) {
              return res.status(401).json({ message: "User login failure" });
            }

            const payload = {
              id: user.id,
              name: user.name,
              email: user.email,
            };

            // Generate jwt token and send it back to client
            jsonwt.sign(payload, secret, { expiresIn: 3600 }, (err, token) => {
              res.json({
                success: true,
                token: token,
              });
            });
          })
          .catch((error) => {
            console.log(`Error with passwords: ${error}`);
          });
      } else {
        return res.status(404).json({ message: "Email doesn't exists" });
      }
    })
    .catch((error) => {
      console.log(`Error while login: ${error}`);
    });
});

// @type    GET
//@route    /api/auth/profile
// @desc    route for user profile
// @access  PRIVATE (authenticated using jwt token)

router.get(
  "/profile",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    res.status(200).json({
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
    });
  }
);

// @type    POST
//@route    /api/auth/update
// @desc    route for user profile update of oldpassword with new password
// @access  PRIVATE (authenticated using jwt token)

router.post(
  "/update",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const userEmail = req.body.email;
    const oldPassword = req.body.oldPassword;
    let newPassword = req.body.password;

    UserRegSchema.find({ email: userEmail }).then((user) => {
      if (user) {
        bcrypt
          .compare(oldPassword, user[0].password)
          .then((correctPassword) => {
            if (!correctPassword) {
              return res
                .status(401)
                .json({ profileUpdate: "Your old password does not match" });
            }

            // Generated hash of the new password

            bcrypt.genSalt(10, function (err, salt) {
              bcrypt.hash(newPassword, salt, function (hasherr, hash) {
                if (hasherr) throw hasherr;
                newPassword = hash;

                // Update the password in the database
                UserRegSchema.updateOne(
                  { email: userEmail },
                  { $set: { password: newPassword } }
                )
                  .then((data) => {
                    if (!data) {
                      res.status(404).send({
                        passwordUpdateMessage: `Cannot update the password`,
                      });
                    } else
                      res.send({
                        passwordUpdateMessage: "Password was updated successfully.",
                      });
                  })
                  .catch((err) => {
                    res.status(500).send({
                      passwordUpdateMessage: "Error updating password=" + err,
                    });
                  });
              });
            });
          })
          .catch((error) => {
            console.log(`Error with the user object ${error}`);
          });
      } else {
        return res
          .status(404)
          .json({ emailRegistrationError: "Email doesn't exists" });
      }
    });
  }
);
