const { OpenAI } = require('openai');
const logger = require('../utils/logger');

const SYSTEM_PROMPT = `You are Voltova AI, a helpful assistant built into the Voltova EV Charging Finder app for Australian electric vehicle drivers.

You help users with:
- Finding and comparing EV charging stations across Australia (Chargefox, Evie Networks, Tesla, NRMA, BP Pulse, Ampol AmpCharge, Jolt, ChargePoint, etc.)
- Explaining connector types: Type 2 (AC, most common in Australia), CCS2 (DC fast charging), CHAdeMO (DC, older Nissan/Mitsubishi standard), Tesla Supercharger (Tesla vehicles), Wall Outlet (Level 1)
- Estimating charging times based on battery capacity (kWh), charger level (Level 1 ≈ 1.4 kW, Level 2 ≈ 7.2 kW, DC Fast ≈ 50–350 kW), and current battery percentage
- Route planning advice for long EV trips: where to stop, how much to charge, range anxiety tips
- General EV knowledge: range factors, battery health, home charging setup, electricity tariffs

Guidelines:
- Be concise, friendly, and practical. Keep responses under 200 words unless a detailed explanation is genuinely needed.
- Use Australian context: AUD pricing, Australian states/cities, Australian charging networks.
- For real-time station availability or exact locations, direct users to the app's map view — you don't have live data.
- Do not invent specific station addresses, prices, or real-time availability.
- If asked something completely unrelated to EVs, politely redirect.`;

let _client = null;

const getClient = () => {
  if (!_client) {
    _client = new OpenAI({
      apiKey:  process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }
  return _client;
};

const streamChatResponse = async (messages, res) => {
  const apiKey = process.env.GROQ_API_KEY;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    res.write(`data: ${JSON.stringify({ content: 'AI service is not configured. Please add a valid GROQ_API_KEY to the backend .env file.' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  const stream = await getClient().chat.completions.create({
    model:       'llama-3.3-70b-versatile',
    messages:    [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    stream:      true,
    max_tokens:  400,
    temperature: 0.7,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) {
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  res.write('data: [DONE]\n\n');
  res.end();
  logger.info(`AI chat: streamed response (${messages.length} messages in context)`);
};

module.exports = { streamChatResponse };
