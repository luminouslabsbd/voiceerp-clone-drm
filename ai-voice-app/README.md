# AI Voice Call Application

A minimal Node.js application that makes outbound voice calls using VoiceERP and connects them to an AI assistant with TTS (Text-to-Speech), STT (Speech-to-Text), and AI capabilities.

## Features

✅ **Outbound Calls** - Make calls to any phone number via VoiceERP  
✅ **AI Assistant** - Powered by OpenAI GPT-3.5  
✅ **Text-to-Speech** - Google Cloud TTS for natural voice  
✅ **Speech-to-Text** - Google Cloud STT for voice recognition  
✅ **Webhook Integration** - Handles call events from VoiceERP  
✅ **Call Monitoring** - Track call status and conversation history  

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Your AI Voice App                      │
│  (Node.js + Express)                                    │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                    VoiceERP API                          │
│  (Jambonz-based Voice/Telephony Platform)              │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                  SIP Provider                            │
│  (103.170.231.10:5060)                                 │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                  Destination Phone                       │
│  (+8801757158044)                                       │
└─────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **VoiceERP Running** - Docker containers must be running
2. **Node.js** - v14 or higher
3. **OpenAI API Key** - For AI responses (optional, but recommended)
4. **Google Cloud Credentials** - For TTS/STT (optional, VoiceERP has built-in support)

## Installation

### 1. Clone/Create the project

```bash
cd /Users/moniruz/Projects/web/voiceerp
mkdir ai-voice-app
cd ai-voice-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# VoiceERP Configuration
VOICEERP_API_URL=http://localhost:3003
VOICEERP_TOKEN=5a3e38b5-3188-4936-89c9-fb0df3138b5c
ACCOUNT_SID=9351f46a-678c-43f5-b8a6-d4eb58d131af

# Application Configuration
PORT=3000
APP_URL=http://localhost:3000

# OpenAI Configuration (get from https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-your-api-key-here
```

## Usage

### 1. Start the application

```bash
npm start
```

You should see:

```
============================================================
AI Voice Call Application
============================================================

✅ Server running on http://localhost:3000

Configuration:
  VoiceERP API: http://localhost:3003
  Account SID: 9351f46a-678c-43f5-b8a6-d4eb58d131af
  App URL: http://localhost:3000

Endpoints:
  POST /api/call - Make outbound call
  GET /api/call/:call_sid - Get call status
  POST /webhook/call-initiated - Call initiated webhook
  POST /webhook/gather-input - User input webhook
  POST /webhook/call-ended - Call ended webhook

============================================================
```

### 2. Make a test call

In another terminal:

```bash
# Using npm
npm test

# Or with a specific number
node test-call.js +8801757158044

# Or using curl
curl -X POST http://localhost:3000/api/call \
  -H 'Content-Type: application/json' \
  -d '{"to": "+8801757158044"}'
```

### 3. Monitor the call

The app will:
1. ✅ Initiate the call via VoiceERP
2. ✅ Greet the caller with TTS
3. ✅ Listen for user input with STT
4. ✅ Send user input to OpenAI
5. ✅ Respond with AI-generated text via TTS
6. ✅ Continue conversation until call ends

## API Endpoints

### Make Outbound Call

```bash
POST /api/call
Content-Type: application/json

{
  "to": "+8801757158044"
}
```

**Response:**

```json
{
  "success": true,
  "call_sid": "abc123def456",
  "message": "Call initiated successfully"
}
```

### Get Call Status

```bash
GET /api/call/:call_sid
```

**Response:**

```json
{
  "call_sid": "abc123def456",
  "from": "09649364251",
  "to": "+8801757158044",
  "duration": 45,
  "messages": [
    {
      "role": "assistant",
      "content": "Hello! This is an AI voice assistant. How can I help you today?"
    },
    {
      "role": "user",
      "content": "I need help with my account"
    },
    {
      "role": "assistant",
      "content": "I'd be happy to help with your account. Can you provide your account number?"
    }
  ]
}
```

### Health Check

```bash
GET /health
```

## Webhook Events

### Call Initiated

VoiceERP calls `POST /webhook/call-initiated` when a call starts:

```json
{
  "call_sid": "abc123def456",
  "from": "09649364251",
  "to": "+8801757158044"
}
```

### User Input

VoiceERP calls `POST /webhook/gather-input` when user speaks:

```json
{
  "call_sid": "abc123def456",
  "speech": "I need help with my account"
}
```

### Call Ended

VoiceERP calls `POST /webhook/call-ended` when call ends:

```json
{
  "call_sid": "abc123def456",
  "duration": 45
}
```

## Configuration

### VoiceERP Settings

Your current VoiceERP configuration:

```
API URL: http://localhost:3003
Token: 5a3e38b5-3188-4936-89c9-fb0df3138b5c
Account SID: 9351f46a-678c-43f5-b8a6-d4eb58d131af
Provider: 103.170.231.10:5060
Username: 09649364251
```

### TTS/STT Vendors

The app uses:
- **TTS**: Google Cloud Text-to-Speech
- **STT**: Google Cloud Speech-to-Text
- **AI**: OpenAI GPT-3.5-turbo

You can change these in the webhook responses.

## Troubleshooting

### App won't start

```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill the process
kill -9 <PID>

# Try a different port
PORT=3001 npm start
```

### VoiceERP connection error

```bash
# Check if VoiceERP is running
curl http://localhost:3003/health

# Check Docker containers
docker ps | grep voiceerp
```

### Call not connecting

1. Check VoiceERP logs: `docker logs voiceerp-api-server-1`
2. Verify phone number is valid
3. Check provider connectivity: `ping 103.170.231.10`

### OpenAI API error

1. Verify API key is correct
2. Check API key has credits
3. Check rate limits

## Development

### Run with auto-reload

```bash
npm run dev
```

### View logs

```bash
# VoiceERP API logs
docker logs voiceerp-api-server-1 -f

# Feature Server logs
docker logs voiceerp-feature-server-1 -f

# SBC logs
docker logs voiceerp-drachtio-sbc-1 -f
```

## Next Steps

1. **Customize AI Behavior** - Edit the system prompt in `server.js`
2. **Add Database** - Store call history and conversations
3. **Add Authentication** - Secure your API endpoints
4. **Deploy** - Deploy to production (AWS, Heroku, etc.)
5. **Add More Features** - Call transfer, IVR menus, etc.

## Example Use Cases

1. **Customer Support** - AI-powered customer service calls
2. **Appointment Reminders** - Automated call reminders
3. **Survey Calls** - Automated surveys with AI responses
4. **Lead Qualification** - AI-powered lead qualification calls
5. **Notification Calls** - Important notifications via voice

## License

MIT

## Support

For issues or questions:
1. Check VoiceERP logs
2. Review webhook responses
3. Test with curl commands
4. Check OpenAI API status

