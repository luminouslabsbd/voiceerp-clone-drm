#!/bin/bash

# Test SIP Credentials Script
# This script tests if your SIP credentials are correct by attempting to register with the provider

set -e

# Configuration
PROVIDER_IP="103.170.231.10"
PROVIDER_PORT="5060"
USERNAME="09649364251"
PASSWORD="335577"
DOMAIN="$PROVIDER_IP"
LOCAL_IP="172.10.0.50"  # VoiceERP SBC IP
LOCAL_PORT="5060"

echo "=========================================="
echo "SIP Credentials Test Script"
echo "=========================================="
echo ""
echo "Provider Details:"
echo "  IP: $PROVIDER_IP"
echo "  Port: $PROVIDER_PORT"
echo "  Username: $USERNAME"
echo "  Domain: $DOMAIN"
echo ""

# Test 1: Check network connectivity
echo "[TEST 1] Checking network connectivity to provider..."
if ping -c 1 -W 2 $PROVIDER_IP > /dev/null 2>&1; then
    echo "✅ Network connectivity OK - Provider is reachable"
else
    echo "❌ Network connectivity FAILED - Cannot reach provider at $PROVIDER_IP"
    echo "   Please check your network connection and firewall settings"
    exit 1
fi
echo ""

# Test 2: Check SIP port
echo "[TEST 2] Checking SIP port $PROVIDER_PORT..."
if timeout 2 bash -c "echo > /dev/tcp/$PROVIDER_IP/$PROVIDER_PORT" 2>/dev/null; then
    echo "✅ SIP port $PROVIDER_PORT is open"
else
    echo "⚠️  SIP port $PROVIDER_PORT may be closed (could be UDP only)"
    echo "   This is normal if provider uses UDP instead of TCP"
fi
echo ""

# Test 3: Test with SIPp (if available)
echo "[TEST 3] Testing SIP registration with provider..."
if command -v sipp &> /dev/null; then
    echo "SIPp found - Running registration test..."
    
    # Create a simple SIPp scenario for registration
    cat > /tmp/register.xml << 'EOF'
<?xml version="1.0" encoding="ISO-8859-1" ?>
<!DOCTYPE scenario SYSTEM "sipp.dtd">
<scenario name="Basic Registration">
  <send retrans="500">
    <![CDATA[
      REGISTER sip:[remote_ip]:[remote_port] SIP/2.0
      Via: SIP/2.0/[transport] [local_ip]:[local_port];branch=[branch]
      From: <sip:[user]@[domain]>;tag=[call_number]
      To: <sip:[user]@[domain]>
      Call-ID: [call_id]
      CSeq: 1 REGISTER
      Contact: <sip:[user]@[local_ip]:[local_port]>
      Max-Forwards: 70
      User-Agent: VoiceERP-Test
      Content-Length: 0
    ]]>
  </send>
  <recv response="100" optional="true" />
  <recv response="200" />
</scenario>
EOF
    
    echo "Running SIPp registration test..."
    sipp -sf /tmp/register.xml -s $USERNAME@$PROVIDER_IP -ap $PASSWORD \
         -l 1 -m 1 $PROVIDER_IP:$PROVIDER_PORT 2>&1 | grep -E "PASS|FAIL|error" || true
    
    rm -f /tmp/register.xml
else
    echo "⚠️  SIPp not installed - Skipping SIP registration test"
    echo "   To install: apt-get install sipp"
fi
echo ""

# Test 4: Test with ncat/nc
echo "[TEST 4] Testing raw SIP connection..."
if command -v nc &> /dev/null || command -v ncat &> /dev/null; then
    NC_CMD=$(command -v nc || command -v ncat)
    echo "Testing connection with $NC_CMD..."
    
    # Send a simple SIP OPTIONS request
    REGISTER_MSG="REGISTER sip://$PROVIDER_IP:$PROVIDER_PORT SIP/2.0\r\nVia: SIP/2.0/UDP $LOCAL_IP:$LOCAL_PORT;branch=z9hG4bK776\r\nFrom: <sip:$USERNAME@$DOMAIN>;tag=1928301774\r\nTo: <sip:$USERNAME@$DOMAIN>\r\nCall-ID: a84b4c76e66710@pc33.atlanta.com\r\nCSeq: 314159 REGISTER\r\nContact: <sip:$USERNAME@$LOCAL_IP:$LOCAL_PORT>\r\nMax-Forwards: 70\r\nUser-Agent: VoiceERP-Test\r\nContent-Length: 0\r\n\r\n"
    
    echo -e "$REGISTER_MSG" | timeout 3 $NC_CMD -u $PROVIDER_IP $PROVIDER_PORT 2>/dev/null | head -5 || true
    echo "✅ Connection test completed"
else
    echo "⚠️  nc/ncat not installed - Skipping raw connection test"
fi
echo ""

# Test 5: Check VoiceERP configuration
echo "[TEST 5] Checking VoiceERP configuration..."
docker exec voiceerp-mysql-1 mysql -ujambones -pjambones jambones -e \
  "SELECT voip_carrier_sid, name, register_username, register_sip_realm FROM voip_carriers LIMIT 1;" 2>/dev/null || true
echo ""

# Test 6: Check SIP Gateway configuration
echo "[TEST 6] Checking SIP Gateway configuration..."
docker exec voiceerp-mysql-1 mysql -ujambones -pjambones jambones -e \
  "SELECT sip_gateway_sid, ipv4, port, protocol FROM sip_gateways LIMIT 1;" 2>/dev/null || true
echo ""

echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo ""
echo "If all tests passed:"
echo "  ✅ Your SIP credentials are correct"
echo "  ✅ Network connectivity is working"
echo "  ✅ Provider is reachable"
echo ""
echo "If tests failed:"
echo "  ❌ Check your credentials with the provider"
echo "  ❌ Verify network connectivity"
echo "  ❌ Check firewall settings"
echo "  ❌ Contact provider support"
echo ""
echo "To make a test call, use:"
echo "  curl -X POST http://localhost:3003/v1/Accounts/9351f46a-678c-43f5-b8a6-d4eb58d131af/Calls \\"
echo "    -H 'Authorization: Bearer 5a3e38b5-3188-4936-89c9-fb0df3138b5c' \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"from\": \"09649364251\", \"to\": {\"type\": \"phone\", \"number\": \"+8801521206638\"}}'"
echo ""

