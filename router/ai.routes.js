
const express = require("express");
const router = express.Router();

const { chatWithAI } = require("../controller/ai.controller");

router.post("/chat", chatWithAI);

module.exports = router;
