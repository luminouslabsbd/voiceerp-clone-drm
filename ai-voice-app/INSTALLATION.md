# Installation Guide

Complete step-by-step installation guide for the AI Voice Call App.

## Prerequisites

Before you start, make sure you have:

- ✅ **VoiceERP running** - All Docker containers must be running
- ✅ **Node.js installed** - v14 or higher
- ✅ **npm installed** - Comes with Node.js
- ✅ **OpenAI API key** - Optional but recommended (get from https://platform.openai.com/api-keys)

## Step 1: Verify Prerequisites

### Check Node.js

```bash
node --version
# Should output: v14.0.0 or higher

npm --version
# Should output: 6.0.0 or higher
```

### Check VoiceERP

```bash
# Check if VoiceERP API is running
curl http://localhost:3003/health

# Should output: {"status":"ok"}
```

If VoiceERP is not running:

```bash
cd /Users/moniruz/Projects/web/voiceerp
docker-compose -f docker-compose-server.yaml up -d
```

## Step 2: Create Project Directory

```bash
cd /Users/moniruz/Projects/web/voiceerp
mkdir -p ai-voice-app
cd ai-voice-app
```

## Step 3: Initialize Project

The project files have already been created. Verify they exist:

```bash
ls -la
# Should show:
# - server.js
# - test-call.js
# - package.json
# - .env.example
# - README.md
# - QUICKSTART.md
```

## Step 4: Install Dependencies

```bash
npm install
```

This will install:
- `express` - Web framework
- `axios` - HTTP client
- `dotenv` - Environment variables
- `uuid` - Unique IDs
- `openai` - OpenAI API client
- `google-cloud-text-to-speech` - TTS
- `google-cloud-speech` - STT

**Expected output:**
```
added 150 packages in 45s
```

## Step 5: Configure Environment

### Copy template

```bash
cp .env.example .env
```

### Edit .env

```bash
# Using nano
nano .env

# Or using vim
vim .env

# Or using your favorite editor
code .env
```

### Required Configuration

Edit `.env` and set these values:

```env
# VoiceERP Configuration (already set)
VOICEERP_API_URL=http://localhost:3003
VOICEERP_TOKEN=5a3e38b5-3188-4936-89c9-fb0df3138b5c
ACCOUNT_SID=9351f46a-678c-43f5-b8a6-d4eb58d131af

# Application Configuration
PORT=3000
APP_URL=http://localhost:3000

# OpenAI Configuration (REQUIRED for AI)
OPENAI_API_KEY=sk-your-api-key-here
```

### Get OpenAI API Key

1. Visit https://platform.openai.com/api-keys
2. Sign in or create account
3. Click "Create new secret key"
4. Copy the key
5. Paste into `.env` as `OPENAI_API_KEY=sk-...`

**Important**: Keep your API key secret! Don't commit `.env` to git.

## Step 6: Verify Configuration

```bash
# Check if .env is properly formatted
cat .env

# Should show your configuration
```

## Step 7: Start the Application

```bash
npm start
```

**Expected output:**

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

Example call:
  curl -X POST http://localhost:3000/api/call \
    -H 'Content-Type: application/json' \
    -d '{"to": "+8801757158044"}'

============================================================
```

If you see this, the app is running successfully! ✅

## Step 8: Test the Application

In a **new terminal**, run:

```bash
cd /Users/moniruz/Projects/web/voiceerp/ai-voice-app
npm test
```

Or with a specific number:

```bash
node test-call.js +8801757158044
```

**Expected output:**

```
============================================================
AI Voice Call Test
============================================================

Making call to: +8801757158044
App URL: http://localhost:3000

1️⃣  Checking if app is running...
   ✅ App is running

2️⃣  Making outbound call...
   ✅ Call initiated successfully
   Call SID: abc123def456

3️⃣  Monitoring call...
   Duration: 5s | Messages: 1
   🤖 Hello! This is an AI voice assistant...
   Duration: 10s | Messages: 2
   👤 I need help...
   Duration: 15s | Messages: 3
   🤖 I'd be happy to help...
   ✅ Call ended

============================================================
Test Complete
============================================================
✅ Call test completed successfully
```

## Step 9: Verify Everything Works

### Check API Health

```bash
curl http://localhost:3000/health
# Should return: {"status":"ok"}
```

### Check VoiceERP Connection

```bash
curl http://localhost:3003/health
# Should return: {"status":"ok"}
```

### Check OpenAI Connection

The app will test OpenAI when you make a call. If it fails, check:
1. API key is correct
2. API key has credits
3. API key is not rate limited

## Troubleshooting

### Port 3000 already in use

```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 npm start
```

### VoiceERP not responding

```bash
# Check if VoiceERP is running
curl http://localhost:3003/health

# If not, start it
cd /Users/moniruz/Projects/web/voiceerp
docker-compose -f docker-compose-server.yaml up -d

# Wait 30 seconds for services to start
sleep 30

# Check again
curl http://localhost:3003/health
```

### OpenAI API error

```
Error: 401 Unauthorized
```

Solutions:
1. Check API key is correct in `.env`
2. Check API key has credits
3. Check API key is not expired
4. Visit https://platform.openai.com/account/api-keys to verify

### npm install fails

```bash
# Clear npm cache
npm cache clean --force

# Try again
npm install
```

### Module not found error

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

1. **Read Documentation**
   - README.md - Full documentation
   - QUICKSTART.md - Quick start guide

2. **Customize the App**
   - Change greeting in `server.js`
   - Add system prompt for AI
   - Customize voice and language

3. **Deploy**
   - Deploy to AWS, Heroku, etc.
   - Set up production environment
   - Configure webhooks

4. **Enhance**
   - Add database for call history
   - Add authentication
   - Add call transfer
   - Add IVR menus

## File Structure

```
ai-voice-app/
├── server.js              # Main application
├── test-call.js           # Test script
├── package.json           # Dependencies
├── package-lock.json      # Locked versions
├── .env                   # Configuration (created)
├── .env.example           # Configuration template
├── node_modules/          # Dependencies (created)
├── README.md              # Full documentation
├── QUICKSTART.md          # Quick start guide
└── INSTALLATION.md        # This file
```

## Verification Checklist

- [ ] Node.js v14+ installed
- [ ] npm installed
- [ ] VoiceERP running
- [ ] Project directory created
- [ ] Dependencies installed
- [ ] .env file configured
- [ ] OpenAI API key added
- [ ] App started successfully
- [ ] Health check passed
- [ ] Test call successful

## Support

If you encounter issues:

1. Check the logs:
   ```bash
   docker logs voiceerp-api-server-1
   ```

2. Test connectivity:
   ```bash
   curl http://localhost:3003/health
   curl http://localhost:3000/health
   ```

3. Review documentation:
   - README.md
   - QUICKSTART.md

4. Check configuration:
   ```bash
   cat .env
   ```

---

**Installation complete! Your AI Voice Call App is ready to use! 🚀**

