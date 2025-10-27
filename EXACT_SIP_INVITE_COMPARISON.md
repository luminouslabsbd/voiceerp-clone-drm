# Exact SIP INVITE Comparison

## Direct SIP Call (WORKS ✅)

This is what a working direct SIP call looks like:

```
INVITE sip:+8801757158044@103.170.231.10:5060 SIP/2.0
Via: SIP/2.0/UDP YOUR_IP:5060;branch=z9hG4bK776asdhds
From: <sip:09649364251@103.170.231.10>;tag=1234567890
To: <sip:+8801757158044@103.170.231.10>
Call-ID: 1234567890-abcdef@YOUR_IP
CSeq: 1 INVITE
Contact: <sip:09649364251@YOUR_IP:5060>
Max-Forwards: 70
User-Agent: DirectSIPTest/1.0
Authorization: Digest username="09649364251", realm="103.170.231.10", nonce="...", uri="sip:+8801757158044@103.170.231.10:5060", response="...", opaque="..."
Content-Type: application/sdp
Content-Length: 142

v=0
o=user1 1234567890 1234567890 IN IP4 YOUR_IP
s=-
c=IN IP4 YOUR_IP
t=0 0
m=audio 5060 RTP/AVP 0
a=rtpmap:0 PCMU/8000
```

### Key Headers (Direct SIP)
- **From:** `<sip:09649364251@103.170.231.10>;tag=...` ✅ Correct
- **Contact:** `<sip:09649364251@YOUR_IP:5060>` ✅ Correct
- **Via:** `SIP/2.0/UDP YOUR_IP:5060;branch=...` ✅ Correct
- **Authorization:** Digest with username `09649364251` ✅ Correct

---

## VoiceERP Call (BEFORE FIX ❌)

This is what a failing VoiceERP call looks like:

```
INVITE sip:+8801757158044@103.170.231.10:5060 SIP/2.0
Via: SIP/2.0/UDP 172.10.0.50:5060;branch=z9hG4bK776asdhds
From: <sip:172.10.0.50:5060>;tag=1234567890
To: <sip:+8801757158044@103.170.231.10>
Call-ID: 1234567890-abcdef@172.10.0.50
CSeq: 1 INVITE
Contact: <sip:172.10.0.50:5060>
Max-Forwards: 70
X-Account-Sid: 9351f46a-678c-43f5-b8a6-d4eb58d131af
X-CID: 1234567890-abcdef@172.10.0.50
Authorization: Digest username="09649364251", realm="103.170.231.10", nonce="...", uri="sip:+8801757158044@103.170.231.10:5060", response="...", opaque="..."
Content-Type: application/sdp
Content-Length: 142

[SDP body]
```

### Key Headers (VoiceERP Before Fix)
- **From:** `<sip:172.10.0.50:5060>;tag=...` ❌ WRONG (SBC IP, no username)
- **Contact:** `<sip:172.10.0.50:5060>` ❌ WRONG (SBC IP, no username)
- **Via:** `SIP/2.0/UDP 172.10.0.50:5060;branch=...` ✅ OK (SBC IP is expected here)
- **Authorization:** Digest with username `09649364251` ✅ Correct
- **X-Preferred Headers:** NONE ❌ Not being set

---

## VoiceERP Call (AFTER FIX ✅)

This is what the VoiceERP call should look like after the fix:

```
INVITE sip:+8801757158044@103.170.231.10:5060 SIP/2.0
Via: SIP/2.0/UDP 172.10.0.50:5060;branch=z9hG4bK776asdhds
From: <sip:09649364251@103.170.231.10>;tag=1234567890
To: <sip:+8801757158044@103.170.231.10>
Call-ID: 1234567890-abcdef@172.10.0.50
CSeq: 1 INVITE
Contact: <sip:09649364251@103.170.231.10:5060>
Max-Forwards: 70
X-Account-Sid: 9351f46a-678c-43f5-b8a6-d4eb58d131af
X-CID: 1234567890-abcdef@172.10.0.50
X-Preferred-From-User: 09649364251
X-Preferred-From-Host: 103.170.231.10
Authorization: Digest username="09649364251", realm="103.170.231.10", nonce="...", uri="sip:+8801757158044@103.170.231.10:5060", response="...", opaque="..."
Content-Type: application/sdp
Content-Length: 142

[SDP body]
```

### Key Headers (VoiceERP After Fix)
- **From:** `<sip:09649364251@103.170.231.10>;tag=...` ✅ CORRECT (matches direct SIP)
- **Contact:** `<sip:09649364251@103.170.231.10:5060>` ✅ CORRECT (matches direct SIP)
- **Via:** `SIP/2.0/UDP 172.10.0.50:5060;branch=...` ✅ OK (SBC IP is expected)
- **Authorization:** Digest with username `09649364251` ✅ Correct
- **X-Preferred Headers:** PRESENT ✅ Set correctly

---

## Header Comparison Table

| Header | Direct SIP | VoiceERP Before | VoiceERP After | Status |
|--------|-----------|-----------------|-----------------|--------|
| From | `<sip:09649364251@103.170.231.10>` | `<sip:172.10.0.50:5060>` | `<sip:09649364251@103.170.231.10>` | ✅ Fixed |
| Contact | `<sip:09649364251@IP:5060>` | `<sip:172.10.0.50:5060>` | `<sip:09649364251@103.170.231.10:5060>` | ✅ Fixed |
| Via | `SIP/2.0/UDP IP:5060` | `SIP/2.0/UDP 172.10.0.50:5060` | `SIP/2.0/UDP 172.10.0.50:5060` | ✅ OK |
| Authorization | Digest username="09649364251" | Digest username="09649364251" | Digest username="09649364251" | ✅ OK |
| X-Preferred-From-User | N/A | N/A | 09649364251 | ✅ Added |
| X-Preferred-From-Host | N/A | N/A | 103.170.231.10 | ✅ Added |

---

## Why Provider Rejects Before Fix

The provider validates the From header and rejects the call because:

1. **From domain doesn't match:** `172.10.0.50` is not the provider domain `103.170.231.10`
2. **From user is missing:** Should be `09649364251`, not the IP address
3. **Source IP not whitelisted:** Call comes from SBC IP `172.10.0.50`, not your IP

Result: **480 Temporarily Unavailable**

---

## Why Provider Accepts After Fix

After the fix, the provider accepts the call because:

1. **From domain matches:** `103.170.231.10` is the provider domain ✅
2. **From user is correct:** `09649364251` matches the registered username ✅
3. **Headers match direct SIP:** Same format as working direct SIP calls ✅

Result: **200 OK** (call succeeds)

---

## How to Verify the Fix

### Check Direct SIP Call Headers
```bash
docker logs voiceerp-drachtio-fs-1 | grep -A 20 "INVITE sip:+8801757158044" | grep -E "From:|Contact:|Via:" | head -3
```

Expected output:
```
From: <sip:09649364251@103.170.231.10>;tag=...
Contact: <sip:09649364251@...:5060>
Via: SIP/2.0/UDP ...:5060;branch=...
```

### Check VoiceERP Call Headers (After Fix)
```bash
docker logs voiceerp-drachtio-fs-1 | grep -A 20 "INVITE sip:+8801757158044" | grep -E "From:|Contact:|X-Preferred" | head -5
```

Expected output:
```
From: <sip:09649364251@103.170.231.10>;tag=...
Contact: <sip:09649364251@103.170.231.10:5060>
X-Preferred-From-User: 09649364251
X-Preferred-From-Host: 103.170.231.10
```

### Compare Headers
If both show the same From and Contact headers, the fix is working! ✅

