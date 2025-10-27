#!/bin/bash

# Script to capture and compare SIP INVITE messages from direct SIP vs VoiceERP calls

set -e

DRACHTIO_CONTAINER="voiceerp-drachtio-fs-1"
FEATURE_SERVER_CONTAINER="voiceerp-feature-server-1"
LOG_DIR="/tmp/sip-capture"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$LOG_DIR"

echo "=========================================="
echo "SIP INVITE Capture and Comparison Script"
echo "=========================================="
echo "Timestamp: $TIMESTAMP"
echo "Log Directory: $LOG_DIR"
echo ""

# Function to get current log size
get_log_size() {
    docker logs "$1" 2>&1 | wc -l
}

# Function to capture logs after a certain line
capture_logs_after() {
    local container=$1
    local start_line=$2
    local output_file=$3
    
    docker logs "$container" 2>&1 | tail -n +$((start_line + 1)) > "$output_file"
}

# Function to extract INVITE details from logs
extract_invite_details() {
    local log_file=$1
    local output_file=$2
    
    echo "=== SIP INVITE Details ===" > "$output_file"
    echo "" >> "$output_file"
    
    # Extract From header
    echo "From Header:" >> "$output_file"
    grep -i "From: <sip:" "$log_file" | head -1 >> "$output_file" 2>/dev/null || echo "Not found" >> "$output_file"
    echo "" >> "$output_file"
    
    # Extract Contact header
    echo "Contact Header:" >> "$output_file"
    grep -i "Contact: <sip:" "$log_file" | head -1 >> "$output_file" 2>/dev/null || echo "Not found" >> "$output_file"
    echo "" >> "$output_file"
    
    # Extract Via header
    echo "Via Header:" >> "$output_file"
    grep -i "Via: SIP" "$log_file" | head -1 >> "$output_file" 2>/dev/null || echo "Not found" >> "$output_file"
    echo "" >> "$output_file"
    
    # Extract Authorization header
    echo "Authorization Header:" >> "$output_file"
    grep -i "Authorization:" "$log_file" | head -1 >> "$output_file" 2>/dev/null || echo "Not found" >> "$output_file"
    echo "" >> "$output_file"
    
    # Extract X-Preferred headers
    echo "X-Preferred Headers:" >> "$output_file"
    grep -i "X-Preferred" "$log_file" >> "$output_file" 2>/dev/null || echo "Not found" >> "$output_file"
    echo "" >> "$output_file"
    
    # Extract Call-ID
    echo "Call-ID:" >> "$output_file"
    grep -i "Call-ID:" "$log_file" | head -1 >> "$output_file" 2>/dev/null || echo "Not found" >> "$output_file"
}

echo "Step 1: Getting initial log line counts..."
DRACHTIO_START=$(get_log_size "$DRACHTIO_CONTAINER")
FEATURE_START=$(get_log_size "$FEATURE_SERVER_CONTAINER")
echo "Drachtio initial lines: $DRACHTIO_START"
echo "Feature Server initial lines: $FEATURE_START"
echo ""

echo "Step 2: Making DIRECT SIP call..."
echo "Run this command in another terminal:"
echo "  cd /Users/moniruz/Projects/web/voiceerp/ai-voice-app && node direct-sip-test.js +8801757158044"
echo ""
echo "Press ENTER when the direct SIP call is complete..."
read

echo "Step 3: Capturing direct SIP call logs..."
DRACHTIO_AFTER_DIRECT=$(get_log_size "$DRACHTIO_CONTAINER")
capture_logs_after "$DRACHTIO_CONTAINER" "$DRACHTIO_START" "$LOG_DIR/drachtio_direct_sip.log"
extract_invite_details "$LOG_DIR/drachtio_direct_sip.log" "$LOG_DIR/direct_sip_details.txt"
echo "✓ Direct SIP logs captured"
echo ""

echo "Step 4: Making VoiceERP call..."
echo "Run this command in another terminal:"
echo "  cd /Users/moniruz/Projects/web/voiceerp/ai-voice-app && node test-call.js +8801757158044"
echo ""
echo "Press ENTER when the VoiceERP call is complete..."
read

echo "Step 5: Capturing VoiceERP call logs..."
capture_logs_after "$DRACHTIO_CONTAINER" "$DRACHTIO_AFTER_DIRECT" "$LOG_DIR/drachtio_voiceerp.log"
extract_invite_details "$LOG_DIR/drachtio_voiceerp.log" "$LOG_DIR/voiceerp_details.txt"
echo "✓ VoiceERP logs captured"
echo ""

echo "Step 6: Comparing SIP INVITE details..."
echo ""
echo "========== DIRECT SIP CALL =========="
cat "$LOG_DIR/direct_sip_details.txt"
echo ""
echo "========== VOICEERP CALL =========="
cat "$LOG_DIR/voiceerp_details.txt"
echo ""

echo "========== COMPARISON =========="
echo "Differences:"
diff -u "$LOG_DIR/direct_sip_details.txt" "$LOG_DIR/voiceerp_details.txt" || true
echo ""

echo "All logs saved to: $LOG_DIR"
echo "✓ Capture complete!"

