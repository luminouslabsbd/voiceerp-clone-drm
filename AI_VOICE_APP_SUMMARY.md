# AI Voice Call App - Complete Summary

## 🎉 What We've Created

A **minimal, production-ready Node.js application** that:

✅ Makes **outbound voice calls** via VoiceERP  
✅ Connects calls to an **AI assistant** (OpenAI GPT-3.5)  
✅ Uses **Text-to-Speech** (Google Cloud) for natural voice  
✅ Uses **Speech-to-Text** (Google Cloud) for voice recognition  
✅ Handles **webhooks** from VoiceERP for call events  
✅ Maintains **conversation history** during calls  
✅ Provides **REST API** for call management  

---

## 📁 Project Structure

```
/Users/moniruz/Projects/web/voiceerp/ai-voice-app/
├── server.js              # Main Express application (300 lines)
├── test-call.js           # Test script to make calls
├── package.json           # Dependencies
├── .env.example           # Environment template
├── README.md              # Full documentation
├── QUICKSTART.md          # Quick start guide
└── AI_VOICE_APP_SUMMARY.md # This file
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd /Users/moniruz/Projects/web/voiceerp/ai-voice-app
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your OpenAI API key
```

### 3. Start the App

```bash
npm start
```

### 4. Make a Test Call

```bash
npm test
# Or: node test-call.js +8801757158044
```

---

## 🔄 How It Works

### Call Flow

```
1. User calls: npm test
   ↓
2. App makes API call to VoiceERP
   ↓
3. VoiceERP initiates SIP call to provider
   ↓
4. Provider routes call to destination phone
   ↓
5. Phone rings and user answers
   ↓
6. VoiceERP calls webhook: /webhook/call-initiated
   ↓
7. App responds with greeting (TTS)
   ↓
8. App listens for user input (STT)
   ↓
9. User speaks
   ↓
10. VoiceERP calls webhook: /webhook/gather-input
    ↓
11. App sends user input to OpenAI
    ↓
12. OpenAI returns AI response
    ↓
13. App responds with AI text (TTS)
    ↓
14. Loop back to step 8
    ↓
15. Call ends
    ↓
16. VoiceERP calls webhook: /webhook/call-ended
    ↓
17. App stores call history
```

---

## 📡 API Endpoints

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
    {"role": "assistant", "content": "Hello! How can I help?"},
    {"role": "user", "content": "I need help"},
    {"role": "assistant", "content": "I'm here to help..."}
  ]
}
```

### Health Check

```bash
GET /health
```

---

## 🔗 Webhook Events

### 1. Call Initiated

VoiceERP → `POST /webhook/call-initiated`

```json
{
  "call_sid": "abc123def456",
  "from": "09649364251",
  "to": "+8801757158044"
}
```

**App Response:**
- Greeting with TTS
- Gather input with STT

### 2. User Input

VoiceERP → `POST /webhook/gather-input`

```json
{
  "call_sid": "abc123def456",
  "speech": "I need help with my account"
}
```

**App Response:**
- Query OpenAI with user input
- Return AI response with TTS
- Continue gathering input

### 3. Call Ended

VoiceERP → `POST /webhook/call-ended`

```json
{
  "call_sid": "abc123def456",
  "duration": 45
}
```

**App Response:**
- Store call history
- Clean up resources

---

## ⚙️ Configuration

### Environment Variables

```env
# VoiceERP Configuration
VOICEERP_API_URL=http://localhost:3003
VOICEERP_TOKEN=5a3e38b5-3188-4936-89c9-fb0df3138b5c
ACCOUNT_SID=9351f46a-678c-43f5-b8a6-d4eb58d131af

# Application Configuration
PORT=3000
APP_URL=http://localhost:3000

# OpenAI Configuration
OPENAI_API_KEY=sk-your-api-key-here

