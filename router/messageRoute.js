const express = require('express');
const router = express.Router();
const { createMessage, getMessagesByTicketId } = require('../controller/messageController');
const { protect } = require('../middleware/authMiddleware');

// Route to create a new message for a specific ticket
router.post('/tickets/:ticketId/messages', protect, createMessage);

// Route to get all messages for a specific ticket
router.get('/tickets/:ticketId/messages', protect, getMessagesByTicketId);

module.exports = router;