/**
 * AI Voice Call Application
 * Minimal server for handling voice calls with TTS, STT, and AI
 */

const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
app.use(express.json());

// Configuration
const VOICEERP_API_URL = process.env.VOICEERP_API_URL || 'http://localhost:3003';
const VOICEERP_TOKEN = process.env.VOICEERP_TOKEN || '5a3e38b5-3188-4936-89c9-fb0df3138b5c';
const ACCOUNT_SID = process.env.ACCOUNT_SID || '9351f46a-678c-43f5-b8a6-d4eb58d131af';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GOOGLE_CLOUD_KEY = process.env.GOOGLE_CLOUD_KEY;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const PORT = process.env.PORT || 3000;

// Store active calls
const activeCalls = new Map();

/**
 * Webhook: Call initiated
 * VoiceERP calls this when a call is initiated
 */
app.post('/webhook/call-initiated', (req, res) => {
  const { call_sid, from, to } = req.body;

  console.log(`📞 Call initiated: ${call_sid}`);
  console.log(`   From: ${from}, To: ${to}`);

  // Store call info
  activeCalls.set(call_sid, {
    call_sid,
    from,
    to,
    startTime: new Date(),
    messages: [],
    greetingSentAt: new Date().toISOString()
  });

  // Return initial greeting
  const greeting = {
    verb: 'say',
    text: 'Hello! This is an AI voice assistant. How can I help you today?',
    synthesizer: {
      vendor: 'google',
      language: 'en-US',
      voice: 'en-US-Standard-C'
    }
  };

  // Log greeting message
  console.log(`🎤 FIRST GREETING MESSAGE SENT`);
  console.log(JSON.stringify({
    callSid: call_sid,
    from,
    to,
    greetingText: greeting.text,
    vendor: greeting.synthesizer.vendor,
    language: greeting.synthesizer.language,
    voice: greeting.synthesizer.voice,
    server: 'api-server-webhook',
    timestamp: new Date().toISOString(),
    source: 'call-initiated-webhook'
  }, null, 2));

  res.json([greeting, {
    verb: 'gather',
    numDigits: 1,
    timeout: 5,
    actionHook: `${APP_URL}/webhook/gather-input`,
    recognizer: {
      vendor: 'google',
      language: 'en-US'
    }
  }]);
});

/**
 * Webhook: Gather user input (speech recognition)
 * VoiceERP calls this when user speaks
 */
app.post('/webhook/gather-input', async (req, res) => {
  const { call_sid, speech } = req.body;
  
  console.log(`🎤 User said: ${speech}`);
  
  const callData = activeCalls.get(call_sid);
  if (!callData) {
    return res.status(404).json({ error: 'Call not found' });
  }

  // Store user message
  callData.messages.push({
    role: 'user',
    content: speech
  });

  try {
    // Get AI response using OpenAI
    const aiResponse = await getAIResponse(callData.messages);
    
    console.log(`🤖 AI response: ${aiResponse}`);
    
    // Store AI message
    callData.messages.push({
      role: 'assistant',
      content: aiResponse
    });

    // Return response with TTS
    const response = {
      verb: 'say',
      text: aiResponse,
      synthesizer: {
        vendor: 'google',
        language: 'en-US',
        voice: 'en-US-Standard-C'
      }
    };

    res.json([response, {
      verb: 'gather',
      numDigits: 1,
      timeout: 5,
      actionHook: `${APP_URL}/webhook/gather-input`,
      recognizer: {
        vendor: 'google',
        language: 'en-US'
      }
    }]);

  } catch (error) {
    console.error('Error getting AI response:', error);
    res.json([{
      verb: 'say',
      text: 'Sorry, I encountered an error. Please try again.',
      synthesizer: {
        vendor: 'google',
        language: 'en-US',
        voice: 'en-US-Standard-C'
      }
    }]);
  }
});

/**
 * Webhook: Call ended
 * VoiceERP calls this when call ends
 */
