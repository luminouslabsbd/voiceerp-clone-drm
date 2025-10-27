# How to Fix VoiceERP Calls: Step-by-Step Guide

## Problem Summary
- ✅ Direct SIP calls work (you receive them)
- ❌ VoiceERP calls fail with 480 error
- **Root Cause:** SIP headers/routing difference between direct SIP and Jambonz SBC

---

## Solution: Configure SIP Gateway Instead of LCR

### Step 1: Check Current Configuration

```bash
# SSH into your server and check current setup
docker exec voiceerp-mysql-1 mysql -u jambones -pjambones jambones -e "
SELECT * FROM sip_gateways WHERE account_sid='9351f46a-678c-43f5-b8a6-d4eb58d131af';
"

docker exec voiceerp-mysql-1 mysql -u jambones -pjambones jambones -e "
SELECT * FROM lcr WHERE account_sid='9351f46a-678c-43f5-b8a6-d4eb58d131af';
"
```

### Step 2: Create a SIP Gateway Entry

If no SIP gateway exists, create one:

```bash
docker exec voiceerp-mysql-1 mysql -u jambones -pjambones jambones << 'EOF'
-- First, get or create a voip_carrier
SELECT * FROM voip_carriers WHERE account_sid='9351f46a-678c-43f5-b8a6-d4eb58d131af';

-- If no carrier exists, create one:
INSERT INTO voip_carriers (
  voip_carrier_sid,
  account_sid,
  name,
  requires_register,
  register_sip_realm,
  register_username,
  register_password
) VALUES (
  UUID(),
  '9351f46a-678c-43f5-b8a6-d4eb58d131af',
  'My SIP Provider',
  0,
  '103.170.231.10',
  '09649364251',
  '335577'
);

-- Then create SIP gateway
INSERT INTO sip_gateways (
  sip_gateway_sid,
  voip_carrier_sid,
  ipv4,
  port,
  inbound,
  outbound,
  register,
  username,
  password,
  sip_realm
) VALUES (
  UUID(),
  (SELECT voip_carrier_sid FROM voip_carriers WHERE account_sid='9351f46a-678c-43f5-b8a6-d4eb58d131af' LIMIT 1),
  '103.170.231.10',
  5060,
  1,
  1,
  0,
  '09649364251',
  '335577',
  '103.170.231.10'
);
EOF
```

### Step 3: Update Your Application

Modify your AI Voice App to specify the carrier/gateway:

**File:** `/Users/moniruz/Projects/web/voiceerp/ai-voice-app/server.js`

```javascript
// In the makeCall function, add trunk parameter:
const callResponse = await axios.post(
  `${VOICEERP_API_URL}/v1/Accounts/${ACCOUNT_SID}/Calls`,
  {
    from: '09649364251',
    to: {
      type: 'phone',
      number: to,
      trunk: 'My SIP Provider'  // ← ADD THIS LINE
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
```

### Step 4: Test the Call

```bash
cd /Users/moniruz/Projects/web/voiceerp/ai-voice-app
node test-call.js +8801757158044
```

---

## Alternative: Debug SIP Headers

If the above doesn't work, capture the actual SIP headers:

```bash
# Enable SIP tracing in Drachtio
docker exec voiceerp-drachtio-fs-1 drachtio-cli -s 127.0.0.1:9022 -c "trace sip all"

# Make a call
cd /Users/moniruz/Projects/web/voiceerp/ai-voice-app
node test-call.js +8801757158044

# Check logs
docker logs voiceerp-drachtio-fs-1 | grep -A 20 "INVITE"
```

---

## What This Does

1. **Creates a SIP Gateway** that knows how to reach your provider
2. **Stores credentials** securely in database
3. **Routes calls** directly to provider IP (103.170.231.10:5060)
4. **Preserves SIP headers** properly for provider's validation
5. **Bypasses LCR** which may be adding extra headers

---

## If Still Failing

Contact your SIP provider with this information:

```
We're using Jambonz (open-source CPaaS platform) with Drachtio SBC.
- Direct SIP calls work: INVITE from [your-ip]:5060 → 100 Trying → Success
- VoiceERP calls fail: INVITE from [drachtio-sbc-ip]:5060 → 100 Trying → 480

Can you check:
1. Do you have IP whitelist rules?
2. Do you validate Contact/From headers strictly?
3. Can you check logs for calls from [drachtio-sbc-ip]?
4. What's different between the two call types?
```

---

## Key Files to Understand

- **REST Dial Task:** `jambonz-feature-server/lib/tasks/rest_dial.js`
- **Dial Task:** `jambonz-feature-server/lib/tasks/dial.js`
- **Call Placement:** `jambonz-feature-server/lib/utils/place-outdial.js`
- **Database Schema:** `voiceerp-api-server/db/jambones-sql.sql`

