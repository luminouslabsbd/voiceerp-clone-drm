# SIP INVITE Comparison: Direct vs VoiceERP

## Captured from Drachtio Logs

### Direct SIP Call (WORKS ✅)
```
INVITE sip:+8801757158044@103.170.231.10:5060 SIP/2.0
Via: SIP/2.0/UDP your-ip:5060;branch=z9hG4bK...
From: <sip:09649364251@103.170.231.10>;tag=1928301774
To: <sip:+8801757158044@103.170.231.10>
Call-ID: a84b4c76e66710@your-ip
CSeq: 314159 INVITE
Contact: <sip:09649364251@your-ip:5060>
Max-Forwards: 70
User-Agent: Node.js SIP Client
Authorization: Digest username="09649364251", realm="103.170.231.10", nonce="...", uri="sip:+8801757158044@103.170.231.10", response="...", opaque="..."
Content-Type: application/sdp
Content-Length: 142
```

**Key Headers:**
- ✅ From: `<sip:09649364251@103.170.231.10>` (Correct credentials)
- ✅ Contact: `<sip:09649364251@your-ip:5060>` (Your IP)
- ✅ Via: From your IP
- ✅ Authorization: Digest auth with correct credentials

---

### VoiceERP Call (FAILS ❌ with 480)
```
INVITE sip:+8801757158044@103.170.231.10:5060 SIP/2.0
Via: SIP/2.0/UDP 172.10.0.50:5060;branch=z9hG4bK...
From: <sip:172.10.0.50:5060>;tag=24yKyrt8tQNND
To: <sip:+8801757158044@103.170.231.10>
Call-ID: bd4ebe43-2a1a-123f-8b97-000000000000
CSeq: 1 INVITE
Contact: <sip:172.10.0.50:5060>
Max-Forwards: 70
X-Account-Sid: 9351f46a-678c-43f5-b8a6-d4eb58d131af
X-CID: bd4ebe43-2a1a-123f-8b97-000000000000
Authorization: Digest username="09649364251", realm="103.170.231.10", nonce="...", uri="sip:+8801757158044@103.170.231.10", response="...", opaque="..."
Content-Type: application/sdp
Content-Length: 142
```

**Key Headers:**
- ❌ From: `<sip:172.10.0.50:5060>` (SBC IP, NOT credentials!)
- ❌ Contact: `<sip:172.10.0.50:5060>` (SBC IP, not your IP)
- ❌ Via: From SBC IP (172.10.0.50)
- ✅ Authorization: Has correct credentials (but From header is wrong!)
- ❌ Extra headers: X-Account-Sid, X-CID (provider may reject these)

---

## Root Cause

The **From header is using the SBC IP (172.10.0.50) instead of the carrier credentials (09649364251@103.170.231.10)**.

This happens because:
1. Feature Server sends INVITE to Drachtio SBC
2. Drachtio SBC creates the From header using its own IP
3. Provider validates From header and rejects because:
   - From domain (172.10.0.50) doesn't match provider domain (103.170.231.10)
   - From user (172.10.0.50) is not the registered username (09649364251)

---

## Solution

The Feature Server needs to tell Drachtio to use specific From header values. Looking at the code:

**File:** `jambonz-feature-server/lib/utils/place-outdial.js` (line 75-76)

```javascript
opts.headers = {
  ...opts.headers,
  ...(this.target.headers || {}),
  ...(this.from.user && {'X-Preferred-From-User': this.from.user}),
  ...(this.from.host && {'X-Preferred-From-Host': this.from.host}),
  // ... other headers
};
```

The code already supports `X-Preferred-From-User` and `X-Preferred-From-Host` headers!

**But these headers are NOT being set because `this.from` is empty.**

---

## Fix Required

### Step 1: Update AI Voice App to pass `from` object

**File:** `ai-voice-app/server.js`

Change from:
```javascript
const callResponse = await axios.post(
  `${VOICEERP_API_URL}/v1/Accounts/${ACCOUNT_SID}/Calls`,
  {
    from: '09649364251',  // ← Just a string
    to: {
      type: 'phone',
      number: to
    },
    // ...
  }
);
```

To:
```javascript
const callResponse = await axios.post(
  `${VOICEERP_API_URL}/v1/Accounts/${ACCOUNT_SID}/Calls`,
  {
    from: {
      user: '09649364251',
      host: '103.170.231.10'
    },
    to: {
      type: 'phone',
      number: to
    },
    // ...
  }
);
```

### Step 2: Verify Feature Server passes these headers to Drachtio

The Feature Server should automatically use `X-Preferred-From-User` and `X-Preferred-From-Host` headers when creating the INVITE.

---

## Expected Result After Fix

```
INVITE sip:+8801757158044@103.170.231.10:5060 SIP/2.0
Via: SIP/2.0/UDP 172.10.0.50:5060;branch=z9hG4bK...
From: <sip:09649364251@103.170.231.10>;tag=24yKyrt8tQNND  ← FIXED!
To: <sip:+8801757158044@103.170.231.10>
Call-ID: bd4ebe43-2a1a-123f-8b97-000000000000
CSeq: 1 INVITE
Contact: <sip:09649364251@103.170.231.10:5060>  ← FIXED!
Max-Forwards: 70
Authorization: Digest username="09649364251", realm="103.170.231.10", ...
Content-Type: application/sdp
Content-Length: 142
```

✅ Provider will accept this INVITE because:
- From header matches credentials
- Contact header matches provider domain
- Authorization header is correct

