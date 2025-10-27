#!/bin/bash

# Script to test and compare SIP INVITE messages

set -e

DRACHTIO_CONTAINER="voiceerp-drachtio-fs-1"
LOG_DIR="/tmp/sip-test-$(date +%s)"
mkdir -p "$LOG_DIR"

echo "=========================================="
echo "SIP INVITE Test and Comparison"
echo "=========================================="
echo "Log Directory: $LOG_DIR"
echo ""

# Function to get current log line count
get_log_lines() {
    docker logs "$DRACHTIO_CONTAINER" 2>&1 | wc -l
}

# Function to save logs from line N onwards
save_logs_from() {
    local start_line=$1
    local output_file=$2
    docker logs "$DRACHTIO_CONTAINER" 2>&1 | tail -n +$((start_line + 1)) > "$output_file"
}

# Function to extract SIP INVITE details
extract_details() {
    local log_file=$1
    local output_file=$2
    
    {
        echo "=== SIP INVITE Details ==="
        echo ""
        echo "From Header:"
        grep -i "From: <sip:" "$log_file" | head -1 || echo "NOT FOUND"
        echo ""
        echo "Contact Header:"
        grep -i "Contact: <sip:" "$log_file" | head -1 || echo "NOT FOUND"
        echo ""
        echo "Via Header:"
        grep -i "Via: SIP" "$log_file" | head -1 || echo "NOT FOUND"
        echo ""
        echo "X-Preferred Headers:"
        grep -i "X-Preferred" "$log_file" || echo "NONE"
        echo ""
        echo "Call-ID:"
        grep -i "Call-ID:" "$log_file" | head -1 || echo "NOT FOUND"
        echo ""
        echo "Authorization:"
        grep -i "Authorization:" "$log_file" | head -1 || echo "NOT FOUND"
    } > "$output_file"
}

echo "Step 1: Getting initial log line count..."
INITIAL_LINES=$(get_log_lines)
echo "Initial lines: $INITIAL_LINES"
echo ""

echo "Step 2: Making DIRECT SIP call..."
echo "Command: cd /Users/moniruz/Projects/web/voiceerp/ai-voice-app && node direct-sip-test.js +8801757158044"
echo ""
read -p "Press ENTER when direct SIP call is complete: "

echo "Capturing direct SIP logs..."
AFTER_DIRECT=$(get_log_lines)
save_logs_from "$INITIAL_LINES" "$LOG_DIR/direct_sip.log"
extract_details "$LOG_DIR/direct_sip.log" "$LOG_DIR/direct_sip_details.txt"
echo "✓ Direct SIP logs captured"
echo ""

echo "Step 3: Making VOICEERP call..."
echo "Command: cd /Users/moniruz/Projects/web/voiceerp/ai-voice-app && node test-call.js +8801757158044"
echo ""
read -p "Press ENTER when VoiceERP call is complete: "

echo "Capturing VoiceERP logs..."
save_logs_from "$AFTER_DIRECT" "$LOG_DIR/voiceerp.log"
extract_details "$LOG_DIR/voiceerp.log" "$LOG_DIR/voiceerp_details.txt"
echo "✓ VoiceERP logs captured"
echo ""

echo "========== DIRECT SIP CALL =========="
cat "$LOG_DIR/direct_sip_details.txt"
echo ""

echo "========== VOICEERP CALL =========="
cat "$LOG_DIR/voiceerp_details.txt"
echo ""

echo "========== COMPARISON =========="
echo "Checking differences..."
echo ""

# Compare From headers
DIRECT_FROM=$(grep "From: <sip:" "$LOG_DIR/direct_sip_details.txt" | head -1 || echo "NOT FOUND")
VOICEERP_FROM=$(grep "From: <sip:" "$LOG_DIR/voiceerp_details.txt" | head -1 || echo "NOT FOUND")

echo "From Header Comparison:"
echo "  Direct SIP:  $DIRECT_FROM"
echo "  VoiceERP:    $VOICEERP_FROM"
if [ "$DIRECT_FROM" = "$VOICEERP_FROM" ]; then
    echo "  Result:      ✓ MATCH"
else
    echo "  Result:      ✗ DIFFERENT"
fi
echo ""

# Compare Contact headers
DIRECT_CONTACT=$(grep "Contact: <sip:" "$LOG_DIR/direct_sip_details.txt" | head -1 || echo "NOT FOUND")
VOICEERP_CONTACT=$(grep "Contact: <sip:" "$LOG_DIR/voiceerp_details.txt" | head -1 || echo "NOT FOUND")

echo "Contact Header Comparison:"
echo "  Direct SIP:  $DIRECT_CONTACT"
echo "  VoiceERP:    $VOICEERP_CONTACT"
if [ "$DIRECT_CONTACT" = "$VOICEERP_CONTACT" ]; then
    echo "  Result:      ✓ MATCH"
else
    echo "  Result:      ✗ DIFFERENT"
fi
echo ""

# Check X-Preferred headers
VOICEERP_XPREF=$(grep -c "X-Preferred" "$LOG_DIR/voiceerp_details.txt" || echo "0")
echo "X-Preferred Headers in VoiceERP:"
if [ "$VOICEERP_XPREF" -gt 0 ]; then
    echo "  ✓ PRESENT"
    grep "X-Preferred" "$LOG_DIR/voiceerp_details.txt"
else
    echo "  ✗ NOT FOUND"
fi
echo ""

echo "All logs saved to: $LOG_DIR"
echo "✓ Test complete!"