app.post('/webhook/call-ended', (req, res) => {
  const { call_sid, duration } = req.body;
  
  console.log(`📞 Call ended: ${call_sid}`);
  console.log(`   Duration: ${duration}s`);
  
  const callData = activeCalls.get(call_sid);
  if (callData) {
    console.log(`   Messages exchanged: ${callData.messages.length}`);
    activeCalls.delete(call_sid);
  }

  res.json({ status: 'ok' });
});

/**
 * API: Make outbound call
 * POST /api/call
 * Body: { to: '+8801757158044', message: 'Hello, this is a test call' }
 */
app.post('/api/call', async (req, res) => {
  const { to, message, carrier } = req.body;

  if (!to) {
    return res.status(400).json({ error: 'Missing "to" parameter' });
  }

  try {
    // Make call via VoiceERP API
    // Pass 'from' as a string (phone number) - the register_from_domain from the carrier config should be used
    const trunkName = carrier || 'Bangladesh SIP Provider';
    const callResponse = await axios.post(
      `${VOICEERP_API_URL}/v1/Accounts/${ACCOUNT_SID}/Calls`,
      {
        from: '09649364251',
        to: {
          type: 'phone',
          number: to,
          trunk: trunkName
        },
        speech_synthesis_vendor: 'google',
        speech_synthesis_language: 'en-US',
        speech_synthesis_voice: 'en-US-Standard-C',
        speech_recognizer_vendor: 'google',
        speech_recognizer_language: 'en-US',
        call_hook: `${APP_URL}/webhook/call-initiated`,
        call_status_hook: `${APP_URL}/webhook/call-ended`
      },
      {
        headers: {
          'Authorization': `Bearer ${VOICEERP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const callSid = callResponse.data.sid || callResponse.data.call_sid;
    console.log(`✅ Call initiated: ${callSid}`);

    res.json({
      success: true,
      call_sid: callSid,
      message: 'Call initiated successfully'
    });

  } catch (error) {
    console.error('Error making call:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to initiate call',
      details: error.response?.data || error.message
    });
  }
});

/**
 * API: Get call status
 * GET /api/call/:call_sid
 */
app.get('/api/call/:call_sid', (req, res) => {
  const { call_sid } = req.params;
  const callData = activeCalls.get(call_sid);

  if (!callData) {
    return res.status(404).json({ error: 'Call not found' });
  }

  res.json({
    call_sid,
    from: callData.from,
    to: callData.to,
    duration: Math.floor((new Date() - callData.startTime) / 1000),
    messages: callData.messages
  });
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/**
 * Get AI response using OpenAI
 */
async function getAIResponse(messages) {
  if (!OPENAI_API_KEY) {
    return 'I am an AI assistant, but OpenAI API key is not configured.';
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 150,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error.response?.data || error.message);
    return 'I encountered an error processing your request.';
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log('AI Voice Call Application');
  console.log(`${'='.repeat(60)}`);
  console.log(`\n✅ Server running on http://localhost:${PORT}`);
  console.log(`\nConfiguration:`);
  console.log(`  VoiceERP API: ${VOICEERP_API_URL}`);
  console.log(`  Account SID: ${ACCOUNT_SID}`);
  console.log(`  App URL: ${APP_URL}`);
  console.log(`\nEndpoints:`);
  console.log(`  POST /api/call - Make outbound call`);
  console.log(`  GET /api/call/:call_sid - Get call status`);
  console.log(`  POST /webhook/call-initiated - Call initiated webhook`);
  console.log(`  POST /webhook/gather-input - User input webhook`);
  console.log(`  POST /webhook/call-ended - Call ended webhook`);
  console.log(`\nExample call:`);
  console.log(`  curl -X POST http://localhost:${PORT}/api/call \\`);
  console.log(`    -H 'Content-Type: application/json' \\`);
  console.log(`    -d '{"to": "+8801757158044"}'`);
  console.log(`\n${'='.repeat(60)}\n`);
});

module.exports = app;

