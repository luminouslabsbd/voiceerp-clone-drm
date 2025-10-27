# Greeting Log System - Quick Start Guide

## 🎯 What It Does

Automatically logs **which server sends the first greeting message** in each call:
- **Feature Server** (Jambonz) - When Say task plays greeting
- **API Server** (Webhook) - When call-initiated webhook returns greeting

## 📋 Files Added/Modified

### New Files
1. **`greeting-log-schema.sql`** - Database table definition
2. **`jambonz-feature-server/lib/utils/greeting-logger.js`** - Logging utility
3. **`GREETING_LOG_DOCUMENTATION.md`** - Full documentation

### Modified Files
1. **`jambonz-feature-server/lib/tasks/say.js`** - Added greeting logging
2. **`ai-voice-app/server.js`** - Added greeting logging

## 🚀 Setup Instructions

### Step 1: Create Database Table

```bash
# SSH to server
ssh forge@104.248.152.123

# Connect to MySQL
mysql -h 172.10.0.2 -u jambones -p jambones

# Paste this SQL:
CREATE TABLE IF NOT EXISTS greeting_logs (
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

### Step 2: Deploy Code

```bash
# Pull latest changes
cd /home/forge/voiceerp-api-server
git pull origin main

# Rebuild containers
docker stop voiceerp_feature-server_1 voiceerp_api-server_1
docker rm voiceerp_feature-server_1 voiceerp_api-server_1
docker compose -f /home/forge/voiceerp-infrustructure/docker-compose-server-lumi.yaml up -d feature-server api-server
```

### Step 3: Verify It's Working

```bash
# Check logs
docker logs voiceerp_feature-server_1 | grep "FIRST GREETING"

# Make a test call and check database
mysql -h 172.10.0.2 -u jambones -p jambones -e "SELECT * FROM greeting_logs ORDER BY sent_at DESC LIMIT 5;"
```

## 📊 View Logs

### Real-time Console Logs

```bash
# Feature Server
docker logs -f voiceerp_feature-server_1 | grep "FIRST GREETING"

# API Server
docker logs -f voiceerp_api-server_1 | grep "FIRST GREETING"
```

### Database Queries

```sql
-- Last 10 greetings
SELECT call_sid, server_name, tts_vendor, greeting_text, sent_at 
FROM greeting_logs 
ORDER BY sent_at DESC 
LIMIT 10;

-- Greetings by server (last 24 hours)
SELECT server_name, COUNT(*) as count 
FROM greeting_logs 
WHERE sent_at > DATE_SUB(NOW(), INTERVAL 24 HOUR) 
GROUP BY server_name;

-- Greetings by TTS vendor
SELECT tts_vendor, COUNT(*) as count, server_name 
FROM greeting_logs 
WHERE sent_at > DATE_SUB(NOW(), INTERVAL 24 HOUR) 
GROUP BY tts_vendor, server_name;

-- Find specific call
SELECT * FROM greeting_logs 
WHERE call_sid = 'your-call-id';
```

## 📝 Log Format

Each greeting log includes:

```json
{
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

## 🔍 Troubleshooting

### No logs appearing?

1. **Check table exists:**
   ```sql
   SHOW TABLES LIKE 'greeting_logs';
   ```

2. **Check container logs:**
   ```bash
   docker logs voiceerp_feature-server_1 | tail -50
   ```

3. **Verify code deployed:**
   ```bash
   docker exec voiceerp_feature-server_1 grep -n "FIRST GREETING" lib/tasks/say.js
   ```

4. **Make a test call** and check logs immediately

### Database connection error?

1. **Verify MySQL running:**
   ```bash
   docker ps | grep mysql
   ```

2. **Test connection:**
   ```bash
   mysql -h 172.10.0.2 -u jambones -p jambones -e "SELECT 1;"
   ```

## 📈 Analytics Examples

### Which server handles most greetings?
```sql
SELECT server_name, COUNT(*) as count, 
  ROUND(COUNT(*)*100/(SELECT COUNT(*) FROM greeting_logs),2) as percentage
FROM greeting_logs
WHERE sent_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY server_name;
```

### Average greeting response time
```sql
SELECT 
  server_name,
  AVG(TIMESTAMPDIFF(MILLISECOND, created_at, sent_at)) as avg_ms,
  MIN(TIMESTAMPDIFF(MILLISECOND, created_at, sent_at)) as min_ms,
  MAX(TIMESTAMPDIFF(MILLISECOND, created_at, sent_at)) as max_ms
FROM greeting_logs
WHERE sent_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY server_name;
```

### Top TTS vendors used
```sql
SELECT tts_vendor, COUNT(*) as count
FROM greeting_logs
WHERE sent_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY tts_vendor
ORDER BY count DESC;
```

## 🎯 Key Metrics to Monitor

- **Server Distribution**: Which server sends most greetings
- **TTS Vendor Usage**: Which vendors are being used
- **Response Time**: How fast greetings are sent
- **Error Rate**: Calls without greetings
- **Language Distribution**: Which languages are used

## 📞 Support

For issues or questions, check:
1. `GREETING_LOG_DOCUMENTATION.md` - Full documentation
2. Container logs - Real-time debugging
3. Database queries - Historical analysis