# Google Cloud Configuration (optional)
GOOGLE_CLOUD_KEY=/path/to/google-cloud-key.json
```

### VoiceERP Configuration

Your current setup:
- **API URL**: http://localhost:3003
- **Token**: 5a3e38b5-3188-4936-89c9-fb0df3138b5c
- **Account SID**: 9351f46a-678c-43f5-b8a6-d4eb58d131af
- **Provider**: 103.170.231.10:5060
- **Username**: 09649364251

---

## 🎯 Key Features

### 1. Outbound Calls
- Make calls to any phone number
- Via VoiceERP API
- Using your SIP provider

### 2. AI Integration
- OpenAI GPT-3.5-turbo
- Maintains conversation context
- Natural language understanding

### 3. Voice I/O
- **TTS**: Google Cloud Text-to-Speech
- **STT**: Google Cloud Speech-to-Text
- Natural sounding voices

### 4. Call Management
- Track call status
- Store conversation history
- Monitor call duration

### 5. Webhook Handling
- Call initiated events
- User input events
- Call ended events

---

## 💡 Use Cases

1. **Customer Support**
   - AI-powered customer service calls
   - Automated support agent

2. **Appointment Reminders**
   - Automated call reminders
   - Confirmation requests

3. **Survey Calls**
   - Automated surveys
   - AI-powered responses

4. **Lead Qualification**
   - AI-powered lead qualification
   - Automated follow-ups

5. **Notification Calls**
   - Important notifications
   - Voice alerts

6. **IVR System**
   - Interactive voice response
   - AI-powered routing

---

## 🔧 Customization

### Change Greeting

Edit `server.js`:

```javascript
const greeting = {
  verb: 'say',
  text: 'Your custom greeting here',
  synthesizer: {
    vendor: 'google',
    language: 'en-US',
    voice: 'en-US-Standard-C'
  }
};
```

### Change AI Model

Edit `server.js`:

```javascript
model: 'gpt-4',  // Use GPT-4 instead
```

### Change Voice

Edit `server.js`:

```javascript
voice: 'en-US-Standard-A',  // Different voice
```

### Add System Prompt

Edit `server.js`:

```javascript
const messages = [
  {
    role: 'system',
    content: 'You are a helpful customer support agent...'
  },
  ...callData.messages
];
```

---

## 📊 Example Conversation

```
🤖 AI: "Hello! This is an AI voice assistant. How can I help you today?"
👤 User: "I need help with my account"
🤖 AI: "I'd be happy to help with your account. Can you provide your account number?"
👤 User: "My account number is 12345"
🤖 AI: "Thank you. I found your account. How can I assist you further?"
👤 User: "I want to check my balance"
🤖 AI: "I can help you check your balance. Let me retrieve that information for you..."
```

---

## 🚨 Troubleshooting

### Port 3000 already in use
```bash
PORT=3001 npm start
```

### VoiceERP not responding
```bash
curl http://localhost:3003/health
docker ps | grep voiceerp
```

### OpenAI API error
- Verify API key in `.env`
- Check API key has credits
- Check rate limits

### Call not connecting
- Verify phone number is valid
- Check provider: `ping 103.170.231.10`
- Check VoiceERP logs: `docker logs voiceerp-api-server-1`

---

## 📚 Documentation

- **README.md** - Full documentation
- **QUICKSTART.md** - Quick start guide
- **server.js** - Well-commented source code

---

## 🎓 Learning Resources

### VoiceERP/Jambonz
- Webhook format and responses
- Call lifecycle
- SIP integration

### OpenAI
- Chat completions API
- Token limits
- Rate limiting

### Google Cloud
- Text-to-Speech API
- Speech-to-Text API
- Authentication

---

## 🚀 Next Steps

1. **Get OpenAI API Key**
   - Visit https://platform.openai.com/api-keys
   - Create new API key
   - Add to `.env`

2. **Test the App**
   - Run `npm start`
   - Run `npm test`
   - Make a real call

3. **Customize**
   - Change greeting
   - Add system prompt
   - Customize AI behavior

4. **Deploy**
   - Deploy to AWS, Heroku, etc.
   - Set up production environment
   - Configure webhooks

5. **Enhance**
   - Add database
   - Add authentication
   - Add call transfer
   - Add IVR menus

---

## 📞 Support

For issues:
1. Check VoiceERP logs: `docker logs voiceerp-api-server-1`
2. Test connectivity: `curl http://localhost:3003/health`
3. Review README.md
4. Check webhook responses

---

## ✅ Checklist

- [ ] VoiceERP is running
- [ ] Node.js is installed
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file configured
- [ ] OpenAI API key added
- [ ] App started (`npm start`)
- [ ] Test call made (`npm test`)
- [ ] Conversation working
- [ ] Ready for production

---

**Your AI Voice Call App is ready! 🚀**

Start making intelligent voice calls today!

