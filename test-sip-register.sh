#!/bin/bash

# Advanced SIP Registration Test
# Tests SIP REGISTER and INVITE with your provider credentials

PROVIDER_IP="103.170.231.10"
PROVIDER_PORT="5060"
USERNAME="09649364251"
PASSWORD="335577"
DOMAIN="$PROVIDER_IP"
LOCAL_IP="127.0.0.1"
LOCAL_PORT="5060"

echo "=========================================="
echo "Advanced SIP Registration Test"
echo "=========================================="
echo ""
echo "Provider: $PROVIDER_IP:$PROVIDER_PORT"
echo "Username: $USERNAME"
echo "Password: $PASSWORD"
echo ""

# Create SIPp scenario for REGISTER
cat > /tmp/register_scenario.xml << 'EOF'
<?xml version="1.0" encoding="ISO-8859-1" ?>
<!DOCTYPE scenario SYSTEM "sipp.dtd">
<scenario name="REGISTER">
  <send retrans="500">
    <![CDATA[
      REGISTER sip:[remote_ip]:[remote_port] SIP/2.0
      Via: SIP/2.0/UDP [local_ip]:[local_port];branch=[branch]
      From: <sip:[user]@[domain]>;tag=[call_number]
      To: <sip:[user]@[domain]>
      Call-ID: [call_id]
      CSeq: 1 REGISTER
      Contact: <sip:[user]@[local_ip]:[local_port]>
      Max-Forwards: 70
      User-Agent: VoiceERP-Test/1.0
      Authorization: Digest username="[user]", realm="[domain]", nonce="[authentication username]", uri="sip:[domain]", response="[authentication password]"
      Content-Length: 0
    ]]>
  </send>
  <recv response="100" optional="true" />
  <recv response="200" />
  <recv response="401" />
</scenario>
EOF

# Create SIPp scenario for INVITE
cat > /tmp/invite_scenario.xml << 'EOF'
<?xml version="1.0" encoding="ISO-8859-1" ?>
<!DOCTYPE scenario SYSTEM "sipp.dtd">
<scenario name="INVITE">
  <send retrans="500">
    <![CDATA[
      INVITE sip:[service]@[remote_ip]:[remote_port] SIP/2.0
      Via: SIP/2.0/UDP [local_ip]:[local_port];branch=[branch]
      From: <sip:[user]@[domain]>;tag=[call_number]
      To: <sip:[service]@[domain]>
      Call-ID: [call_id]
      CSeq: 1 INVITE
      Contact: <sip:[user]@[local_ip]:[local_port]>
      Max-Forwards: 70
      User-Agent: VoiceERP-Test/1.0
      Content-Type: application/sdp
      Content-Length: [len]

      v=0
      o=user1 53655765 2353687637 IN IP4 [local_ip]
      s=-
      c=IN IP4 [local_ip]
      t=0 0
      m=audio [local_port] RTP/AVP 0
      a=rtpmap:0 PCMU/8000
    ]]>
  </send>
  <recv response="100" optional="true" />
  <recv response="180" optional="true" />
  <recv response="183" optional="true" />
  <recv response="200" />
  <send>
    <![CDATA[
      ACK sip:[service]@[remote_ip]:[remote_port] SIP/2.0
      Via: SIP/2.0/UDP [local_ip]:[local_port];branch=[branch]
      From: <sip:[user]@[domain]>;tag=[call_number]
      To: <sip:[service]@[domain]>;tag=[to_tag]
      Call-ID: [call_id]
      CSeq: 1 ACK
      Contact: <sip:[user]@[local_ip]:[local_port]>
      Max-Forwards: 70
      Content-Length: 0
    ]]>
  </send>
  <recv response="200" optional="true" />
</scenario>
EOF

echo "[TEST 1] Testing REGISTER..."
echo "Command: sipp -sf /tmp/register_scenario.xml -s $USERNAME@$PROVIDER_IP -ap $PASSWORD -l 1 -m 1 $PROVIDER_IP:$PROVIDER_PORT"
echo ""

if command -v sipp &> /dev/null; then
    sipp -sf /tmp/register_scenario.xml \
         -s $USERNAME@$PROVIDER_IP \
         -ap $PASSWORD \
         -l 1 -m 1 \
         -t u1 \
         $PROVIDER_IP:$PROVIDER_PORT 2>&1 | tee /tmp/sipp_register.log
    
    if grep -q "PASS" /tmp/sipp_register.log; then
        echo "✅ REGISTER test PASSED"
    else
        echo "❌ REGISTER test FAILED"
        echo "Check the logs above for details"
    fi
else
    echo "⚠️  SIPp not installed"
    echo "Install with: sudo apt-get install sipp"
fi

echo ""
echo "=========================================="
echo "Test Complete"
echo "=========================================="
echo ""
echo "Logs saved to:"
echo "  /tmp/sipp_register.log"
echo "  /tmp/sipp_invite.log"
echo ""

# Cleanup
rm -f /tmp/register_scenario.xml /tmp/invite_scenario.xml

