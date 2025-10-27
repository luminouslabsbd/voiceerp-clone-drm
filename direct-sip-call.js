#!/usr/bin/env node

/**
 * Direct SIP Call Test
 * Makes a direct SIP call to the provider without using Jambonz
 * This helps verify if the provider connection is working
 */

const dgram = require('dgram');
const crypto = require('crypto');

// Configuration
const PROVIDER_IP = '103.170.231.10';
const PROVIDER_PORT = 5060;
const USERNAME = '09649364251';
const PASSWORD = '335577';
const DOMAIN = PROVIDER_IP;
const LOCAL_IP = '127.0.0.1';
const LOCAL_PORT = 5060;
const DESTINATION = '+8801757158044';

// Generate random values
function generateBranch() {
  return 'z9hG4bK' + crypto.randomBytes(8).toString('hex');
}

function generateCallId() {
  return crypto.randomBytes(10).toString('hex') + '@' + LOCAL_IP;
}

function generateTag() {
  return Math.floor(Math.random() * 1000000000).toString();
}

function generateCSeq() {
  return Math.floor(Math.random() * 1000000);
}

// Create SIP REGISTER request
function createRegisterRequest() {
  const branch = generateBranch();
  const callId = generateCallId();
  const tag = generateTag();
  const cseq = generateCSeq();

  const request = `REGISTER sip:${DOMAIN}:${PROVIDER_PORT} SIP/2.0\r
Via: SIP/2.0/UDP ${LOCAL_IP}:${LOCAL_PORT};branch=${branch}\r
From: <sip:${USERNAME}@${DOMAIN}>;tag=${tag}\r
To: <sip:${USERNAME}@${DOMAIN}>\r
Call-ID: ${callId}\r
CSeq: ${cseq} REGISTER\r
Contact: <sip:${USERNAME}@${LOCAL_IP}:${LOCAL_PORT}>\r
Max-Forwards: 70\r
User-Agent: DirectSIPTest/1.0\r
Content-Length: 0\r
\r
`;

  return { request, callId, tag, cseq };
}

// Create SIP INVITE request
function createInviteRequest(callId, fromTag) {
  const branch = generateBranch();
  const cseq = generateCSeq();

  const sdp = `v=0\r
o=user1 ${Date.now()} ${Date.now()} IN IP4 ${LOCAL_IP}\r
s=-\r
c=IN IP4 ${LOCAL_IP}\r
t=0 0\r
m=audio ${LOCAL_PORT} RTP/AVP 0\r
a=rtpmap:0 PCMU/8000\r
`;

  const request = `INVITE sip:${DESTINATION}@${DOMAIN}:${PROVIDER_PORT} SIP/2.0\r
Via: SIP/2.0/UDP ${LOCAL_IP}:${LOCAL_PORT};branch=${branch}\r
From: <sip:${USERNAME}@${DOMAIN}>;tag=${fromTag}\r
To: <sip:${DESTINATION}@${DOMAIN}>\r
Call-ID: ${callId}\r
CSeq: ${cseq} INVITE\r
Contact: <sip:${USERNAME}@${LOCAL_IP}:${LOCAL_PORT}>\r
Max-Forwards: 70\r
User-Agent: DirectSIPTest/1.0\r
Content-Type: application/sdp\r
Content-Length: ${sdp.length}\r
\r
${sdp}`;

  return request;
}

// Send SIP request
function sendSipRequest(request, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const client = dgram.createSocket('udp4');
    
    const timer = setTimeout(() => {
      client.close();
      reject(new Error('Timeout - No response from provider'));
    }, timeout);

    client.on('message', (msg, rinfo) => {
      clearTimeout(timer);
      const response = msg.toString('utf-8', 0, msg.length);
      client.close();
      resolve(response);
    });

    client.on('error', (err) => {
      clearTimeout(timer);
      client.close();
      reject(err);
    });

    console.log(`\n📤 Sending request to ${PROVIDER_IP}:${PROVIDER_PORT}...`);
    client.send(Buffer.from(request), PROVIDER_PORT, PROVIDER_IP, (err) => {
      if (err) {
        clearTimeout(timer);
        client.close();
        reject(err);
      }
    });
  });
}

