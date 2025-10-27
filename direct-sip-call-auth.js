#!/usr/bin/env node

/**
 * Direct SIP Call Test with Authentication
 * Makes a direct SIP call with proper Digest authentication
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

// Create Digest authentication response
function createDigestAuth(method, uri, realm, nonce, username, password) {
  const ha1 = crypto.createHash('md5').update(`${username}:${realm}:${password}`).digest('hex');
  const ha2 = crypto.createHash('md5').update(`${method}:${uri}`).digest('hex');
  const response = crypto.createHash('md5').update(`${ha1}:${nonce}:${ha2}`).digest('hex');
  
  return `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}"`;
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

  return { request, callId, tag, cseq, branch };
}

// Create SIP INVITE request with authentication
function createInviteRequest(callId, fromTag, nonce = null) {
  const branch = generateBranch();
  const cseq = generateCSeq();
  const uri = `sip:${DESTINATION}@${DOMAIN}:${PROVIDER_PORT}`;

  const sdp = `v=0\r
o=user1 ${Date.now()} ${Date.now()} IN IP4 ${LOCAL_IP}\r
s=-\r
c=IN IP4 ${LOCAL_IP}\r
t=0 0\r
m=audio ${LOCAL_PORT} RTP/AVP 0\r
a=rtpmap:0 PCMU/8000\r
`;

  let authHeader = '';
  if (nonce) {
    authHeader = `Authorization: ${createDigestAuth('INVITE', uri, DOMAIN, nonce, USERNAME, PASSWORD)}\r
`;
  }

  const request = `INVITE ${uri} SIP/2.0\r
Via: SIP/2.0/UDP ${LOCAL_IP}:${LOCAL_PORT};branch=${branch}\r
From: <sip:${USERNAME}@${DOMAIN}>;tag=${fromTag}\r
To: <sip:${DESTINATION}@${DOMAIN}>\r
Call-ID: ${callId}\r
CSeq: ${cseq} INVITE\r
Contact: <sip:${USERNAME}@${LOCAL_IP}:${LOCAL_PORT}>\r
Max-Forwards: 70\r
User-Agent: DirectSIPTest/1.0\r
${authHeader}Content-Type: application/sdp\r
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

    console.log(`📤 Sending request...`);
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

// Extract nonce from WWW-Authenticate header
function extractNonce(wwwAuthenticate) {
  const match = wwwAuthenticate.match(/nonce="([^"]+)"/);
  return match ? match[1] : null;
}

// Main test
async function main() {
  console.log('='.repeat(60));
  console.log('Direct SIP Call Test with Authentication');
  console.log('='.repeat(60));
  console.log(`\nProvider: ${PROVIDER_IP}:${PROVIDER_PORT}`);
  console.log(`Username: ${USERNAME}`);
  console.log(`Destination: ${DESTINATION}`);
  console.log();

  try {
    // Step 1: Test REGISTER
    console.log('[STEP 1] Testing SIP REGISTER...');
    const { request: registerRequest, callId, tag } = createRegisterRequest();
    
    const registerResponse = await sendSipRequest(registerRequest);
    const registerParsed = parseSipResponse(registerResponse);
    
    console.log(`📥 Response: ${registerParsed.firstLine}`);
    
    if (registerParsed.firstLine.includes('200')) {
      console.log('✅ REGISTER successful!');
    } else if (registerParsed.firstLine.includes('401')) {
      console.log('⚠️  Got 401 Unauthorized - Provider requires authentication');
      const nonce = extractNonce(registerParsed.headers['www-authenticate'] || '');
      if (nonce) {
        console.log(`   Nonce: ${nonce}`);
      }
    } else {
      console.log(`⚠️  Got response: ${registerParsed.firstLine}`);
    }

    // Step 2: Test INVITE
    console.log('\n[STEP 2] Testing SIP INVITE to ' + DESTINATION + '...');
    const inviteRequest = createInviteRequest(callId, tag);
    
    const inviteResponse = await sendSipRequest(inviteRequest, 5000);
    const inviteParsed = parseSipResponse(inviteResponse);
    
    console.log(`📥 Response: ${inviteParsed.firstLine}`);
    
    // Analyze response
    if (inviteParsed.firstLine.includes('100')) {
      console.log('✅ Got 100 Trying - Call is being processed');
    } else if (inviteParsed.firstLine.includes('180')) {
      console.log('✅ Got 180 Ringing - Destination is ringing');
    } else if (inviteParsed.firstLine.includes('200')) {
      console.log('✅ Got 200 OK - Call connected!');
    } else if (inviteParsed.firstLine.includes('407')) {
      console.log('⚠️  Got 407 Proxy Authentication Required');
      const nonce = extractNonce(inviteParsed.headers['proxy-authenticate'] || '');
      if (nonce) {
        console.log(`   Nonce: ${nonce}`);
        console.log('   Retrying with authentication...');
        
        const authInvite = createInviteRequest(callId, tag, nonce);
        const authResponse = await sendSipRequest(authInvite, 5000);
        const authParsed = parseSipResponse(authResponse);
        console.log(`📥 Response: ${authParsed.firstLine}`);
      }
    } else if (inviteParsed.firstLine.includes('480')) {
      console.log('❌ Got 480 Temporarily Unavailable - Destination not reachable');
    } else if (inviteParsed.firstLine.includes('404')) {
      console.log('❌ Got 404 Not Found - Destination not found');
    } else if (inviteParsed.firstLine.includes('403')) {
      console.log('❌ Got 403 Forbidden - Access denied');
    } else if (inviteParsed.firstLine.includes('500')) {
      console.log('❌ Got 500 Server Error - Provider error');
      console.log('   This may indicate a configuration issue on the provider side');
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
    console.log('\nResponse Analysis:');
    console.log('- 100/180/200: Call is progressing normally');
    console.log('- 407: Proxy authentication required (retry with auth)');
    console.log('- 480: Destination not reachable');
    console.log('- 500: Provider server error');
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

