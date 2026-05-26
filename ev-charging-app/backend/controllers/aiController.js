const { streamChatResponse } = require('../services/aiService');
const logger = require('../utils/logger');

/**
 * @desc    Stream an AI chat response from OpenAI
 * @route   POST /api/v1/ai/chat
 * @access  Public
 */
const chat = async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'messages array is required' });
    }

    // Sanitise: keep only recognised roles, truncate long content, limit history
    const sanitised = messages
      .filter((m) => m.role && m.content && ['user', 'assistant'].includes(m.role))
      .slice(-20)
      .map((m) => ({ role: m.role, content: String(m.content).slice(0, 2000) }));

    if (sanitised.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid messages provided' });
    }

    await streamChatResponse(sanitised, res);
  } catch (err) {
    logger.error(`AI chat error: ${err.message}`);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'AI service unavailable' });
    } else {
      try {
        res.write(`data: ${JSON.stringify({ content: '\n\n[Error: AI service interrupted]' })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      } catch (_) { /* already closed */ }
    }
  }
};

module.exports = { chat };
