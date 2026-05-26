const express = require('express');
const router = express.Router();
const { chat } = require('../controllers/aiController');
const { aiLimiter } = require('../middleware/rateLimiter');

router.post('/chat', aiLimiter, chat);

module.exports = router;
