# Current Status and Findings

## Fix Applied ✅

**File:** `/Users/moniruz/Projects/web/voiceerp/ai-voice-app/server.js` (Lines 173-176)

Changed from:
```javascript
from: '09649364251',
fromHost: '103.170.231.10',
```

To:
```javascript
from: {
  user: '09649364251',
  host: '103.170.231.10'
},
```

---

## Test Results

### Feature Server Logs ✅
The Feature Server is receiving the `from` object correctly:

```json
"outbound REST call attempt to {
  \"type\":\"phone\",
  \"number\":\"+8801757158044\",
  \"trunk\":\"Bangladesh SIP Provider\",
  \"from\":{\"user\":\"09649364251\",\"host\":\"103.170.231.10\"}
}"
```

**Status:** ✅ WORKING - The `from` object is being passed correctly

---

### Drachtio SBC Logs ❌
The From header in Drachtio is still showing the SBC IP:

```
From: <sip:172.10.0.50:5060>;tag=HD30HgjeKtc4D
```

**Status:** ❌ NOT WORKING - Drachtio is not using the X-Preferred headers

---

### X-Preferred Headers ❌
No X-Preferred headers found in Drachtio logs:

```bash
docker logs voiceerp-drachtio-fs-1 2>&1 | grep -i "X-Preferred"
# Result: (empty - no matches)
```

**Status:** ❌ NOT FOUND - Headers are not being sent to Drachtio or not being logged

---

## Root Cause Analysis

### The Problem

The Feature Server is receiving the `from` object correctly, but:

1. **X-Preferred headers are not appearing in Drachtio logs**
   - Either Feature Server is not sending them
   - Or Drachtio is not logging them
   - Or Drachtio is not using them

2. **Drachtio is still using its own IP in the From header**
   - From: `<sip:172.10.0.50:5060>` (SBC IP)
   - Should be: `<sip:09649364251@103.170.231.10>` (provider domain)

### Possible Causes

1. **Drachtio doesn't support X-Preferred-From-Host header**
   - The header mechanism may not be implemented in Drachtio
   - Drachtio may use a different mechanism for custom From headers

2. **Feature Server is not setting the headers**
   - The code in place-outdial.js may not be executing
   - The headers may be getting filtered out somewhere

3. **Drachtio is filtering out custom headers**
   - Drachtio may have a whitelist of allowed headers
   - X-Preferred headers may not be in the whitelist

---

## Next Steps to Investigate

### 1. Check if Feature Server is Setting Headers
Add logging to Feature Server to confirm headers are being set:

```bash
docker logs voiceerp-feature-server-1 | grep -i "opts.headers\|X-Preferred"
```

### 2. Check Drachtio Configuration
Look for Drachtio configuration that might control header handling:

```bash
docker exec voiceerp-drachtio-fs-1 find / -name "*.conf*" -o -name "*.xml" 2>/dev/null | grep -i drachtio
```

### 3. Check Drachtio Source Code
Look at Drachtio SBC source code to see if it supports X-Preferred headers:

```bash
# Check if Drachtio SBC supports custom headers
grep -r "X-Preferred\|from.*header\|From.*header" /path/to/drachtio-sbc/src
```

### 4. Alternative Solution: Use Contact Header Rewriting
Instead of relying on X-Preferred headers, we could:
- Configure the SIP Gateway to use a specific From header
- Use a SIP proxy to rewrite headers
- Implement a custom Drachtio handler

---

## Evidence Summary

### What's Working ✅
- AI Voice App is passing `from` as an object
- Feature Server is receiving the `from` object correctly
- API communication is working
- Call is being routed to the provider

### What's Not Working ❌
- X-Preferred headers are not appearing in logs
- Drachtio is not using the custom From header
- From header still shows SBC IP instead of provider domain
- Provider still rejects with 480 error

---

## Conclusion

The fix we implemented (passing `from` as an object) is correct and is being received by the Feature Server. However, **Drachtio SBC is not using the X-Preferred-From-Host header** to modify the From header domain.

This suggests that either:
1. Drachtio doesn't support this header mechanism
2. The header is not being passed to Drachtio
3. Drachtio has a different mechanism for custom From headers

We need to investigate Drachtio's header handling to find an alternative solution.

---

## Recommended Actions

1. **Contact Jambonz Support**
   - Ask if Drachtio supports X-Preferred-From-Host header
   - Ask for alternative methods to set custom From headers

2. **Check Drachtio Documentation**
   - Look for header handling documentation
   - Check for configuration options

3. **Implement Alternative Solution**
   - Use SIP Gateway configuration to set From header
   - Implement a SIP proxy for header rewriting
   - Use a different approach (e.g., P-Preferred-Identity header)

4. **Contact SIP Provider**
   - Ask if they support alternative authentication methods
   - Ask if they can whitelist the SBC IP
   - Ask for test numbers that work with SBC calls

