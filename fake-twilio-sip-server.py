#!/usr/bin/env python3
"""
Fake Twilio SIP Server - responds to INVITE requests
"""
import socket
import sys
import time
from datetime import datetime

def create_sip_response(request, status_code, reason):
    """Create a SIP response"""
    lines = request.split('\r\n')
    
    # Parse the request line
    request_line = lines[0]
    
    # Extract Via, From, To, Call-ID, CSeq headers
    via = None
    from_hdr = None
    to_hdr = None
    call_id = None
    cseq = None
    
    for line in lines[1:]:
        if line.startswith('Via:'):
            via = line
        elif line.startswith('From:'):
            from_hdr = line
        elif line.startswith('To:'):
            to_hdr = line
        elif line.startswith('Call-ID:'):
            call_id = line
        elif line.startswith('CSeq:'):
            cseq = line
    
    # Build response
    response = f"SIP/2.0 {status_code} {reason}\r\n"
    if via:
        response += via + "\r\n"
    if from_hdr:
        response += from_hdr + "\r\n"
    if to_hdr:
        # Add tag to To header if not present
        if ';tag=' not in to_hdr:
            response += to_hdr + ";tag=fake-twilio-tag\r\n"
        else:
            response += to_hdr + "\r\n"
    if call_id:
        response += call_id + "\r\n"
    if cseq:
        response += cseq + "\r\n"
    
    response += "Content-Length: 0\r\n"
    response += "\r\n"
    
    return response

def main():
    # Create UDP socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    
    # Bind to 127.0.0.1:5060
    sock.bind(('127.0.0.1', 5060))
    print(f"[{datetime.now()}] Fake Twilio SIP Server listening on 127.0.0.1:5060")
    
    try:
        while True:
            # Receive data
            data, addr = sock.recvfrom(4096)
            request = data.decode('utf-8', errors='ignore')
            
            print(f"\n[{datetime.now()}] Received from {addr}:")
            print(request[:200])
            
            # Check if it's an INVITE
            if 'INVITE' in request:
                print(f"[{datetime.now()}] Responding with 200 OK")
                response = create_sip_response(request, 200, 'OK')
                sock.sendto(response.encode('utf-8'), addr)
            elif 'BYE' in request:
                print(f"[{datetime.now()}] Responding to BYE with 200 OK")
                response = create_sip_response(request, 200, 'OK')
                sock.sendto(response.encode('utf-8'), addr)
            elif 'OPTIONS' in request:
                print(f"[{datetime.now()}] Responding to OPTIONS with 200 OK")
                response = create_sip_response(request, 200, 'OK')
                sock.sendto(response.encode('utf-8'), addr)
            else:
                print(f"[{datetime.now()}] Unknown request, ignoring")
    
    except KeyboardInterrupt:
        print(f"\n[{datetime.now()}] Shutting down...")
    finally:
        sock.close()

if __name__ == '__main__':
    main()

