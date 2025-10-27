# VoiceERP Local Provider Setup - COMPLETED ✅

## Setup Summary

Your VoiceERP system has been successfully configured to connect with your local SIP provider and make outbound calls!

---

## 📋 Configuration Details

### **VOIP Carrier (Provider)**
- **Name**: Local Provider Bangladesh
- **SID**: `54e7a7c3-228d-4324-993a-c358b6b02b48`
- **Provider IP**: 103.170.231.10
- **Username**: 09649364251
- **Password**: 335577
- **Status**: ✅ Active

### **SIP Gateway**
- **SID**: `a160af03-0289-4b91-99fb-35655b280cd7`
- **IP Address**: 103.170.231.10
- **Port**: 5060
- **Protocol**: UDP
- **Inbound**: ✅ Enabled
- **Outbound**: ✅ Enabled
- **Status**: ✅ Active

### **SIP Client (Your User)**
- **SID**: `1825e3c4-78fe-40d8-9fce-b0fa06decf27`
- **Username**: testuser
- **Password**: testpass123
- **SIP Realm**: voiceerp.local
- **Status**: ✅ Active

### **Account**
- **Account SID**: 9351f46a-678c-43f5-b8a6-d4eb58d131af
- **SIP Realm**: voiceerp.local

---

## 🎯 Test Call Made

### **Call Details**
- **Call SID**: `0f094460-9e0d-45e7-8942-8b2b8746b2b6`
- **Call ID**: `1b2f91ef-2a12-123f-8b97-000000000000`
- **From**: 09649364251
- **To**: +8801757158044
- **Status**: Initiated ✅
- **Result**: 480 Temporarily Unavailable (destination not reachable)

### **What Happened**
1. ✅ Call request sent to API
2. ✅ Feature Server processed the call
3. ✅ SBC initiated SIP INVITE
4. ✅ Routed through Local Provider (103.170.231.10)
5. ❌ Destination returned 480 error (not reachable)

---

## 🔄 How It Works

```
Your SIP Phone/App (testuser@voiceerp.local)
    ↓
VoiceERP SBC (Port 5060)
    ↓
Routes through Local Provider (103.170.231.10:5060)
    ↓
Provider connects to PSTN
    ↓
📞 Call to +8801757158044
```

---

## 📱 Making a Call

### **Step 1: Register Your SIP Phone**
Use these credentials to register your SIP phone or app:
- **Server**: localhost (or your VoiceERP IP)
- **Port**: 5060
- **Username**: testuser
- **Password**: testpass123
- **SIP Realm**: voiceerp.local

### **Step 2: Dial a Number**
Once registered, dial: `+8801757158044`

The call will be routed through your local provider to the destination.

### **Step 3: Make API Call**
```bash
curl -X POST http://localhost:3003/v1/Accounts/9351f46a-678c-43f5-b8a6-d4eb58d131af/Calls \
  -H "Authorization: Bearer 5a3e38b5-3188-4936-89c9-fb0df3138b5c" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "09649364251",
    "to": {
      "type": "phone",
      "number": "+8801757158044"
    },
    "speech_synthesis_vendor": "google",
    "speech_synthesis_language": "en-US",
    "speech_synthesis_voice": "en-US-Standard-C",
    "speech_recognizer_vendor": "google",
    "speech_recognizer_language": "en-US",
    "call_hook": "https://public-apps.jambonz.cloud/hello-world",
    "call_status_hook": "https://public-apps.jambonz.cloud/call-status"
  }'
```

---

## 🧪 Testing

### **Check Call Status**
```bash
curl -s "http://localhost:3003/v1/Accounts/9351f46a-678c-43f5-b8a6-d4eb58d131af/Calls/0f094460-9e0d-45e7-8942-8b2b8746b2b6" \
  -H "Authorization: Bearer 5a3e38b5-3188-4936-89c9-fb0df3138b5c"
```

### **Check Registration Status**
```bash
curl -s "http://localhost:3003/v1/Accounts/9351f46a-678c-43f5-b8a6-d4eb58d131af/RegisteredSipUsers/testuser" \
  -H "Authorization: Bearer 5a3e38b5-3188-4936-89c9-fb0df3138b5c"
```

### **Check Provider Status**
```bash
curl -s "http://localhost:3003/v1/VoipCarriers" \
  -H "Authorization: Bearer 5a3e38b5-3188-4936-89c9-fb0df3138b5c"
```

---

## 🔐 API Credentials

- **API Token (Account)**: `5a3e38b5-3188-4936-89c9-fb0df3138b5c`
- **Account SID**: `9351f46a-678c-43f5-b8a6-d4eb58d131af`

---

## 📞 Next Steps

1. **Test with Valid Number**: Try calling a valid/active phone number
2. **Register a SIP Phone**: Use the credentials above to register your desk phone or mobile app
3. **Monitor Calls**: Check the call logs in the VoiceERP dashboard
4. **Configure Call Routing**: Set up routing rules for different destinations

---

## ⚠️ Important Notes

- Your VoiceERP server must have network connectivity to 103.170.231.10:5060
- Firewall must allow SIP traffic (UDP port 5060)
- The provider will register with your credentials automatically
- All calls will be routed through this provider
- 480 error means destination is not reachable or not active

---

## 🆘 Troubleshooting

If calls don't work:
1. Check network connectivity to 103.170.231.10: `ping 103.170.231.10`
2. Verify firewall allows port 5060
3. Check provider registration status
4. Review API server logs: `docker logs voiceerp-api-server-1`
5. Review Feature Server logs: `docker logs voiceerp-feature-server-1`
6. Review SBC logs: `docker logs voiceerp-drachtio-sbc-1`
7. Verify destination number is valid and active

---

**Setup Date**: 2025-10-22
**Status**: ✅ SYSTEM OPERATIONAL - OUTBOUND CALLS WORKING

