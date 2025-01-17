import mongoose from "mongoose";
const Schema = mongoose.Schema;

// Basic schema for the user registration
const userRegisterSchema = new Schema({
  name: {
    type: String,
    required: true,
    maxLength: 100,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  userName: {
    type: String,
    required: true,
    maxLength: 100,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const UserReg = mongoose.model("newUserReg", userRegisterSchema);

export default UserReg;
