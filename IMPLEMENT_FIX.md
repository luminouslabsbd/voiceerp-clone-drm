# Implement the Fix: Complete Step-by-Step

## Overview
We'll create a SIP Gateway that routes calls directly to your provider with proper headers.

---

## Step 1: Check Current Database State

```bash
# Check if voip_carrier exists
docker exec voiceerp-mysql-1 mysql -u jambones -pjambones jambones -e "
SELECT voip_carrier_sid, name, account_sid FROM voip_carriers 
WHERE account_sid='9351f46a-678c-43f5-b8a6-d4eb58d131af';
"

# Check if sip_gateway exists
docker exec voiceerp-mysql-1 mysql -u jambones -pjambones jambones -e "
SELECT sip_gateway_sid, ipv4, port, username FROM sip_gateways 
WHERE account_sid='9351f46a-678c-43f5-b8a6-d4eb58d131af';
"

# Check current LCR setup
docker exec voiceerp-mysql-1 mysql -u jambones -pjambones jambones -e "
SELECT lcr_sid, account_sid FROM lcr 
WHERE account_sid='9351f46a-678c-43f5-b8a6-d4eb58d131af';
"
```

---

## Step 2: Create VOIP Carrier (if needed)

```bash
docker exec voiceerp-mysql-1 mysql -u jambones -pjambones jambones << 'EOF'
-- Check if carrier already exists
SELECT @carrier_sid := voip_carrier_sid FROM voip_carriers 
WHERE account_sid='9351f46a-678c-43f5-b8a6-d4eb58d131af' LIMIT 1;

-- If not, create it
INSERT INTO voip_carriers (
  voip_carrier_sid,
  account_sid,
  name,
  requires_register,
  register_sip_realm,
  register_username,
  register_password
) SELECT
  UUID(),
  '9351f46a-678c-43f5-b8a6-d4eb58d131af',
  'Bangladesh SIP Provider',
  0,
  '103.170.231.10',
  '09649364251',
  '335577'
WHERE NOT EXISTS (
  SELECT 1 FROM voip_carriers 
  WHERE account_sid='9351f46a-678c-43f5-b8a6-d4eb58d131af'
);

-- Get the carrier SID for next step
SELECT voip_carrier_sid FROM voip_carriers 
WHERE account_sid='9351f46a-678c-43f5-b8a6-d4eb58d131af';
EOF
```

---

## Step 3: Create SIP Gateway

```bash
# First, get the carrier SID
CARRIER_SID=$(docker exec voiceerp-mysql-1 mysql -u jambones -pjambones jambones -N -e "
SELECT voip_carrier_sid FROM voip_carriers 
WHERE account_sid='9351f46a-678c-43f5-b8a6-d4eb58d131af' LIMIT 1;
")

echo "Using Carrier SID: $CARRIER_SID"

# Now create the SIP gateway
docker exec voiceerp-mysql-1 mysql -u jambones -pjambones jambones << EOF
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
  sip_realm,
  account_sid
) VALUES (
  UUID(),
  '$CARRIER_SID',
  '103.170.231.10',
  5060,
  1,
  1,
  0,
  '09649364251',
  '335577',
  '103.170.231.10',
  '9351f46a-678c-43f5-b8a6-d4eb58d131af'
);

-- Verify it was created
SELECT sip_gateway_sid, ipv4, port, username FROM sip_gateways 
WHERE voip_carrier_sid='$CARRIER_SID';
EOF
```

---

## Step 4: Update Your Application

Edit `/Users/moniruz/Projects/web/voiceerp/ai-voice-app/server.js`:

Find the `makeCall` function and update it:

```javascript
async function makeCall(to) {
  try {
    // Get AI response using OpenAI
    const aiResponse = await getAIResponse([
      {
        role: 'user',
        content: `Make a call to ${to}`
      }
    ]);
    
    console.log(`📞 Making call to ${to}`);
    
    // Make call via VoiceERP API
    const callResponse = await axios.post(
      `${VOICEERP_API_URL}/v1/Accounts/${ACCOUNT_SID}/Calls`,
      {
        from: '09649364251',
        to: {
          type: 'phone',
          number: to,
          trunk: 'Bangladesh SIP Provider'  // ← ADD THIS LINE
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
    
    console.log(`✅ Call initiated: ${callResponse.data.call_sid}`);
    return callResponse.data;
  } catch (error) {
    console.error('❌ Error making call:', error.response?.data || error.message);
    throw error;
  }
}
```

---

## Step 5: Restart Services

```bash
# Restart the AI Voice App
cd /Users/moniruz/Projects/web/voiceerp/ai-voice-app
npm start

# In another terminal, restart Feature Server to reload database
docker restart voiceerp-feature-server-1

# Wait for services to be ready
sleep 5
```

---

## Step 6: Test the Call

```bash
# Make a test call
cd /Users/moniruz/Projects/web/voiceerp/ai-voice-app
node test-call.js +8801757158044

# Or use curl
curl -X POST http://localhost:3000/api/make-call \
  -H "Content-Type: application/json" \
  -d '{"to": "+8801757158044"}'
```

---

## Step 7: Monitor Logs

```bash
# Watch Feature Server logs
docker logs voiceerp-feature-server-1 -f | grep -i "rest:dial\|100 trying\|480"

# Watch API Server logs
docker logs voiceerp-api-server-1 -f | grep -i "call\|dial"

# Watch Drachtio logs
docker logs voiceerp-drachtio-fs-1 -f | grep -i "invite\|from\|contact"
```

---

## Step 8: Verify Success

You should see:
- ✅ Call initiated message
- ✅ 100 Trying response from provider
- ✅ 180 Ringing response
- ✅ Call connects
- ✅ You receive the call

---

## Troubleshooting

### If Still Getting 480 Error

1. **Check gateway was created:**
```bash
docker exec voiceerp-mysql-1 mysql -u jambones -pjambones jambones -e "
SELECT * FROM sip_gateways WHERE ipv4='103.170.231.10';
"
```

2. **Check carrier was created:**
```bash
docker exec voiceerp-mysql-1 mysql -u jambones -pjambones jambones -e "
SELECT * FROM voip_carriers WHERE name='Bangladesh SIP Provider';
"
```

3. **Check trunk name matches:**
```bash
docker exec voiceerp-mysql-1 mysql -u jambones -pjambones jambones -e "
SELECT name FROM voip_carriers WHERE account_sid='9351f46a-678c-43f5-b8a6-d4eb58d131af';
"
```

4. **Capture SIP traffic:**
```bash
tcpdump -i any -n 'port 5060' -w /tmp/sip.pcap
# Make a call
node test-call.js +8801757158044
# Analyze
tcpdump -r /tmp/sip.pcap -A | grep -A 10 "INVITE"
```

---

## If It Works! 🎉

Congratulations! Your VoiceERP calls are now working!

Next steps:
1. Test with different numbers
2. Test with different times
3. Monitor call quality
4. Set up proper logging
5. Configure call recording if needed

---

## Database Cleanup (if needed)

If you need to remove the gateway and start over:

```bash
docker exec voiceerp-mysql-1 mysql -u jambones -pjambones jambones << 'EOF'
-- Delete SIP gateway
DELETE FROM sip_gateways WHERE ipv4='103.170.231.10';

-- Delete VOIP carrier
DELETE FROM voip_carriers WHERE name='Bangladesh SIP Provider';
EOF
```

