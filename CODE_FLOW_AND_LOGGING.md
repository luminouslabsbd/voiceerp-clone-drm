# Code Flow and Logging Guide

## Complete Code Flow

### 1. AI Voice App Makes Call
**File:** `/Users/moniruz/Projects/web/voiceerp/ai-voice-app/server.js` (Line 173-176)

```javascript
{
  from: {
    user: '09649364251',
    host: '103.170.231.10'
  },
  to: { ... }
}
```

**What to look for in logs:**
```
POST /v1/Accounts/.../Calls
Body: { from: { user: '09649364251', host: '103.170.231.10' }, ... }
```

---

### 2. API Server Receives Request
**File:** `voiceerp-api-server/lib/routes/api/accounts.js` (Line 947)

```javascript
request({
  url: serviceUrl,
  method: 'POST',
  json: true,
  body: Object.assign(req.body, {account_sid: sid})
}, ...)
```

The API server passes the entire request body (including the `from` object) to the Feature Server.

**What to look for in logs:**
```
Sending createCall POST to Feature Server
Body includes: from: { user: '09649364251', host: '103.170.231.10' }
```

---

### 3. Feature Server REST Dial Task
**File:** `jambonz-feature-server/lib/tasks/rest_dial.js` (Line 13-16)

```javascript
this.from = this.data.from;  // Receives {user: '09649364251', host: '103.170.231.10'}
this.callerName = this.data.callerName;
this.timeLimit = this.data.timeLimit;
this.fromHost = this.data.fromHost;
```

**What to look for in logs:**
```
REST Dial task created
from: { user: '09649364251', host: '103.170.231.10' }
```

---

### 4. Feature Server Place Outdial
**File:** `jambonz-feature-server/lib/utils/place-outdial.js` (Line 24, 75-79)

```javascript
// Line 24: Extract from object
this.from = target.from || {};

// Lines 75-79: Set headers
opts.headers = {
  ...opts.headers,
  ...(this.from.user && {'X-Preferred-From-User': this.from.user}),
  ...(this.from.host && {'X-Preferred-From-Host': this.from.host}),
  // ... other headers
};
```

**What to look for in logs:**
```
Setting headers:
  X-Preferred-From-User: 09649364251
  X-Preferred-From-Host: 103.170.231.10
```

---

### 5. Feature Server Creates UAC (Outbound Call)
**File:** `jambonz-feature-server/lib/utils/place-outdial.js` (Line 155)

```javascript
const response = await srf.createUAC(uri, {
  ...opts,
  followRedirects: true,
  keepUriOnRedirect: true
});
```

The `opts` object includes the headers with X-Preferred-From-User and X-Preferred-From-Host.

**What to look for in logs:**
```
Creating UAC to sip:+8801757158044@103.170.231.10:5060
Headers: { X-Preferred-From-User: '09649364251', X-Preferred-From-Host: '103.170.231.10', ... }
```

---

### 6. Drachtio SBC Receives Request
**File:** Drachtio SBC (C++ code)

The Drachtio SBC receives the INVITE request with the X-Preferred headers and should use them to construct the From and Contact headers.

**What to look for in logs:**
```
Received INVITE from Feature Server
Headers include: X-Preferred-From-User: 09649364251, X-Preferred-From-Host: 103.170.231.10
Constructing From header: <sip:09649364251@103.170.231.10>
Constructing Contact header: <sip:09649364251@103.170.231.10:5060>
```

---

### 7. Drachtio Sends INVITE to Provider
**File:** Drachtio SBC

The Drachtio SBC sends the INVITE to the SIP provider with the corrected From and Contact headers.

**What to look for in logs:**
```
INVITE sip:+8801757158044@103.170.231.10:5060 SIP/2.0
Via: SIP/2.0/UDP 172.10.0.50:5060;branch=z9hG4bK...
From: <sip:09649364251@103.170.231.10>;tag=...
To: <sip:+8801757158044@103.170.231.10>
Contact: <sip:09649364251@103.170.231.10:5060>
X-Preferred-From-User: 09649364251
X-Preferred-From-Host: 103.170.231.10
```

---

## How to Check Each Step

### Step 1: Verify AI Voice App is sending correct format
```bash
# Check the code
grep -A 5 "from: {" /Users/moniruz/Projects/web/voiceerp/ai-voice-app/server.js
```

### Step 2: Check Feature Server receives the from object
```bash
docker logs voiceerp-feature-server-1 | grep -i "from.*user.*host" | tail -5
```

### Step 3: Check X-Preferred headers are being set
```bash
docker logs voiceerp-feature-server-1 | grep -i "X-Preferred" | tail -5
```

### Step 4: Check Drachtio receives the headers
```bash
docker logs voiceerp-drachtio-fs-1 | grep -i "X-Preferred" | tail -5
```

### Step 5: Check final INVITE has correct From header
```bash
docker logs voiceerp-drachtio-fs-1 | grep -i "From: <sip:" | tail -5
```

### Step 6: Check final INVITE has correct Contact header
```bash
docker logs voiceerp-drachtio-fs-1 | grep -i "Contact: <sip:" | tail -5
```

## Expected Log Output

### Direct SIP Call
```
From: <sip:09649364251@103.170.231.10>;tag=...
Contact: <sip:09649364251@103.170.231.10:5060>
```

### VoiceERP Call (After Fix)
```
From: <sip:09649364251@103.170.231.10>;tag=...
Contact: <sip:09649364251@103.170.231.10:5060>
X-Preferred-From-User: 09649364251
X-Preferred-From-Host: 103.170.231.10
```

## Debugging Commands

### Get last 50 lines of Feature Server logs
```bash
docker logs voiceerp-feature-server-1 --tail 50
```

### Get last 50 lines of Drachtio logs
```bash
docker logs voiceerp-drachtio-fs-1 --tail 50
```

### Search for specific call in logs
```bash
# Replace CALL_ID with actual call ID
docker logs voiceerp-drachtio-fs-1 | grep "CALL_ID"
```

### Follow logs in real-time
```bash
docker logs -f voiceerp-drachtio-fs-1
```

### Get logs since specific time
```bash
docker logs voiceerp-drachtio-fs-1 --since 5m
```

