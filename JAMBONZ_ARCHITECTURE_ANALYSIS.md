# Jambonz Architecture Analysis: Why Direct SIP Works But VoiceERP Calls Fail

## Executive Summary

You're experiencing a **routing difference** between:
1. **Direct SIP calls** (working) - You send SIP INVITE directly to provider
2. **VoiceERP calls** (failing with 480) - Calls go through Jambonz feature server

The issue is **NOT** with your SIP credentials or the provider connection. Both paths authenticate successfully. The problem is in **how VoiceERP routes the call through its internal architecture**.

---

## Architecture Overview

### Direct SIP Call Flow (WORKING ✅)
```
Your Script
    ↓
Direct SIP INVITE to 103.170.231.10:5060
    ↓
Provider receives INVITE
    ↓
Provider authenticates (401 → 407 with Digest Auth)
    ↓
Your script sends INVITE with credentials
    ↓
Provider responds: 100 Trying → 180 Ringing
    ↓
✅ Call succeeds (you receive it)
```

### VoiceERP Call Flow (FAILING ❌)
```
Your App (AI Voice App)
    ↓
POST /v1/Accounts/{sid}/Calls to API Server
    ↓
API Server routes to Feature Server
    ↓
Feature Server executes "rest:dial" task
    ↓
Feature Server creates SIP INVITE
    ↓
Drachtio SBC sends INVITE to provider
    ↓
Provider responds: 100 Trying → 480 Temporarily Unavailable
    ↓
❌ Call fails
```

---

## Key Difference: SIP Headers & Routing

### What Direct SIP Sends
```
INVITE sip:+8801757158044@103.170.231.10 SIP/2.0
From: <sip:09649364251@103.170.231.10>
To: <sip:+8801757158044@103.170.231.10>
Contact: <sip:your-ip:5060>
Authorization: Digest username="09649364251", realm="103.170.231.10", ...
```

### What VoiceERP Sends (via Drachtio SBC)
```
INVITE sip:+8801757158044@103.170.231.10 SIP/2.0
From: <sip:09649364251@drachtio-sbc-ip>  ← DIFFERENT!
To: <sip:+8801757158044@103.170.231.10>
Contact: <sip:drachtio-sbc-ip:5060>      ← DIFFERENT!
X-Account-Sid: 9351f46a-678c-43f5-b8a6-d4eb58d131af
X-CID: ...
P-Asserted-Identity: ...
Authorization: Digest username="09649364251", realm="103.170.231.10", ...
```

---

## Root Cause Analysis

The provider's SIP server is likely configured with **strict routing rules** that:

1. **Validate the Contact header** - Expects calls from specific IP addresses
2. **Check the From domain** - May not accept calls from SBC IP addresses
3. **Validate SIP headers** - May reject calls with extra headers (X-Account-Sid, etc.)
4. **Rate limiting** - May have different rules for different source IPs
5. **Firewall rules** - May only allow specific IPs to send calls

### Why 480 Error?
- **480 Temporarily Unavailable** typically means the provider's routing logic rejected the call
- It's NOT a destination number issue (both direct and VoiceERP use same number)
- It's NOT an authentication issue (both get past 401/407 challenges)
- It's a **routing/validation issue** at the provider's SIP server

---

## Solution Options

### Option 1: Configure SIP Gateway in Jambonz (RECOMMENDED)
Instead of using LCR (Least Cost Routing), create a **SIP Gateway** that:
- Sends calls directly from Drachtio SBC to provider
- Preserves your credentials
- Maintains proper SIP headers

**Steps:**
1. In Jambonz database, create a SIP Gateway entry
2. Configure it to route calls to `103.170.231.10:5060`
3. Set authentication credentials
4. Update your application to use this gateway

### Option 2: Contact Your SIP Provider
Ask them:
- "Why do direct SIP calls work but calls from our SBC fail with 480?"
- "What IP addresses should we whitelist?"
- "Do you have strict routing rules for the From/Contact headers?"
- "Can you check your logs for calls from [your-drachtio-sbc-ip]?"

### Option 3: Configure Drachtio SBC
Modify Drachtio SBC configuration to:
- Use your IP address in Contact header (not SBC IP)
- Remove extra headers that provider doesn't recognize
- Use specific routing rules for this provider

---

## Code References

### VoiceERP REST Dial Implementation
**File:** `jambonz-feature-server/lib/tasks/rest_dial.js`

The `TaskRestDial` class handles outbound calls via REST API. It:
1. Creates SIP INVITE through Drachtio SBC
2. Adds X-Account-Sid and other headers
3. Routes through configured gateways/LCR
4. Receives 480 error from provider

### Dial Task Implementation
**File:** `jambonz-feature-server/lib/tasks/dial.js`

The `TaskDial` class handles regular dial operations. Key differences:
- Uses `placeCall()` function to route calls
- Looks up carrier/gateway from database
- Adds X-Requested-Carrier-Sid header
- Routes through SBC proxy

---

## Recommended Next Steps

1. **Check Drachtio SBC logs** for the exact SIP headers being sent
2. **Compare headers** between direct SIP and VoiceERP calls
3. **Contact provider** with specific header differences
4. **Test with SIP Gateway** instead of LCR routing
5. **Verify provider's firewall** allows your Drachtio SBC IP

---

## Files to Investigate

- `/lib/tasks/rest_dial.js` - REST dial implementation
- `/lib/tasks/dial.js` - Regular dial implementation
- `/lib/utils/place-outdial.js` - Call placement logic
- Database: `sip_gateways` table - Gateway configuration
- Database: `lcr` table - Least Cost Routing configuration

