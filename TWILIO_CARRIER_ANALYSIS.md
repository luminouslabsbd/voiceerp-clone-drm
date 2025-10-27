# How Twilio Carrier Works in VoiceERP - Complete Analysis

## 1. Twilio Carrier Configuration

### Predefined Carrier Template (Database)
```sql
INSERT INTO predefined_carriers (
  predefined_carrier_sid, 
  name, 
  requires_static_ip,      -- 0 = No static IP required
  e164_leading_plus,       -- 1 = Add + prefix to numbers
  requires_register,       -- 0 = No SIP registration needed
  register_username,       -- Twilio credentials
  register_password,       -- Twilio credentials
  register_sip_realm,      -- NULL for Twilio (uses domain-based auth)
  tech_prefix,             -- NULL for Twilio
  inbound_auth_username,   -- NULL
  inbound_auth_password,   -- NULL
  diversion                -- NULL
)
VALUES (
  '7d509a18-bbff-4c5d-b21e-b99bf8f8c49a',
  'Twilio',
  0,
  1,
  0,
  '<your-twilio-credential-username>',
  '<your-twilio-credential-password>',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL
);
```

### Key Twilio Carrier Properties:
- **e164_leading_plus: 1** → Adds `+` prefix to phone numbers (e.g., `+18005551234`)
- **requires_register: 0** → No SIP REGISTER needed (Twilio uses digest auth)
- **register_sip_realm: NULL** → Twilio doesn't use realm-based auth
- **requires_static_ip: 0** → Works from any IP address

## 2. Twilio SIP Gateways Configuration

### Inbound Gateways (Twilio → Your System)
```sql
INSERT INTO predefined_sip_gateways (
  predefined_sip_gateway_sid,
  predefined_carrier_sid,
  ipv4,              -- Twilio's IP ranges
  netmask,           -- /30 netmask for IP ranges
  port,              -- 5060
  inbound,           -- 1 = Accept inbound calls
  outbound           -- 0 = Don't use for outbound
)
VALUES
('d2ccfcb1-9198-4fe9-a0ca-6e49395837c4', '7d509a18-bbff-4c5d-b21e-b99bf8f8c49a', '54.172.60.0', 30, 5060, 1, 0),
('6b1d0032-4430-41f1-87c6-f22233d394ef', '7d509a18-bbff-4c5d-b21e-b99bf8f8c49a', '54.244.51.0', 30, 5060, 1, 0),
-- ... more Twilio IP ranges
;
```

### Outbound Gateway (Your System → Twilio)
```sql
INSERT INTO predefined_sip_gateways (
  predefined_sip_gateway_sid,
  predefined_carrier_sid,
  ipv4,              -- Twilio's domain
  netmask,           -- 32 for single domain
  port,              -- 5060
  inbound,           -- 0 = Don't accept inbound
  outbound           -- 1 = Use for outbound calls
)
VALUES
('3ed1dd12-e1a7-44ff-811a-3cc5dc13dc72', '7d509a18-bbff-4c5d-b21e-b99bf8f8c49a', '<your-domain>.pstn.twilio.com', 32, 5060, 0, 1);
```

## 3. How Outbound Calls Work with Twilio

### Call Flow:
```
AI Voice App
  ↓ (POST /v1/Accounts/{sid}/Calls)
  ├─ from: "1234567890"
  ├─ to: {type: "phone", number: "+18005551234", trunk: "Twilio"}
  ├─ call_hook: "https://your-app/webhook/call-initiated"
  └─ call_status_hook: "https://your-app/webhook/call-ended"
  
VoiceERP API Server (create-call.js)
  ↓ (Validates and routes to Feature Server)
  ├─ Looks up carrier by trunk name: "Twilio"
  ├─ Fetches carrier config from database
  ├─ Sets target.from with register_from_user/register_from_domain
  └─ Creates rest:dial task
  
Feature Server (rest_dial.js)
  ↓ (Creates SIP INVITE)
  ├─ Looks up SIP gateway for outbound
  ├─ Routes to: <your-domain>.pstn.twilio.com:5060
  ├─ Sets From header: <sip:1234567890@<your-domain>.pstn.twilio.com>
  ├─ Sets To header: <sip:+18005551234@<your-domain>.pstn.twilio.com>
  ├─ Adds Digest authentication (username/password)
  └─ Sends SIP INVITE
  
Drachtio SBC
  ↓ (Proxies SIP INVITE)
  └─ Sends to Twilio gateway
  
Twilio
  ↓ (Authenticates and routes)
  ├─ Validates Digest auth credentials
  ├─ Validates From header format
  ├─ Routes call to destination
  └─ Returns 200 OK
```

## 4. Key Differences: Twilio vs Bangladesh SIP Provider

| Property | Twilio | Bangladesh SIP |
|----------|--------|-----------------|
| **requires_register** | 0 (No) | 0 (No) |
| **e164_leading_plus** | 1 (Yes) | 0 (No) |
| **register_sip_realm** | NULL | 103.170.231.10 |
| **register_from_user** | (from API) | 09649364251 |
| **register_from_domain** | <your-domain>.pstn.twilio.com | 103.170.231.10 |
| **Outbound Gateway** | Domain-based | IP-based |
| **Authentication** | Digest Auth | Digest Auth |

## 5. Your Bangladesh SIP Provider Configuration

### Current Setup (Should Work):
```sql
-- Carrier
INSERT INTO voip_carriers (
  voip_carrier_sid,
  name,
  account_sid,
  e164_leading_plus,       -- 0 (no + prefix)
  requires_register,       -- 0 (no registration)
  register_username,       -- 09649364251
  register_password,       -- 335577
  register_sip_realm,      -- 103.170.231.10
  register_from_user,      -- 09649364251
  register_from_domain,    -- 103.170.231.10
  dtmf_type                -- rfc2833
)
VALUES (
  'bf6d697a-af77-11f0-88d8-96d77f113860',
  'Bangladesh SIP Provider',
  '9351f46a-678c-43f5-b8a6-d4eb58d131af',
  0,
  0,
  '09649364251',
  '335577',
  '103.170.231.10',
  '09649364251',
  '103.170.231.10',
  'rfc2833'
);

-- Gateway
INSERT INTO sip_gateways (
  sip_gateway_sid,
  voip_carrier_sid,
  ipv4,              -- Provider IP
  port,              -- 5060
  inbound,           -- 1
  outbound           -- 1
)
VALUES (
  'd0425251-af77-11f0-88d8-96d77f113860',
  'bf6d697a-af77-11f0-88d8-96d77f113860',
  '103.170.231.10',
  5060,
  1,
  1
);
```

## 6. Why Your Setup Should Work

1. ✅ **Carrier configured** with correct credentials
2. ✅ **Gateway configured** with provider IP
3. ✅ **register_from_user/domain set** to provider credentials
4. ✅ **Digest authentication** configured
5. ✅ **Trunk parameter** passed in API call

## 7. The Issue: From Header Not Being Used

The problem is that `register_from_user` and `register_from_domain` are **NOT** being used by the REST dial task to set the From header. The code needs to:

1. Fetch carrier details in create-call.js ✅ (Done)
2. Set target.from object ✅ (Done)
3. Pass callingNumber to Drachtio ✅ (Attempted)
4. **Verify Drachtio uses callingNumber correctly** ❌ (Not working)

## 8. Next Steps

The issue is that the `callingNumber` parameter is not being used correctly by Drachtio. Need to:

1. Check if place-outdial.js is being called for REST dial
2. Verify the callingNumber parameter format
3. Check Drachtio SRF documentation for correct parameter usage
4. Consider using a different approach (e.g., modifying SIP headers directly)

