-- AWS/DigitalOcean Spaces Recording Storage Configuration
-- Migration to add recording storage credentials to the database

-- Create table for recording storage credentials
CREATE TABLE IF NOT EXISTS recording_storage_credentials (
  recording_storage_credential_sid CHAR(36) NOT NULL UNIQUE,
  service_provider_sid CHAR(36),
  account_sid CHAR(36),
  vendor VARCHAR(32) NOT NULL COMMENT 'aws, digitalocean, azure, gcp, etc.',
  credential_type VARCHAR(32) NOT NULL COMMENT 'access_key, service_account, etc.',
  credential_data JSON NOT NULL COMMENT 'Encrypted JSON with credentials',
  bucket_name VARCHAR(255) NOT NULL,
  region VARCHAR(64),
  endpoint_url VARCHAR(255) COMMENT 'For S3-compatible services like DigitalOcean Spaces',
  prefix VARCHAR(255) DEFAULT 'recordings/' COMMENT 'Path prefix for recordings',
  is_active BOOLEAN DEFAULT true,
  last_tested DATETIME,
  test_ok BOOLEAN,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  label VARCHAR(64),
  PRIMARY KEY (recording_storage_credential_sid),
  KEY idx_account_sid (account_sid),
  KEY idx_service_provider_sid (service_provider_sid),
  KEY idx_vendor (vendor),
  KEY idx_is_active (is_active),
  FOREIGN KEY (account_sid) REFERENCES accounts (account_sid) ON DELETE CASCADE,
  FOREIGN KEY (service_provider_sid) REFERENCES service_providers (service_provider_sid) ON DELETE CASCADE
) COMMENT='Stores credentials for recording storage backends (AWS S3, DigitalOcean Spaces, etc.)';

-- Create table for recording metadata
CREATE TABLE IF NOT EXISTS call_recordings (
  call_recording_sid CHAR(36) NOT NULL UNIQUE,
  call_sid CHAR(36) NOT NULL,
  account_sid CHAR(36) NOT NULL,
  recording_storage_credential_sid CHAR(36),
  vendor VARCHAR(32) NOT NULL COMMENT 'aws, digitalocean, etc.',
  bucket_name VARCHAR(255) NOT NULL,
  object_key VARCHAR(512) NOT NULL COMMENT 'Full path in storage',
  file_size_bytes BIGINT,
  duration_seconds INT,
  format VARCHAR(16) COMMENT 'wav, mp3, etc.',
  sample_rate INT COMMENT 'Audio sample rate in Hz',
  channels INT COMMENT 'Number of audio channels',
  recording_started_at DATETIME,
  recording_ended_at DATETIME,
  uploaded_at DATETIME,
  is_public BOOLEAN DEFAULT false,
  public_url VARCHAR(512),
  metadata JSON COMMENT 'Additional metadata',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (call_recording_sid),
  KEY idx_call_sid (call_sid),
  KEY idx_account_sid (account_sid),
  KEY idx_vendor (vendor),
  KEY idx_created_at (created_at),
  KEY idx_recording_storage_credential_sid (recording_storage_credential_sid),
  FOREIGN KEY (account_sid) REFERENCES accounts (account_sid) ON DELETE CASCADE,
  FOREIGN KEY (recording_storage_credential_sid) REFERENCES recording_storage_credentials (recording_storage_credential_sid)
) COMMENT='Tracks call recordings stored in cloud storage';

-- Create indexes for common queries
CREATE INDEX idx_recording_account_date ON call_recordings(account_sid, created_at);
CREATE INDEX idx_recording_call_date ON call_recordings(call_sid, created_at);

-- Insert default DigitalOcean Spaces configuration (example)
-- Note: Credentials should be encrypted before storing in production
INSERT INTO recording_storage_credentials (
  recording_storage_credential_sid,
  account_sid,
  vendor,
  credential_type,
  credential_data,
  bucket_name,
  region,
  endpoint_url,
  prefix,
  is_active,
  label
) VALUES (
  UUID(),
  NULL,
  'digitalocean',
  'access_key',
  JSON_OBJECT(
    'access_key_id', 'DO004ZCBX8K7U749W8V7',
    'secret_access_key', 'VFrETSS84jGJyQmRRdthC3wuRILTL1BI9+ojHcrqC1s',
    'profile_name', 'do-tor1'
  ),
  'voiceerp-recordings',
  'sgp1',
  'https://sgp1.digitaloceanspaces.com',
  'recordings/',
  true,
  'DigitalOcean Spaces - Singapore'
) ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- Create view for active recording storage credentials
CREATE OR REPLACE VIEW active_recording_storage_credentials AS
SELECT 
  recording_storage_credential_sid,
  service_provider_sid,
  account_sid,
  vendor,
  bucket_name,
  region,
  endpoint_url,
  prefix,
  label,
  created_at
FROM recording_storage_credentials
WHERE is_active = true;

-- Create view for recent recordings
CREATE OR REPLACE VIEW recent_call_recordings AS
SELECT 
  cr.call_recording_sid,
  cr.call_sid,
  cr.account_sid,
  cr.vendor,
  cr.bucket_name,
  cr.object_key,
  cr.file_size_bytes,
  cr.duration_seconds,
  cr.format,
  cr.recording_started_at,
  cr.recording_ended_at,
  cr.uploaded_at,
  cr.public_url,
  rsc.label as storage_label,
  cr.created_at
FROM call_recordings cr
LEFT JOIN recording_storage_credentials rsc ON cr.recording_storage_credential_sid = rsc.recording_storage_credential_sid
WHERE cr.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY cr.created_at DESC;

