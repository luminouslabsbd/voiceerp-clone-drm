# SIP INVITE Fix - Detailed Plan

## Problem Summary

**Direct SIP calls work ✅** but **VoiceERP calls fail with 480 ❌**

The root cause is that the SIP INVITE headers are different between the two call types.

## Expected SIP INVITE Format (Like Direct SIP)

```
INVITE sip:+8801757158044@103.170.231.10:5060 SIP/2.0
Via: SIP/2.0/UDP 172.10.0.50:5060;branch=z9hG4bK...
From: <sip:09649364251@103.170.231.10>;tag=...
To: <sip:+8801757158044@103.170.231.10>
Call-ID: ...
CSeq: 1 INVITE
Contact: <sip:09649364251@103.170.231.10:5060>
Max-Forwards: 70
Authorization: Digest username="09649364251", realm="103.170.231.10", ...
Content-Type: application/sdp
Content-Length: ...

[SDP body]
```

## Key Differences to Fix

### 1. From Header
- **Direct SIP:** `From: <sip:09649364251@103.170.231.10>;tag=...`
- **VoiceERP (before):** `From: <sip:172.10.0.50:5060>;tag=...`
- **VoiceERP (after fix):** Should be `From: <sip:09649364251@103.170.231.10>;tag=...`

### 2. Contact Header
- **Direct SIP:** `Contact: <sip:09649364251@103.170.231.10:5060>`
- **VoiceERP (before):** `Contact: <sip:172.10.0.50:5060>`
- **VoiceERP (after fix):** Should be `Contact: <sip:09649364251@103.170.231.10:5060>`

### 3. Via Header
- **Direct SIP:** `Via: SIP/2.0/UDP 172.10.0.50:5060;branch=...`
- **VoiceERP:** `Via: SIP/2.0/UDP 172.10.0.50:5060;branch=...` (This is OK - it's the SBC IP)

## Solution Implementation

### Step 1: Update AI Voice App (DONE ✓)

**File:** `/Users/moniruz/Projects/web/voiceerp/ai-voice-app/server.js`

Changed from:
```javascript
{
  from: '09649364251',
  fromHost: '103.170.231.10',
  to: { ... }
}
```

To:
```javascript
{
  from: {
    user: '09649364251',
    host: '103.170.231.10'
  },
  to: { ... }
}
```

### Step 2: How Feature Server Processes This

**File:** `jambonz-feature-server/lib/tasks/rest_dial.js`

The Feature Server receives the `from` object and passes it to `place-outdial.js`:

```javascript
this.from = this.data.from;  // Now receives {user: '09649364251', host: '103.170.231.10'}
```

### Step 3: Feature Server Sets Headers

**File:** `jambonz-feature-server/lib/utils/place-outdial.js` (lines 75-79)

```javascript
opts.headers = {
  ...opts.headers,
  ...(this.from.user && {'X-Preferred-From-User': this.from.user}),
  ...(this.from.host && {'X-Preferred-From-Host': this.from.host}),
  // ... other headers
};
```

This sets:
- `X-Preferred-From-User: 09649364251`
- `X-Preferred-From-Host: 103.170.231.10`

### Step 4: Drachtio SBC Uses These Headers

The Drachtio SBC should receive these headers and use them to construct the From and Contact headers in the outbound INVITE.

## Testing Plan

### Test 1: Direct SIP Call
```bash
cd /Users/moniruz/Projects/web/voiceerp/ai-voice-app
node direct-sip-test.js +8801757158044
```

Expected result:
- From: `<sip:09649364251@103.170.231.10>`
- Contact: `<sip:09649364251@103.170.231.10:5060>`

### Test 2: VoiceERP Call (After Fix)
```bash
cd /Users/moniruz/Projects/web/voiceerp/ai-voice-app
node test-call.js +8801757158044
```

Expected result:
- From: `<sip:09649364251@103.170.231.10>`
- Contact: `<sip:09649364251@103.170.231.10:5060>`
- X-Preferred-From-User: `09649364251`
- X-Preferred-From-Host: `103.170.231.10`

### Test 3: Compare Logs
```bash
node /Users/moniruz/Projects/web/voiceerp/test-sip-comparison.js
```

This will:
1. Capture logs before and after direct SIP call
2. Capture logs before and after VoiceERP call
3. Extract and compare SIP INVITE headers
4. Show differences

## Expected Outcome

After this fix:
- ✅ From header will have correct username and domain
- ✅ Contact header will have correct username and domain
- ✅ X-Preferred headers will be set
- ✅ Provider will accept the call (200 OK instead of 480)

## Troubleshooting

If the fix doesn't work:

1. **Check Feature Server logs:**
   ```bash
   docker logs voiceerp-feature-server-1 | grep -i "from\|X-Preferred"
   ```

2. **Check Drachtio logs:**
   ```bash
   docker logs voiceerp-drachtio-fs-1 | grep -i "From:\|Contact:"
   ```

3. **Verify the `from` object is being passed:**
   - Add logging to Feature Server to confirm `this.from` is an object
   - Check if `X-Preferred-From-User` and `X-Preferred-From-Host` headers are being set

4. **Check if Drachtio supports these headers:**
   - Look at Drachtio SBC source code
   - Check if there's a configuration option to use custom From headers

