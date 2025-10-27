# Quick Start Guide

Get your AI voice call app running in 5 minutes!

## Prerequisites

✅ VoiceERP is running (Docker containers)  
✅ Node.js is installed  
✅ OpenAI API key (optional but recommended)

## Step 1: Install Dependencies

```bash
cd /Users/moniruz/Projects/web/voiceerp/ai-voice-app
npm install
```

## Step 2: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:

```env
OPENAI_API_KEY=sk-your-api-key-here
```

## Step 3: Start the App

```bash
npm start
```

You should see:

```
✅ Server running on http://localhost:3000
```

## Step 4: Make a Test Call

In another terminal:

```bash
npm test
```

Or with a specific number:

```bash
node test-call.js +8801757158044
```

Or using curl:

```bash
curl -X POST http://localhost:3000/api/call \
  -H 'Content-Type: application/json' \
  -d '{"to": "+8801757158044"}'
```

## What Happens

1. **Call Initiated** - VoiceERP makes the call
2. **Greeting** - AI greets the caller with TTS
3. **Listen** - App listens for user input with STT
4. **Process** - User input sent to OpenAI
5. **Respond** - AI response sent back via TTS
6. **Repeat** - Continue until call ends

## Example Conversation

```
🤖 AI: "Hello! This is an AI voice assistant. How can I help you today?"
👤 User: "I need help with my account"
🤖 AI: "I'd be happy to help with your account. Can you provide your account number?"
👤 User: "My account number is 12345"
🤖 AI: "Thank you. I found your account. How can I assist you further?"
```

## Troubleshooting

### Port 3000 already in use

```bash
PORT=3001 npm start
```

### VoiceERP not responding

```bash
# Check if VoiceERP is running
curl http://localhost:3003/health

# Check Docker
docker ps | grep voiceerp
```

### OpenAI API error

1. Verify API key in `.env`
2. Check API key has credits
3. Check rate limits

### Call not connecting

1. Verify phone number is valid
2. Check provider: `ping 103.170.231.10`
3. Check VoiceERP logs: `docker logs voiceerp-api-server-1`

## Next Steps

1. **Customize Greeting** - Edit the greeting text in `server.js`
2. **Add System Prompt** - Customize AI behavior
3. **Store Conversations** - Add database integration
4. **Deploy** - Deploy to production

## File Structure

```
ai-voice-app/
├── server.js           # Main application
├── test-call.js        # Test script
├── package.json        # Dependencies
├── .env.example        # Environment template
├── README.md           # Full documentation
└── QUICKSTART.md       # This file
```

## API Quick Reference

### Make Call

```bash
curl -X POST http://localhost:3000/api/call \
  -H 'Content-Type: application/json' \
  -d '{"to": "+8801757158044"}'
```

### Get Status

```bash
curl http://localhost:3000/api/call/abc123def456
```

### Health Check

```bash
curl http://localhost:3000/health
```

## Environment Variables

```env
# VoiceERP
VOICEERP_API_URL=http://localhost:3003
VOICEERP_TOKEN=5a3e38b5-3188-4936-89c9-fb0df3138b5c
ACCOUNT_SID=9351f46a-678c-43f5-b8a6-d4eb58d131af

# App
PORT=3000
APP_URL=http://localhost:3000

# AI
OPENAI_API_KEY=sk-your-api-key-here
```

## Common Customizations

### Change Greeting

Edit `server.js`, find the greeting section:

```javascript
const greeting = {
  verb: 'say',
  text: 'Hello! This is an AI voice assistant. How can I help you today?',
  // ...
};
```

### Change AI Model

Edit the OpenAI request:

```javascript
model: 'gpt-4',  // Change from gpt-3.5-turbo
```

### Change Voice

Edit the synthesizer:

```javascript
voice: 'en-US-Standard-A',  // Different voice
```

## Support

- Check logs: `docker logs voiceerp-api-server-1`
- Test connectivity: `curl http://localhost:3003/health`
- Review README.md for detailed documentation

---

**You're all set! Your AI voice call app is ready to go! 🚀**

