#!/usr/bin/env node

/**
 * Test Script: Make a test call
 * Usage: node test-call.js [phone_number]
 */

const axios = require('axios');

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const PHONE_NUMBER = process.argv[2] || '+8801757158044';

async function makeTestCall() {
  console.log('='.repeat(60));
  console.log('AI Voice Call Test');
  console.log('='.repeat(60));
  console.log(`\nMaking call to: ${PHONE_NUMBER}`);
  console.log(`App URL: ${APP_URL}\n`);

  try {
    // Check if app is running
    console.log('1️⃣  Checking if app is running...');
    try {
      await axios.get(`${APP_URL}/health`);
      console.log('   ✅ App is running\n');
    } catch (error) {
      console.error('   ❌ App is not running');
      console.error(`   Make sure to run: npm start`);
      process.exit(1);
    }

    // Make the call
    console.log('2️⃣  Making outbound call...');
    const response = await axios.post(`${APP_URL}/api/call`, {
      to: PHONE_NUMBER
    });

    const { call_sid, success } = response.data;
    console.log(`   ✅ Call initiated successfully`);
    console.log(`   Call SID: ${call_sid}\n`);

    // Poll for call status
    console.log('3️⃣  Monitoring call...');
    let callActive = true;
    let pollCount = 0;
    const maxPolls = 60; // 60 seconds

    while (callActive && pollCount < maxPolls) {
      try {
        const statusResponse = await axios.get(`${APP_URL}/api/call/${call_sid}`);
        const { duration, messages } = statusResponse.data;

        console.log(`   Duration: ${duration}s | Messages: ${messages.length}`);

        if (messages.length > 0) {
          messages.forEach((msg, idx) => {
            const role = msg.role === 'user' ? '👤' : '🤖';
            console.log(`   ${role} ${msg.content.substring(0, 50)}...`);
          });
        }

        pollCount++;
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        if (error.response?.status === 404) {
          console.log('   ✅ Call ended');
          callActive = false;
        } else {
          throw error;
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Test Complete');
    console.log('='.repeat(60));
    console.log('✅ Call test completed successfully\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Details:', error.response.data);
    }
    process.exit(1);
  }
}

makeTestCall();

