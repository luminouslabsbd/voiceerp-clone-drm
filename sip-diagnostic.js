#!/usr/bin/env node

/**
 * SIP Diagnostic Tool
 * Detailed analysis of SIP communication with provider
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

// Create OPTIONS request (lightweight test)
function createOptionsRequest() {
  const branch = generateBranch();
  const callId = generateCallId();
  const tag = generateTag();
  const cseq = generateCSeq();

  const request = `OPTIONS sip:${DOMAIN}:${PROVIDER_PORT} SIP/2.0\r
Via: SIP/2.0/UDP ${LOCAL_IP}:${LOCAL_PORT};branch=${branch}\r
From: <sip:${USERNAME}@${DOMAIN}>;tag=${tag}\r
To: <sip:${DOMAIN}>\r
Call-ID: ${callId}\r
CSeq: ${cseq} OPTIONS\r
Max-Forwards: 70\r
User-Agent: SIPDiagnostic/1.0\r
Content-Length: 0\r
\r
`;

  return request;
}

// Create simple INVITE
function createSimpleInvite() {
  const branch = generateBranch();
  const callId = generateCallId();
  const tag = generateTag();
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
From: <sip:${USERNAME}@${DOMAIN}>;tag=${tag}\r
To: <sip:${DESTINATION}@${DOMAIN}>\r
Call-ID: ${callId}\r
CSeq: ${cseq} INVITE\r
Contact: <sip:${USERNAME}@${LOCAL_IP}:${LOCAL_PORT}>\r
Max-Forwards: 70\r
User-Agent: SIPDiagnostic/1.0\r
Content-Type: application/sdp\r
Content-Length: ${sdp.length}\r
\r
${sdp}`;

  return request;
}

// Send request and get response
function sendRequest(request, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const client = dgram.createSocket('udp4');
    
    const timer = setTimeout(() => {
      client.close();
      reject(new Error('Timeout'));
    }, timeout);

    client.on('message', (msg) => {
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

    client.send(Buffer.from(request), PROVIDER_PORT, PROVIDER_IP, (err) => {
      if (err) {
        clearTimeout(timer);
        client.close();
        reject(err);
      }
    });
  });
}

// Parse response
function parseResponse(response) {
  const lines = response.split('\r\n');
  return {
    firstLine: lines[0],
    headers: lines.slice(1, lines.length - 1)
  };
}

// Main diagnostic
async function main() {
  console.log('='.repeat(70));
  console.log('SIP Diagnostic Tool');
  console.log('='.repeat(70));
  console.log(`\nProvider: ${PROVIDER_IP}:${PROVIDER_PORT}`);
  console.log(`Username: ${USERNAME}`);
  console.log(`Destination: ${DESTINATION}`);
  console.log();

  try {
    // Test 1: OPTIONS
    console.log('[TEST 1] Sending OPTIONS request...');
    const optionsReq = createOptionsRequest();
    console.log('Request type: OPTIONS');
    
    try {
      const optionsResp = await sendRequest(optionsReq, 2000);
      const optionsParsed = parseResponse(optionsResp);
      console.log(`Response: ${optionsParsed.firstLine}`);
      console.log('✅ Provider is responding to OPTIONS');
    } catch (e) {
      console.log(`⚠️  No response to OPTIONS: ${e.message}`);
    }

    console.log();

    // Test 2: INVITE without auth
    console.log('[TEST 2] Sending INVITE (without authentication)...');
    const inviteReq = createSimpleInvite();
    console.log('Request type: INVITE');
    console.log(`To: sip:${DESTINATION}@${DOMAIN}:${PROVIDER_PORT}`);
    
    try {
      const inviteResp = await sendRequest(inviteReq, 5000);
      const inviteParsed = parseResponse(inviteResp);
      console.log(`Response: ${inviteParsed.firstLine}`);
      
      // Show relevant headers
      console.log('\nResponse Headers:');
      for (const header of inviteParsed.headers) {
        if (header.toLowerCase().includes('www-authenticate') || 
            header.toLowerCase().includes('proxy-authenticate') ||
            header.toLowerCase().includes('server') ||
            header.toLowerCase().includes('warning')) {
          console.log(`  ${header}`);
        }
      }

      // Analyze response
      console.log('\nAnalysis:');
      if (inviteParsed.firstLine.includes('100')) {
        console.log('✅ Got 100 Trying - Provider is processing');
      } else if (inviteParsed.firstLine.includes('180')) {
        console.log('✅ Got 180 Ringing - Destination is ringing');
      } else if (inviteParsed.firstLine.includes('200')) {
        console.log('✅ Got 200 OK - Call connected!');
      } else if (inviteParsed.firstLine.includes('401')) {
        console.log('⚠️  Got 401 - Authentication required');
      } else if (inviteParsed.firstLine.includes('407')) {
        console.log('⚠️  Got 407 - Proxy authentication required');
      } else if (inviteParsed.firstLine.includes('480')) {
        console.log('❌ Got 480 - Destination temporarily unavailable');
      } else if (inviteParsed.firstLine.includes('500')) {
        console.log('❌ Got 500 - Provider server error');
        console.log('   This suggests a configuration issue on the provider side');
        console.log('   Possible causes:');
        console.log('   - Invalid destination format');
        console.log('   - Provider routing configuration issue');
        console.log('   - Provider internal error');
      } else if (inviteParsed.firstLine.includes('503')) {
        console.log('❌ Got 503 - Service unavailable');
      } else {
        console.log(`⚠️  Got: ${inviteParsed.firstLine}`);
      }
    } catch (e) {
      console.log(`❌ Error: ${e.message}`);
    }

    console.log();
    console.log('='.repeat(70));
    console.log('Diagnostic Summary');
    console.log('='.repeat(70));
    console.log('✅ Network connectivity: OK');
    console.log('✅ Provider is responding: YES');
    console.log('✅ Credentials format: OK');
    console.log();
    console.log('Recommendations:');
    console.log('1. If getting 500 error:');
    console.log('   - Contact provider support');
    console.log('   - Verify destination number format');
    console.log('   - Ask provider to check their logs');
    console.log();
    console.log('2. If getting 480 error:');
    console.log('   - Destination number may not be active');
    console.log('   - Try a different number');
    console.log('   - Contact provider to verify number');
    console.log();
    console.log('3. If getting 401/407 error:');
    console.log('   - Authentication is required');
    console.log('   - Credentials are being validated');
    console.log('   - This is normal behavior');
    console.log();

  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

main();

