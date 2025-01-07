const express = require("express");
const {
  getSession,
  refreshToken,
  signUp,
  getUser,
  updateUser,
  login,
} = require("../services/userService");

const router = express.Router();

router.get("/session", getSession);
router.post("/refresh", refreshToken);
router.post("/signup", signUp);
router.get("/get-user", getUser);
router.put("/update-user", updateUser);
router.post("/login", login);

module.exports = router;
