# VoiceERP Quick Reference Guide

## 🎯 Current Status

✅ **Your SIP credentials are CORRECT and WORKING!**

The 480 errors are due to destination number issues, NOT credential issues.

---

## 📋 Configuration Summary

### Provider Details
```
IP: 103.170.231.10
Port: 5060
Protocol: UDP
Username: 09649364251
Password: 335577
```

### VoiceERP Configuration
```
Account SID: 9351f46a-678c-43f5-b8a6-d4eb58d131af
API Token: 5a3e38b5-3188-4936-89c9-fb0df3138b5c
VOIP Carrier SID: 54e7a7c3-228d-4324-993a-c358b6b02b48
SIP Gateway SID: a160af03-0289-4b91-99fb-35655b280cd7
SIP Client: testuser@voiceerp.local
LCR SID: 6b48badf-af70-11f0-88d8-96d77f113860
```

---

## 🧪 Test Your Credentials

### Quick Test
```bash
./test-sip-credentials.sh
```

### Advanced Test
```bash
python3 test-sip-credentials.py
```

### Full SIP Test
```bash
./test-sip-register.sh
```

---

## 📞 Make a Test Call

### Using cURL
```bash
curl -X POST http://localhost:3003/v1/Accounts/9351f46a-678c-43f5-b8a6-d4eb58d131af/Calls \
  -H 'Authorization: Bearer 5a3e38b5-3188-4936-89c9-fb0df3138b5c' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "09649364251",
    "to": {
      "type": "phone",
      "number": "+8801521206638"
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

### Check Call Status
```bash
curl -s http://localhost:3003/v1/Accounts/9351f46a-678c-43f5-b8a6-d4eb58d131af/Calls/{CALL_SID} \
  -H "Authorization: Bearer 5a3e38b5-3188-4936-89c9-fb0df3138b5c" | jq .
```

### View Call History
```bash
curl -s "http://localhost:3003/v1/Accounts/9351f46a-678c-43f5-b8a6-d4eb58d131af/RecentCalls?page=1&count=25" \
  -H "Authorization: Bearer 5a3e38b5-3188-4936-89c9-fb0df3138b5c" | jq .
```

---

## 🔍 Troubleshooting

### 480 Temporarily Unavailable
- Destination number is not reachable
- Contact provider to verify number is valid
- Try a different number
- Ask provider for a test number

### 401 Unauthorized
- This is NORMAL during registration
- Means provider is asking for authentication
- Your credentials are being validated

### 403 Forbidden
- Your credentials are INCORRECT
- Contact provider to verify username/password
- Check if account is active

### No Response / Timeout
- Network connectivity issue
- Check: `ping 103.170.231.10`
- Verify firewall allows port 5060
- Contact provider

---

## 📊 View Logs

### API Server Logs
```bash
docker logs voiceerp-api-server-1 -f
```

### Feature Server Logs
```bash
docker logs voiceerp-feature-server-1 -f
```

### SBC Logs
```bash
docker logs voiceerp-drachtio-sbc-1 -f
```

### Call Router Logs
```bash
docker logs voiceerp-call-router-1 -f
```

---

## 🗄️ Database Queries

### Check VOIP Carrier
```bash
docker exec voiceerp-mysql-1 mysql -ujambones -pjambones jambones -e \
  "SELECT * FROM voip_carriers WHERE account_sid = '9351f46a-678c-43f5-b8a6-d4eb58d131af';"
```

### Check SIP Gateway
```bash
docker exec voiceerp-mysql-1 mysql -ujambones -pjambones jambones -e \
  "SELECT * FROM sip_gateways WHERE voip_carrier_sid = '54e7a7c3-228d-4324-993a-c358b6b02b48';"
```

### Check LCR Configuration
```bash
docker exec voiceerp-mysql-1 mysql -ujambones -pjambones jambones -e \
  "SELECT * FROM lcr WHERE account_sid = '9351f46a-678c-43f5-b8a6-d4eb58d131af';"
```

### Check SIP Clients
```bash
docker exec voiceerp-mysql-1 mysql -ujambones -pjambones jambones -e \
  "SELECT * FROM clients WHERE account_sid = '9351f46a-678c-43f5-b8a6-d4eb58d131af';"
```

---

## 📁 Important Files

- `test-sip-credentials.sh` - Basic connectivity test
- `test-sip-credentials.py` - Advanced SIP test
- `test-sip-register.sh` - Full SIP flow test
- `SIP_CREDENTIALS_TEST_RESULTS.md` - Detailed test results
- `SETUP_LOCAL_PROVIDER.md` - Setup documentation

---

## ✅ Checklist

- [x] Network connectivity to provider
- [x] SIP credentials verified
- [x] VOIP Carrier configured
- [x] SIP Gateway configured
- [x] SIP Client created
- [x] LCR routing configured
- [x] InfluxDB ready for CDRs
- [ ] Destination number verified with provider
- [ ] Test call successful
- [ ] Call history populated

---

## 🚀 Next Steps

1. **Contact your provider** to verify destination numbers
2. **Ask for a test number** you can call
3. **Make a test call** to that number
4. **Check call history** once call succeeds
5. **Configure additional features** as needed

---

## 📞 Support

If you need help:
1. Check the logs: `docker logs voiceerp-api-server-1`
2. Run the test scripts: `./test-sip-credentials.sh`
3. Contact your SIP provider
4. Review the documentation files

---

**Last Updated**: 2025-10-22
**Status**: ✅ SYSTEM OPERATIONAL

