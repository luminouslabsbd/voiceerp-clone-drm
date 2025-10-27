# SIP INVITE Request Comparison and Fix Analysis

## Problem Statement

VoiceERP calls to +8801757158044 fail with **480 Temporarily Unavailable** error, while direct SIP calls to the same number work successfully. The root cause is a **SIP header mismatch** in the From header.

## SIP INVITE Comparison

### Direct SIP Call (WORKS ✅)
```
From: <sip:09649364251@103.170.231.10>
Contact: <sip:09649364251@your-ip:5060>
Authorization: Digest username="09649364251", realm="103.170.231.10", ...
```

### VoiceERP Call (FAILS ❌ with 480)
**Before Fix:**
```
From: <sip:172.10.0.50:5060>
Contact: <sip:172.10.0.50:5060>
Authorization: Digest username="09649364251", realm="103.170.231.10", ...
```

**After Fix (Current):**
```
From: <sip:09649364251@172.10.0.50:5060>
Contact: <sip:09649364251@172.10.0.50:5060>
Authorization: Digest username="09649364251", realm="103.170.231.10", ...
```

## Root Cause Analysis

The provider has strict SIP header validation rules:
1. **From header domain must match provider domain** (103.170.231.10)
2. **From header username must match credentials** (09649364251)
3. **Calls from SBC IP (172.10.0.50) are rejected**

### Why Direct SIP Works
- From header: `<sip:09649364251@103.170.231.10>` ✅ Matches provider domain
- Username: `09649364251` ✅ Matches credentials
- Source IP: Your IP ✅ Whitelisted

### Why VoiceERP Fails
- From header: `<sip:09649364251@172.10.0.50:5060>` ❌ Uses SBC IP, not provider domain
- Username: `09649364251` ✅ Correct (after fix)
- Source IP: 172.10.0.50 (SBC) ❌ Not whitelisted

## Fix Attempted

### Change 1: Updated AI Voice App
**File:** `/Users/moniruz/Projects/web/voiceerp/ai-voice-app/server.js`

Changed from:
```javascript
{
  from: '09649364251',
  to: { type: 'phone', number: to, trunk: 'Bangladesh SIP Provider' }
}
```

To:
```javascript
{
  from: '09649364251',
  fromHost: '103.170.231.10',
  to: { type: 'phone', number: to, trunk: 'Bangladesh SIP Provider' }
}
```

### How It Works

1. **API Server** receives `from` and `fromHost` parameters
2. **Feature Server** creates `rest_dial` task with these parameters
3. **Feature Server** sets `X-Preferred-From-Host` header in SIP INVITE
4. **Drachtio SBC** should use this header to construct From header

### Current Status

✅ **Username is now correct:** `09649364251` (was SBC IP before)
❌ **Host is still wrong:** `172.10.0.50` (should be `103.170.231.10`)

## Why the Fix Didn't Fully Work

The `X-Preferred-From-Host` header is being set by the Feature Server, but **Drachtio SBC is not using it** to modify the From header domain.

### Evidence from Logs

**Feature Server logs show:**
```json
"from":{"user":"09649364251","host":"103.170.231.10"}
```

**Drachtio logs show:**
```
From: <sip:09649364251@172.10.0.50:5060>
```

The header is being passed, but Drachtio is ignoring it and using its own IP address.

## Remaining Issue

**The From header domain is still using the SBC IP (172.10.0.50) instead of the provider domain (103.170.231.10).**

This is likely a limitation of how Drachtio constructs SIP headers. The `X-Preferred-From-Host` header may not be supported by the version of Drachtio being used.

## Recommended Next Steps

1. **Contact SIP Provider** and ask:
   - "Why do direct SIP calls work but calls from our SBC fail with 480?"
   - "Do you have IP whitelist rules? Can you whitelist our SBC IP (172.10.0.50)?"
   - "Do you validate From header domain strictly?"
   - "Can you check your logs for calls from 172.10.0.50?"

2. **Check Drachtio Configuration** for:
   - Support for `X-Preferred-From-Host` header
   - Alternative methods to set custom From header domain
   - Version compatibility with Jambonz Feature Server

3. **Alternative Solutions**:
   - Configure SIP Gateway with custom From header settings
   - Use a different SIP provider that doesn't validate From header domain
   - Implement a SIP proxy that rewrites headers before sending to provider

## Files Modified

- `/Users/moniruz/Projects/web/voiceerp/ai-voice-app/server.js` - Added `fromHost` parameter

## Test Results

- ✅ Call initiated successfully
- ✅ Feature Server accepted the call
- ✅ Call routed to provider
- ❌ Provider still returns **480 Temporarily Unavailable**
- ✅ Username in From header is now correct
- ❌ Domain in From header is still incorrect