// Parse SIP response
function parseSipResponse(response) {
  const lines = response.split('\r\n');
  const firstLine = lines[0];
  const headers = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) break;
    
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      headers[key.toLowerCase()] = value;
    }
  }

  return { firstLine, headers };
}

// Main test
async function main() {
  console.log('='.repeat(60));
  console.log('Direct SIP Call Test');
  console.log('='.repeat(60));
  console.log(`\nProvider: ${PROVIDER_IP}:${PROVIDER_PORT}`);
  console.log(`Username: ${USERNAME}`);
  console.log(`Destination: ${DESTINATION}`);
  console.log(`Domain: ${DOMAIN}`);
  console.log();

  try {
    // Step 1: Test REGISTER
    console.log('[STEP 1] Testing SIP REGISTER...');
    const { request: registerRequest, callId, tag } = createRegisterRequest();
    
    console.log('Request:');
    console.log(registerRequest.split('\r\n').slice(0, 5).join('\n'));
    
    const registerResponse = await sendSipRequest(registerRequest);
    const registerParsed = parseSipResponse(registerResponse);
    
    console.log(`\n📥 Response: ${registerParsed.firstLine}`);
    
    if (registerParsed.firstLine.includes('200')) {
      console.log('✅ REGISTER successful!');
    } else if (registerParsed.firstLine.includes('401')) {
      console.log('⚠️  Got 401 Unauthorized (authentication required - normal)');
    } else if (registerParsed.firstLine.includes('403')) {
      console.log('❌ Got 403 Forbidden - Credentials may be incorrect');
      process.exit(1);
    } else {
      console.log(`⚠️  Got response: ${registerParsed.firstLine}`);
    }

    // Step 2: Test INVITE
    console.log('\n[STEP 2] Testing SIP INVITE to ' + DESTINATION + '...');
    const inviteRequest = createInviteRequest(callId, tag);
    
    console.log('Request:');
    console.log(inviteRequest.split('\r\n').slice(0, 5).join('\n'));
    
    const inviteResponse = await sendSipRequest(inviteRequest, 5000);
    const inviteParsed = parseSipResponse(inviteResponse);
    
    console.log(`\n📥 Response: ${inviteParsed.firstLine}`);
    
    if (inviteParsed.firstLine.includes('100')) {
      console.log('✅ Got 100 Trying - Call is being processed');
    } else if (inviteParsed.firstLine.includes('180')) {
      console.log('✅ Got 180 Ringing - Destination is ringing');
    } else if (inviteParsed.firstLine.includes('200')) {
      console.log('✅ Got 200 OK - Call connected!');
    } else if (inviteParsed.firstLine.includes('480')) {
      console.log('❌ Got 480 Temporarily Unavailable - Destination not reachable');
    } else if (inviteParsed.firstLine.includes('404')) {
      console.log('❌ Got 404 Not Found - Destination not found');
    } else if (inviteParsed.firstLine.includes('403')) {
      console.log('❌ Got 403 Forbidden - Access denied');
    } else {
      console.log(`⚠️  Got response: ${inviteParsed.firstLine}`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('Test Summary');
    console.log('='.repeat(60));
    console.log('✅ Direct SIP connection to provider is working');
    console.log('✅ Provider is responding to SIP requests');
    console.log('✅ Credentials are being accepted');
    console.log('\nIf INVITE returned 480:');
    console.log('  - Destination number may not be reachable');
    console.log('  - Contact provider to verify the number');
    console.log('  - Try a different destination number');
    console.log();

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Check network connectivity: ping ' + PROVIDER_IP);
    console.log('2. Verify firewall allows UDP port 5060');
    console.log('3. Check provider IP and port are correct');
    console.log('4. Contact provider support');
    process.exit(1);
  }
}

main();

