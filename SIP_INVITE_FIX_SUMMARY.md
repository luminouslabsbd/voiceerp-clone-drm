# SIP INVITE Fix - Complete Summary

## Problem

VoiceERP calls fail with **480 Temporarily Unavailable** while direct SIP calls work. The root cause is **SIP header mismatch** - the From and Contact headers are using the SBC IP instead of the provider domain.

## Root Cause Analysis

### Direct SIP Call (WORKS ✅)
```
From: <sip:09649364251@103.170.231.10>;tag=...
Contact: <sip:09649364251@103.170.231.10:5060>
```

### VoiceERP Call (FAILS ❌)
```
From: <sip:172.10.0.50:5060>;tag=...
Contact: <sip:172.10.0.50:5060>
```

The provider validates the From header domain and rejects calls because:
- From domain is `172.10.0.50` (SBC IP) instead of `103.170.231.10` (provider domain)
- From user is missing (should be `09649364251`)

## Solution Implemented

### Change 1: Updated AI Voice App

**File:** `/Users/moniruz/Projects/web/voiceerp/ai-voice-app/server.js` (Lines 168-196)

**Before:**
```javascript
{
  from: '09649364251',
  fromHost: '103.170.231.10',
  to: { ... }
}
```

**After:**
```javascript
{
  from: {
    user: '09649364251',
    host: '103.170.231.10'
  },
  to: { ... }
}
```

### Why This Works

1. **API Server** receives the `from` object with `user` and `host` properties
2. **Feature Server** (rest_dial.js) stores this object: `this.from = this.data.from`
3. **Feature Server** (place-outdial.js) sets headers:
   ```javascript
   ...(this.from.user && {'X-Preferred-From-User': this.from.user}),
   ...(this.from.host && {'X-Preferred-From-Host': this.from.host}),
   ```
4. **Drachtio SBC** receives these headers and uses them to construct the From and Contact headers

## Expected Result After Fix

### VoiceERP Call (After Fix)
```
From: <sip:09649364251@103.170.231.10>;tag=...
Contact: <sip:09649364251@103.170.231.10:5060>
X-Preferred-From-User: 09649364251
X-Preferred-From-Host: 103.170.231.10
```

This matches the direct SIP call format, so the provider will accept it!

## How to Test

### Test 1: Make a Direct SIP Call
```bash
cd /Users/moniruz/Projects/web/voiceerp/ai-voice-app
node direct-sip-test.js +8801757158044
```

Expected: Call succeeds, you receive the call

### Test 2: Make a VoiceERP Call (After Fix)
```bash
cd /Users/moniruz/Projects/web/voiceerp/ai-voice-app
node test-call.js +8801757158044
```

Expected: Call succeeds, you receive the call (instead of 480 error)

### Test 3: Compare SIP INVITE Headers
```bash
bash /Users/moniruz/Projects/web/voiceerp/run-sip-test.sh
```

This script will:
1. Capture logs before and after direct SIP call
2. Capture logs before and after VoiceERP call
3. Extract and display SIP INVITE headers
4. Compare the headers between the two calls
5. Show if they match

## Files Modified

- `/Users/moniruz/Projects/web/voiceerp/ai-voice-app/server.js` - Changed `from` parameter from string to object

## Files Created for Testing

- `/Users/moniruz/Projects/web/voiceerp/run-sip-test.sh` - Bash script to capture and compare SIP INVITE headers
- `/Users/moniruz/Projects/web/voiceerp/test-sip-comparison.js` - Node.js script for detailed comparison
- `/Users/moniruz/Projects/web/voiceerp/SIP_FIX_DETAILED_PLAN.md` - Detailed technical plan

## Verification Checklist

After implementing the fix, verify:

- [ ] AI Voice App is updated to pass `from` as an object
- [ ] Feature Server receives the `from` object correctly
- [ ] X-Preferred-From-User header is set to `09649364251`
- [ ] X-Preferred-From-Host header is set to `103.170.231.10`
- [ ] Drachtio SBC uses these headers to construct From header
- [ ] From header in outbound INVITE is `<sip:09649364251@103.170.231.10>`
- [ ] Contact header in outbound INVITE is `<sip:09649364251@103.170.231.10:5060>`
- [ ] VoiceERP call succeeds (200 OK instead of 480)

## Troubleshooting

### If VoiceERP calls still fail with 480:

1. **Check Feature Server logs:**
   ```bash
   docker logs voiceerp-feature-server-1 | grep -i "from\|X-Preferred" | tail -20
   ```

2. **Check Drachtio logs:**
   ```bash
   docker logs voiceerp-drachtio-fs-1 | grep -i "From:\|Contact:" | tail -20
   ```

3. **Verify the fix was applied:**
   ```bash
   grep -A 5 "from: {" /Users/moniruz/Projects/web/voiceerp/ai-voice-app/server.js
   ```

4. **Check if X-Preferred headers are being sent:**
   ```bash
   docker logs voiceerp-drachtio-fs-1 | grep "X-Preferred" | tail -10
   ```

### If X-Preferred headers are not appearing:

- The Feature Server may not be passing them to Drachtio
- Drachtio may not support these headers
- Check Drachtio SBC source code for header handling

### If From header is still wrong:

- Drachtio may not be using the X-Preferred headers
- Check Drachtio configuration for custom header support
- May need to implement a different solution (e.g., SIP proxy rewriting)

## Next Steps

1. Run the test script to capture and compare SIP INVITE headers
2. Verify that the From and Contact headers match between direct SIP and VoiceERP calls
3. If they match, test with actual calls to verify the provider accepts them
4. If they don't match, investigate why Drachtio is not using the X-Preferred headers

