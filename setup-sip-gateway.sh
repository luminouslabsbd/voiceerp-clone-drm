#!/bin/bash

# Setup SIP Gateway for Bangladesh Provider
# This script creates the necessary database entries for the SIP gateway

ACCOUNT_SID="9351f46a-678c-43f5-b8a6-d4eb58d131af"
CARRIER_NAME="Bangladesh SIP Provider"
PROVIDER_IP="103.170.231.10"
PROVIDER_PORT="5060"
USERNAME="09649364251"
PASSWORD="335577"

echo "=========================================="
echo "Setting up SIP Gateway"
echo "=========================================="
echo ""

# Step 1: Check if carrier already exists
echo "Step 1: Checking for existing carrier..."
CARRIER_SID=$(docker exec voiceerp-mysql-1 mysql -u jambones -pjambones jambones -N -e "SELECT voip_carrier_sid FROM voip_carriers WHERE name='$CARRIER_NAME' LIMIT 1;" 2>/dev/null)

if [ -z "$CARRIER_SID" ]; then
  echo "  ❌ Carrier not found, creating new one..."
  
  # Create carrier
  docker exec voiceerp-mysql-1 mysql -u jambones -pjambones jambones << EOF 2>/dev/null
INSERT INTO voip_carriers (
  voip_carrier_sid,
  account_sid,
  name,
  requires_register,
  register_sip_realm,
  register_username,
  register_password
) VALUES (
  UUID(),
  '$ACCOUNT_SID',
  '$CARRIER_NAME',
  0,
  '$PROVIDER_IP',
  '$USERNAME',
  '$PASSWORD'
);
EOF
  
  # Get the newly created carrier SID
  CARRIER_SID=$(docker exec voiceerp-mysql-1 mysql -u jambones -pjambones jambones -N -e "SELECT voip_carrier_sid FROM voip_carriers WHERE name='$CARRIER_NAME' LIMIT 1;" 2>/dev/null)
  echo "  ✅ Carrier created: $CARRIER_SID"
else
  echo "  ✅ Carrier found: $CARRIER_SID"
fi

echo ""

# Step 2: Check if SIP gateway already exists
echo "Step 2: Checking for existing SIP gateway..."
GATEWAY_SID=$(docker exec voiceerp-mysql-1 mysql -u jambones -pjambones jambones -N -e "SELECT sip_gateway_sid FROM sip_gateways WHERE ipv4='$PROVIDER_IP' AND voip_carrier_sid='$CARRIER_SID' LIMIT 1;" 2>/dev/null)

if [ -z "$GATEWAY_SID" ]; then
  echo "  ❌ SIP gateway not found, creating new one..."
  
  # Create SIP gateway
  docker exec voiceerp-mysql-1 mysql -u jambones -pjambones jambones << EOF 2>/dev/null
INSERT INTO sip_gateways (
  sip_gateway_sid,
  voip_carrier_sid,
  ipv4,
  port,
  inbound,
  outbound,
  register,
  username,
  password,
  sip_realm
) VALUES (
  UUID(),
  '$CARRIER_SID',
  '$PROVIDER_IP',
  $PROVIDER_PORT,
  1,
  1,
  0,
  '$USERNAME',
  '$PASSWORD',
  '$PROVIDER_IP'
);
EOF
  
  # Get the newly created gateway SID
  GATEWAY_SID=$(docker exec voiceerp-mysql-1 mysql -u jambones -pjambones jambones -N -e "SELECT sip_gateway_sid FROM sip_gateways WHERE ipv4='$PROVIDER_IP' AND voip_carrier_sid='$CARRIER_SID' LIMIT 1;" 2>/dev/null)
  echo "  ✅ SIP gateway created: $GATEWAY_SID"
else
  echo "  ✅ SIP gateway found: $GATEWAY_SID"
fi

echo ""

# Step 3: Verify the setup
echo "Step 3: Verifying setup..."
echo ""

echo "Carrier Details:"
docker exec voiceerp-mysql-1 mysql -u jambones -pjambones jambones -e "SELECT voip_carrier_sid, name, account_sid FROM voip_carriers WHERE voip_carrier_sid='$CARRIER_SID';" 2>/dev/null | tail -2

echo ""
echo "Gateway Details:"
docker exec voiceerp-mysql-1 mysql -u jambones -pjambones jambones -e "SELECT sip_gateway_sid, ipv4, port, username FROM sip_gateways WHERE sip_gateway_sid='$GATEWAY_SID';" 2>/dev/null | tail -2

echo ""
echo "=========================================="
echo "✅ SIP Gateway setup complete!"
echo "=========================================="
echo ""
echo "Configuration:"
echo "  Carrier Name: $CARRIER_NAME"
echo "  Provider IP: $PROVIDER_IP:$PROVIDER_PORT"
echo "  Username: $USERNAME"
echo "  Carrier SID: $CARRIER_SID"
echo "  Gateway SID: $GATEWAY_SID"
echo ""
echo "Next steps:"
echo "  1. Restart Feature Server: docker restart voiceerp-feature-server-1"
echo "  2. Test call: node test-call.js +8801757158044"
echo ""

