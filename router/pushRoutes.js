
const express = require("express");
const router = express.Router();
const {protect}= require("../middleware/authMiddleware")


// Replace these imports with the auth middleware used in your project.
const { registerAdminToken } = require("../controller/pushController");

router.post("/register", protect, registerAdminToken);

module.exports = router;
