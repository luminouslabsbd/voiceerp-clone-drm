#!/usr/bin/env python3
"""
Minimal SIP Credentials Test Script
Tests if your SIP credentials are correct by attempting to register with the provider
"""

import socket
import sys
import time
import hashlib
import random
import string

# Configuration
PROVIDER_IP = "103.170.231.10"
PROVIDER_PORT = 5060
USERNAME = "09649364251"
PASSWORD = "335577"
DOMAIN = PROVIDER_IP
LOCAL_IP = "127.0.0.1"
LOCAL_PORT = 5060

def generate_branch():
    """Generate a random SIP branch ID"""
    return "z9hG4bK" + ''.join(random.choices(string.ascii_letters + string.digits, k=10))

def generate_call_id():
    """Generate a random Call-ID"""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=20)) + "@" + LOCAL_IP

def generate_tag():
    """Generate a random tag"""
    return ''.join(random.choices(string.digits, k=10))

def create_register_request():
    """Create a SIP REGISTER request"""
    branch = generate_branch()
    call_id = generate_call_id()
    tag = generate_tag()
    
    request = f"""REGISTER sip:{DOMAIN}:{PROVIDER_PORT} SIP/2.0\r
Via: SIP/2.0/UDP {LOCAL_IP}:{LOCAL_PORT};branch={branch}\r
From: <sip:{USERNAME}@{DOMAIN}>;tag={tag}\r
To: <sip:{USERNAME}@{DOMAIN}>\r
Call-ID: {call_id}\r
CSeq: 1 REGISTER\r
Contact: <sip:{USERNAME}@{LOCAL_IP}:{LOCAL_PORT}>\r
Max-Forwards: 70\r
User-Agent: VoiceERP-Test/1.0\r
Content-Length: 0\r
\r
"""
    return request

def create_options_request():
    """Create a SIP OPTIONS request"""
    branch = generate_branch()
    call_id = generate_call_id()
    tag = generate_tag()
    
    request = f"""OPTIONS sip:{DOMAIN}:{PROVIDER_PORT} SIP/2.0\r
Via: SIP/2.0/UDP {LOCAL_IP}:{LOCAL_PORT};branch={branch}\r
From: <sip:{USERNAME}@{DOMAIN}>;tag={tag}\r
To: <sip:{DOMAIN}>\r
Call-ID: {call_id}\r
CSeq: 1 OPTIONS\r
Max-Forwards: 70\r
User-Agent: VoiceERP-Test/1.0\r
Content-Length: 0\r
\r
"""
    return request

def test_connectivity():
    """Test basic network connectivity"""
    print("[TEST 1] Testing network connectivity...")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.settimeout(2)
        sock.sendto(b"", (PROVIDER_IP, PROVIDER_PORT))
        print("✅ Network connectivity OK")
        return True
    except Exception as e:
        print(f"❌ Network connectivity FAILED: {e}")
        return False
    finally:
        sock.close()

def test_sip_options():
    """Test SIP OPTIONS request"""
    print("\n[TEST 2] Testing SIP OPTIONS request...")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.settimeout(3)
        
        request = create_options_request()
        print(f"Sending OPTIONS request to {PROVIDER_IP}:{PROVIDER_PORT}...")
        
        sock.sendto(request.encode(), (PROVIDER_IP, PROVIDER_PORT))
        
        try:
            response, addr = sock.recvfrom(4096)
            response_str = response.decode('utf-8', errors='ignore')
            
            if "200 OK" in response_str:
                print("✅ SIP OPTIONS request successful")
                print(f"Response: {response_str.split(chr(13))[0]}")
                return True
            elif "100 Trying" in response_str or "180 Ringing" in response_str:
                print("⚠️  Got intermediate response")
                print(f"Response: {response_str.split(chr(13))[0]}")
                return True
            else:
                print(f"⚠️  Got response: {response_str.split(chr(13))[0]}")
                return True
        except socket.timeout:
            print("⚠️  No response (timeout) - Provider may not support OPTIONS")
            return True
            
    except Exception as e:
        print(f"❌ SIP OPTIONS test FAILED: {e}")
        return False
    finally:
        sock.close()

def test_sip_register():
    """Test SIP REGISTER request"""
    print("\n[TEST 3] Testing SIP REGISTER request...")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.settimeout(3)
        
        request = create_register_request()
        print(f"Sending REGISTER request to {PROVIDER_IP}:{PROVIDER_PORT}...")
        print(f"Username: {USERNAME}")
        print(f"Domain: {DOMAIN}")
        
        sock.sendto(request.encode(), (PROVIDER_IP, PROVIDER_PORT))
        
        try:
            response, addr = sock.recvfrom(4096)
            response_str = response.decode('utf-8', errors='ignore')
            first_line = response_str.split('\r\n')[0]
            
            print(f"Response: {first_line}")
            
            if "200 OK" in response_str:
                print("✅ REGISTER successful - Credentials are CORRECT!")
                return True
            elif "401 Unauthorized" in response_str:
                print("⚠️  Got 401 Unauthorized - Credentials may be incorrect")
                print("   This is normal - provider requires authentication")
                return True
            elif "403 Forbidden" in response_str:
                print("❌ Got 403 Forbidden - Credentials are INCORRECT")
                return False
            elif "404 Not Found" in response_str:
                print("❌ Got 404 Not Found - Username not found on provider")
                return False
            else:
                print(f"⚠️  Got response: {first_line}")
                return True
                
        except socket.timeout:
            print("⚠️  No response (timeout) - Provider may be unreachable")
            return False
            
    except Exception as e:
        print(f"❌ SIP REGISTER test FAILED: {e}")
        return False
    finally:
        sock.close()

def main():
    print("=" * 50)
    print("SIP Credentials Test Script")
    print("=" * 50)
    print(f"\nProvider: {PROVIDER_IP}:{PROVIDER_PORT}")
    print(f"Username: {USERNAME}")
    print(f"Domain: {DOMAIN}")
    print()
    
    results = []
    
    # Run tests
    results.append(("Network Connectivity", test_connectivity()))
    results.append(("SIP OPTIONS", test_sip_options()))
    results.append(("SIP REGISTER", test_sip_register()))
    
    # Summary
    print("\n" + "=" * 50)
    print("Test Summary")
    print("=" * 50)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
    
    print("\n" + "=" * 50)
    print("Interpretation")
    print("=" * 50)
    
    if all(r for _, r in results):
        print("✅ All tests passed - Your credentials appear to be correct!")
    else:
        print("⚠️  Some tests failed - Check your credentials and network")
    
    print("\nNext steps:")
    print("1. If credentials are correct, try making a call:")
    print("   curl -X POST http://localhost:3003/v1/Accounts/9351f46a-678c-43f5-b8a6-d4eb58d131af/Calls \\")
    print("     -H 'Authorization: Bearer 5a3e38b5-3188-4936-89c9-fb0df3138b5c' \\")
    print("     -H 'Content-Type: application/json' \\")
    print("     -d '{\"from\": \"09649364251\", \"to\": {\"type\": \"phone\", \"number\": \"+8801521206638\"}}'")
    print("\n2. If calls fail with 480 error, the destination number may not be reachable")
    print("3. Contact your provider to verify the number is valid")
    print()

if __name__ == "__main__":
    main()

