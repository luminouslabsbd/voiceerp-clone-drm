# Greeting Log System Documentation

## Overview

The Greeting Log System tracks which server sends the **first greeting message** in each call. This helps identify:
- Which server is handling the initial greeting (feature-server or api-server-webhook)
- TTS configuration used for the greeting
- Call flow and routing information
- Performance and debugging insights

## Architecture

### Components

1. **Greeting Logger Utility** (`jambonz-feature-server/lib/utils/greeting-logger.js`)
   - Core logging functionality
   - Database integration
   - Statistics and analytics

2. **Database Schema** (`greeting-log-schema.sql`)
   - `greeting_logs` table
   - Indexes for performance
   - Timestamp tracking

3. **Feature Server Integration** (`jambonz-feature-server/lib/tasks/say.js`)
   - Logs when Say task sends first greeting
   - Tracks TTS vendor, language, voice, engine

4. **API Server Integration** (`ai-voice-app/server.js`)
   - Logs when webhook sends first greeting
   - Tracks call initiation details

## Database Schema

```sql
CREATE TABLE greeting_logs (
  greeting_log_id CHAR(36) NOT NULL UNIQUE,
  call_sid CHAR(36) NOT NULL,
  account_sid CHAR(36) NOT NULL,
  greeting_text VARCHAR(500),
  tts_vendor VARCHAR(64),
  tts_language VARCHAR(12),
  tts_voice VARCHAR(256),
  tts_label VARCHAR(64),
  tts_engine VARCHAR(64),
  server_name VARCHAR(64) NOT NULL,
  source VARCHAR(128),
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (greeting_log_id),
  KEY idx_call_sid (call_sid),
  KEY idx_account_sid (account_sid),
  KEY idx_sent_at (sent_at),
  KEY idx_server_name (server_name)
);
```

## Log Format

### Console Log Output

```json
{
  "greetingLogId": "550e8400-e29b-41d4-a716-446655440000",
  "callSid": "call-123456",
  "accountSid": "account-789",
  "greetingText": "Hello! This is an AI voice assistant...",
  "vendor": "elevenlabs",
  "language": "en-US",
  "voice": "Rachel",
  "label": "default",
  "engine": "neural",
  "server": "feature-server",
  "source": "say-task",
  "timestamp": "2025-10-27T15:30:45.123Z"
}
```

### Database Record

| Field | Value | Description |
|-------|-------|-------------|
| greeting_log_id | UUID | Unique log identifier |
| call_sid | UUID | Call identifier |
| account_sid | UUID | Account identifier |
| greeting_text | String | First 500 chars of greeting |
| tts_vendor | String | TTS provider (elevenlabs, google, etc.) |
| tts_language | String | Language code (en-US, es-ES, etc.) |
| tts_voice | String | Voice ID/name |
| tts_label | String | Credential label |
| tts_engine | String | Engine type (neural, standard, etc.) |
| server_name | String | **feature-server** or **api-server-webhook** |
| source | String | Task/webhook name |
| sent_at | Timestamp | When greeting was sent |

## Usage Examples

### 1. Check Which Server Sent Greeting

```bash
# View logs in real-time
docker logs voiceerp_feature-server_1 | grep "FIRST GREETING"

# Or check database
SELECT * FROM greeting_logs 
WHERE call_sid = 'your-call-id' 
ORDER BY sent_at ASC LIMIT 1;
```

### 2. Get Statistics

```sql
-- Greetings by server (last 24 hours)
SELECT 
  server_name,
  COUNT(*) as count,
  COUNT(DISTINCT call_sid) as unique_calls
FROM greeting_logs
WHERE sent_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY server_name;

-- Greetings by TTS vendor
SELECT 
  tts_vendor,
  COUNT(*) as count,
  server_name
FROM greeting_logs
WHERE sent_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY tts_vendor, server_name;

-- Greetings by account
SELECT 
  account_sid,
  COUNT(*) as count,
  server_name
FROM greeting_logs
WHERE sent_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY account_sid, server_name;
```

### 3. Identify Issues

```sql
-- Find calls with no greeting logged
SELECT DISTINCT c.call_sid
FROM calls c
LEFT JOIN greeting_logs g ON c.call_sid = g.call_sid
WHERE c.created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
AND g.greeting_log_id IS NULL;

-- Find slow greetings
SELECT 
  call_sid,
  TIMESTAMPDIFF(SECOND, created_at, sent_at) as delay_seconds
FROM greeting_logs
WHERE sent_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
ORDER BY delay_seconds DESC;
```

## Integration Steps

### 1. Create Database Table

```bash
# SSH to server
ssh forge@104.248.152.123

# Connect to MySQL
mysql -h 172.10.0.2 -u jambones -p jambones

# Run schema
source /path/to/greeting-log-schema.sql;
```

### 2. Deploy Code Changes

```bash
# Commit changes
git add -A
git commit -m "Add greeting log system to track first greeting message"

# Push to server
git push origin prod-setup

# Rebuild containers
docker compose -f docker-compose-server-lumi.yaml up -d --build feature-server api-server
```

### 3. Verify Logging

```bash
# Check feature server logs
docker logs voiceerp_feature-server_1 | grep "FIRST GREETING"

# Check API server logs
docker logs voiceerp_api-server_1 | grep "FIRST GREETING"

# Query database
SELECT * FROM greeting_logs ORDER BY sent_at DESC LIMIT 10;
```

## Log Levels

- 🎤 **FIRST GREETING MESSAGE SENT** - Info level
  - Logged when first greeting is detected
  - Includes all TTS configuration
  - Includes server identification

## Troubleshooting

### No Logs Appearing

1. Check if table exists:
   ```sql
   SHOW TABLES LIKE 'greeting_logs';
   ```

2. Check container logs:
   ```bash
   docker logs voiceerp_feature-server_1 | tail -100
   ```

3. Verify code changes deployed:
   ```bash
   docker exec voiceerp_feature-server_1 grep -n "FIRST GREETING" lib/tasks/say.js
   ```

### Database Connection Issues

1. Verify MySQL is running:
   ```bash
   docker ps | grep mysql
   ```

2. Test connection:
   ```bash
   mysql -h 172.10.0.2 -u jambones -p jambones -e "SELECT 1;"
   ```

## Performance Impact

- **Minimal**: Logging adds <1ms per call
- **Database**: Indexes ensure fast queries
- **Storage**: ~500 bytes per log entry

## Future Enhancements

- [ ] REST API endpoint for querying logs
- [ ] Dashboard visualization
- [ ] Alerts for anomalies
- [ ] Export to analytics platform
- [ ] Real-time streaming logs

