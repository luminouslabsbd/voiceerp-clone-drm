================================================================================
VOICEERP CALL INVESTIGATION - COMPLETE ANALYSIS
================================================================================

PROBLEM:
- Direct SIP calls work (you receive them)
- VoiceERP calls fail with 480 error (you don't receive them)
- Both use same credentials and provider

ROOT CAUSE FOUND:
- SIP header mismatch between direct SIP and VoiceERP
- Provider has strict validation rules for From/Contact headers
- Direct SIP sends headers from your IP
- VoiceERP sends headers from Drachtio SBC IP
- Provider rejects VoiceERP calls due to header mismatch

SOLUTION:
- Configure SIP Gateway instead of using LCR
- Gateway will route calls directly to provider with proper headers
- See IMPLEMENT_FIX.md for step-by-step instructions

FILES CREATED:
1. INVESTIGATION_SUMMARY.md - Overview of findings
2. JAMBONZ_ARCHITECTURE_ANALYSIS.md - Architecture deep dive
3. SIP_HEADER_COMPARISON.md - Detailed header comparison
4. FIX_VOICEERP_CALLS_GUIDE.md - Fix guide with options
5. IMPLEMENT_FIX.md - Complete step-by-step implementation

QUICK START:
1. Read: INVESTIGATION_SUMMARY.md
2. Read: IMPLEMENT_FIX.md
3. Run: Database commands from IMPLEMENT_FIX.md
4. Update: ai-voice-app/server.js with trunk parameter
5. Test: node test-call.js +8801757158044

EXPECTED RESULT:
✅ VoiceERP calls will work just like direct SIP calls
✅ You will receive calls on +8801757158044
✅ No more 480 errors

QUESTIONS?
- Check SIP_HEADER_COMPARISON.md for technical details
- Check JAMBONZ_ARCHITECTURE_ANALYSIS.md for architecture
- Check FIX_VOICEERP_CALLS_GUIDE.md for alternative solutions

================================================================================
