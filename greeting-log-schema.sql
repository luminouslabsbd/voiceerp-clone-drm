-- Greeting Log Table
-- Tracks which server sends the first greeting message for each call

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
  server_name VARCHAR(64) NOT NULL COMMENT 'feature-server or api-server-webhook',
  source VARCHAR(128) COMMENT 'webhook name or task name',
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (greeting_log_id),
  KEY idx_call_sid (call_sid),
  KEY idx_account_sid (account_sid),
  KEY idx_sent_at (sent_at),
  KEY idx_server_name (server_name)
) COMMENT='Logs tracking which server sends the first greeting message in a call';

-- Index for quick lookup of greetings by call
CREATE INDEX idx_greeting_call_account ON greeting_logs(call_sid, account_sid);

-- Index for analytics
CREATE INDEX idx_greeting_server_time ON greeting_logs(server_name, sent_at);

