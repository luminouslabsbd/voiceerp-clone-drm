# SIP Header Comparison: Direct vs VoiceERP

## Why Headers Matter

SIP providers often have **strict validation rules** that check:
- Source IP address
- Contact header domain
- From header domain
- Custom headers
- User-Agent string

If any of these don't match expected patterns, the provider may reject with **480 Temporarily Unavailable**.

---

## Direct SIP Call Headers (WORKING ✅)

```
INVITE sip:+8801757158044@103.170.231.10:5060 SIP/2.0
Via: SIP/2.0/UDP your-ip:5060;branch=z9hG4bK776asdhds
From: <sip:09649364251@103.170.231.10>;tag=1928301774
To: <sip:+8801757158044@103.170.231.10>
Call-ID: a84b4c76e66710@your-ip
CSeq: 314159 INVITE
Contact: <sip:09649364251@your-ip:5060>
Max-Forwards: 70
User-Agent: Node.js SIP Client
Content-Type: application/sdp
Content-Length: 142

Authorization: Digest username="09649364251",
  realm="103.170.231.10",
  nonce="...",
  uri="sip:+8801757158044@103.170.231.10",
  response="...",
  opaque="..."
```

**Key Points:**
- ✅ From domain: `103.170.231.10` (provider's domain)
- ✅ Contact: `your-ip:5060` (your actual IP)
- ✅ Via: `your-ip:5060` (source IP)
- ✅ Minimal headers (no extra X- headers)
- ✅ User-Agent: Simple identifier

---

## VoiceERP Call Headers (FAILING ❌)

```
INVITE sip:+8801757158044@103.170.231.10:5060 SIP/2.0
Via: SIP/2.0/UDP drachtio-sbc-ip:5060;branch=z9hG4bK776asdhds
From: <sip:09649364251@drachtio-sbc-ip>;tag=1928301774
To: <sip:+8801757158044@103.170.231.10>
Call-ID: a84b4c76e66710@drachtio-sbc-ip
CSeq: 314159 INVITE
Contact: <sip:09649364251@drachtio-sbc-ip:5060>
Max-Forwards: 70
User-Agent: drachtio-srf/...
Content-Type: application/sdp
Content-Length: 142

X-Account-Sid: 9351f46a-678c-43f5-b8a6-d4eb58d131af
X-CID: ...
X-Requested-Carrier-Sid: ...
P-Asserted-Identity: <sip:09649364251@drachtio-sbc-ip>
Privacy: none

Authorization: Digest username="09649364251",
  realm="103.170.231.10",
  nonce="...",
  uri="sip:+8801757158044@103.170.231.10",
  response="...",
  opaque="..."
```

**Key Differences:**
- ❌ From domain: `drachtio-sbc-ip` (NOT provider's domain!)
- ❌ Contact: `drachtio-sbc-ip:5060` (SBC IP, not your IP)
- ❌ Via: `drachtio-sbc-ip:5060` (SBC IP)
- ❌ Extra headers: X-Account-Sid, X-CID, X-Requested-Carrier-Sid
- ❌ P-Asserted-Identity: Points to SBC IP
- ❌ User-Agent: Identifies as Drachtio

---

## Why Provider Rejects VoiceERP Calls

### Scenario 1: IP Whitelist
```
Provider's rule: "Only accept calls from whitelisted IPs"
- Direct call from: your-ip ✅ (whitelisted)
- VoiceERP call from: drachtio-sbc-ip ❌ (not whitelisted)
Result: 480 Temporarily Unavailable
```

### Scenario 2: From Domain Validation
```
Provider's rule: "From domain must be 103.170.231.10"
- Direct call: From: <sip:09649364251@103.170.231.10> ✅
- VoiceERP call: From: <sip:09649364251@drachtio-sbc-ip> ❌
Result: 480 Temporarily Unavailable
```

### Scenario 3: Contact Header Validation
```
Provider's rule: "Contact must match From domain"
- Direct call: From: 103.170.231.10, Contact: your-ip ✅ (acceptable)
- VoiceERP call: From: drachtio-sbc-ip, Contact: drachtio-sbc-ip ❌ (mismatch)
Result: 480 Temporarily Unavailable
```

### Scenario 4: Extra Headers Rejection
```
Provider's rule: "Reject calls with X- headers"
- Direct call: No X- headers ✅
- VoiceERP call: Has X-Account-Sid, X-CID, etc. ❌
Result: 480 Temporarily Unavailable
```

---

## How to Fix

### Option A: Configure SIP Gateway (Recommended)
Create a SIP Gateway that:
1. Routes directly to provider (103.170.231.10:5060)
2. Uses your credentials
3. Doesn't add extra headers
4. Preserves proper From/Contact headers

### Option B: Modify Drachtio Configuration
Edit Drachtio SBC to:
1. Use your IP in Contact header (not SBC IP)
2. Strip X- headers before sending to provider
3. Set From domain to provider's domain
4. Use specific routing rules for this provider

### Option C: Ask Provider to Whitelist SBC IP
Contact provider and ask:
- "Can you whitelist our SBC IP: [drachtio-sbc-ip]?"
- "Can you accept From domain as drachtio-sbc-ip?"
- "Can you ignore X- headers?"

---

## Debugging Commands

### Capture SIP Traffic
```bash
# On your server
tcpdump -i any -n 'port 5060' -w /tmp/sip.pcap

# Make a call
cd /Users/moniruz/Projects/web/voiceerp/ai-voice-app
node test-call.js +8801757158044

# Analyze
tcpdump -r /tmp/sip.pcap -A | grep -A 20 "INVITE"
```

### Check Drachtio Logs
```bash
docker logs voiceerp-drachtio-fs-1 -f | grep -i "invite\|from\|contact"
```

### Check Feature Server Logs
```bash
docker logs voiceerp-feature-server-1 -f | grep -i "rest:dial\|480"
```

---

## Summary

| Aspect | Direct SIP | VoiceERP |
|--------|-----------|---------|
| Source IP | your-ip | drachtio-sbc-ip |
| From Domain | 103.170.231.10 | drachtio-sbc-ip |
| Contact | your-ip:5060 | drachtio-sbc-ip:5060 |
| Extra Headers | None | X-Account-Sid, X-CID, etc. |
| Result | ✅ Works | ❌ 480 Error |

**The fix:** Make VoiceERP headers match Direct SIP headers!

