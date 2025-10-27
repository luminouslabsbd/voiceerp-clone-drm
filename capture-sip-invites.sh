#!/bin/bash

# Capture SIP INVITE requests to compare direct vs VoiceERP

echo "=========================================="
echo "SIP INVITE Capture Script"
echo "=========================================="
echo ""

# Create output directory
mkdir -p /tmp/sip-captures
cd /tmp/sip-captures

echo "Starting tcpdump to capture SIP traffic..."
echo "Capturing to: /tmp/sip-captures/sip.pcap"
echo ""

# Start tcpdump in background
sudo tcpdump -i any -n 'port 5060' -w sip.pcap &
TCPDUMP_PID=$!

echo "tcpdump started (PID: $TCPDUMP_PID)"
echo ""

# Wait a moment for tcpdump to start
sleep 2

echo "=========================================="
echo "Step 1: Direct SIP Call"
echo "=========================================="
echo "Making direct SIP call to +8801757158044..."
cd /Users/moniruz/Projects/web/voiceerp
node direct-sip-call-final.js
echo ""

# Wait a moment
sleep 3

echo "=========================================="
echo "Step 2: VoiceERP Call"
echo "=========================================="
echo "Making VoiceERP call to +8801757158044..."
cd /Users/moniruz/Projects/web/voiceerp/ai-voice-app
node test-call.js +8801757158044
echo ""

# Wait a moment
sleep 3

echo "=========================================="
echo "Stopping tcpdump..."
echo "=========================================="

# Stop tcpdump
kill $TCPDUMP_PID
wait $TCPDUMP_PID 2>/dev/null

echo ""
echo "Capture complete!"
echo ""

# Convert pcap to text format
echo "Converting pcap to text format..."
cd /tmp/sip-captures
tcpdump -r sip.pcap -A > sip-traffic.txt

echo ""
echo "=========================================="
echo "SIP Traffic Analysis"
echo "=========================================="
echo ""

# Extract INVITE requests
echo "DIRECT SIP INVITE:"
echo "=================="
grep -A 30 "INVITE sip:" sip-traffic.txt | head -40
echo ""

echo "VOICEERP SIP INVITE:"
echo "===================="
grep -A 30 "INVITE sip:" sip-traffic.txt | tail -40
echo ""

# Save to files for comparison
echo "Saving detailed analysis..."
grep -B 5 -A 30 "INVITE sip:" sip-traffic.txt > /tmp/sip-captures/invite-requests.txt

echo "Files saved:"
echo "  - /tmp/sip-captures/sip.pcap (binary)"
echo "  - /tmp/sip-captures/sip-traffic.txt (text)"
echo "  - /tmp/sip-captures/invite-requests.txt (INVITE requests only)"
echo ""

echo "To view the captures:"
echo "  cat /tmp/sip-captures/sip-traffic.txt"
echo "  cat /tmp/sip-captures/invite-requests.txt"
echo ""

