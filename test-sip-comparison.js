#!/usr/bin/env node

/**
 * Test script to compare SIP INVITE messages from direct SIP vs VoiceERP calls
 * This script will:
 * 1. Capture logs before and after each call
 * 2. Extract SIP INVITE details
 * 3. Compare the headers
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DRACHTIO_CONTAINER = 'voiceerp-drachtio-fs-1';
const LOG_DIR = '/tmp/sip-comparison';
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');

// Create log directory
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function executeCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error && !stderr.includes('No such file')) {
        reject(error);
      } else {
        resolve(stdout + stderr);
      }
    });
  });
}

function getLogLineCount() {
  return new Promise((resolve, reject) => {
    exec(`docker logs ${DRACHTIO_CONTAINER} 2>&1 | wc -l`, (error, stdout) => {
      if (error) reject(error);
      else resolve(parseInt(stdout.trim()));
    });
  });
}

function captureLogsSince(startLine, outputFile) {
  return new Promise((resolve, reject) => {
    exec(`docker logs ${DRACHTIO_CONTAINER} 2>&1 | tail -n +${startLine + 1} > ${outputFile}`, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function extractInviteDetails(logFile) {
  const details = {};
  
  if (!fs.existsSync(logFile)) {
    return details;
  }

  const content = fs.readFileSync(logFile, 'utf-8');
  const lines = content.split('\n');

  // Extract From header
  const fromMatch = lines.find(l => l.includes('From: <sip:'));
  if (fromMatch) {
    const match = fromMatch.match(/From: <sip:([^>]+)>/);
    if (match) details.from = match[1];
  }

  // Extract Contact header
  const contactMatch = lines.find(l => l.includes('Contact: <sip:'));
  if (contactMatch) {
    const match = contactMatch.match(/Contact: <sip:([^>]+)>/);
    if (match) details.contact = match[1];
  }

  // Extract Via header
  const viaMatch = lines.find(l => l.includes('Via: SIP'));
  if (viaMatch) {
    const match = viaMatch.match(/Via: SIP\/2\.0\/UDP ([^;]+)/);
    if (match) details.via = match[1];
  }

  // Extract Authorization header
  const authMatch = lines.find(l => l.includes('Authorization:'));
  if (authMatch) {
    details.auth = authMatch.substring(0, 100) + '...';
  }

  // Extract X-Preferred headers
  const xPreferredLines = lines.filter(l => l.includes('X-Preferred'));
  if (xPreferredLines.length > 0) {
    details.xPreferred = xPreferredLines;
  }

  // Extract Call-ID
  const callIdMatch = lines.find(l => l.includes('Call-ID:'));
  if (callIdMatch) {
    const match = callIdMatch.match(/Call-ID: ([^\r\n]+)/);
    if (match) details.callId = match[1];
  }

  return details;
}

function printDetails(title, details) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${title}`);
  console.log('='.repeat(60));
  
  if (Object.keys(details).length === 0) {
    console.log('No details found');
    return;
  }

  console.log(`From Header:        ${details.from || 'NOT FOUND'}`);
  console.log(`Contact Header:     ${details.contact || 'NOT FOUND'}`);
  console.log(`Via Header:         ${details.via || 'NOT FOUND'}`);
  console.log(`Authorization:      ${details.auth || 'NOT FOUND'}`);
  console.log(`Call-ID:            ${details.callId || 'NOT FOUND'}`);
  
  if (details.xPreferred && details.xPreferred.length > 0) {
    console.log(`X-Preferred Headers:`);
    details.xPreferred.forEach(h => console.log(`  ${h}`));
  } else {
    console.log(`X-Preferred Headers: NONE`);
  }
}

function compareDetails(direct, voiceerp) {
  console.log(`\n${'='.repeat(60)}`);
  console.log('COMPARISON');
  console.log('='.repeat(60));

  const keys = ['from', 'contact', 'via', 'callId'];
  
  keys.forEach(key => {
    const directVal = direct[key] || 'NOT FOUND';
    const voiceerpVal = voiceerp[key] || 'NOT FOUND';
    const match = directVal === voiceerpVal ? '✓' : '✗';
    
    console.log(`\n${key.toUpperCase()}:`);
    console.log(`  Direct SIP:  ${directVal}`);
    console.log(`  VoiceERP:    ${voiceerpVal}`);
    console.log(`  Match:       ${match}`);
  });

  // Check X-Preferred headers
  console.log(`\nX-PREFERRED HEADERS:`);
  if (voiceerp.xPreferred && voiceerp.xPreferred.length > 0) {
    console.log(`  VoiceERP has X-Preferred headers: ✓`);
    voiceerp.xPreferred.forEach(h => console.log(`    ${h}`));
  } else {
    console.log(`  VoiceERP has X-Preferred headers: ✗`);
  }
}

async function main() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('SIP INVITE Comparison Test');
    console.log('='.repeat(60));
    console.log(`Timestamp: ${TIMESTAMP}`);
    console.log(`Log Directory: ${LOG_DIR}\n`);

    // Step 1: Get initial log count
    console.log('Step 1: Getting initial log line count...');
    const initialLines = await getLogLineCount();
    console.log(`Initial log lines: ${initialLines}\n`);

    // Step 2: Make direct SIP call
    console.log('Step 2: Make DIRECT SIP call');
    console.log('Run this command in another terminal:');
    console.log('  cd /Users/moniruz/Projects/web/voiceerp/ai-voice-app && node direct-sip-test.js +8801757158044\n');
    
    await new Promise(resolve => rl.question('Press ENTER when direct SIP call is complete: ', resolve));

    // Capture direct SIP logs
    const afterDirectLines = await getLogLineCount();
    const directLogFile = path.join(LOG_DIR, `direct_sip_${TIMESTAMP}.log`);
    await captureLogsSince(initialLines, directLogFile);
    const directDetails = extractInviteDetails(directLogFile);
    printDetails('DIRECT SIP CALL', directDetails);

    // Step 3: Make VoiceERP call
    console.log('\n\nStep 3: Make VOICEERP call');
    console.log('Run this command in another terminal:');
    console.log('  cd /Users/moniruz/Projects/web/voiceerp/ai-voice-app && node test-call.js +8801757158044\n');
    
    await new Promise(resolve => rl.question('Press ENTER when VoiceERP call is complete: ', resolve));

    // Capture VoiceERP logs
    const voiceerpLogFile = path.join(LOG_DIR, `voiceerp_${TIMESTAMP}.log`);
    await captureLogsSince(afterDirectLines, voiceerpLogFile);
    const voiceerpDetails = extractInviteDetails(voiceerpLogFile);
    printDetails('VOICEERP CALL', voiceerpDetails);

    // Step 4: Compare
    compareDetails(directDetails, voiceerpDetails);

    console.log(`\n\nAll logs saved to: ${LOG_DIR}`);
    console.log('✓ Comparison complete!\n');

    rl.close();
  } catch (error) {
    console.error('Error:', error.message);
    rl.close();
    process.exit(1);
  }
}

main();

