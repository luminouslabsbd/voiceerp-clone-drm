# Recording Storage Configuration - AWS/DigitalOcean Spaces

## Overview

This guide sets up cloud storage for call recordings using AWS S3 or DigitalOcean Spaces.

## Database Schema

### Tables Created

#### 1. `recording_storage_credentials`
Stores cloud storage credentials for recording uploads.

```sql
CREATE TABLE recording_storage_credentials (
  recording_storage_credential_sid CHAR(36) NOT NULL UNIQUE,
  service_provider_sid CHAR(36),
  account_sid CHAR(36),
  vendor VARCHAR(32) NOT NULL,
  credential_type VARCHAR(32) NOT NULL,
  credential_data JSON NOT NULL,
  bucket_name VARCHAR(255) NOT NULL,
  region VARCHAR(64),
  endpoint_url VARCHAR(255),
  prefix VARCHAR(255) DEFAULT 'recordings/',
  is_active BOOLEAN DEFAULT true,
  last_tested DATETIME,
  test_ok BOOLEAN,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  label VARCHAR(64),
  PRIMARY KEY (recording_storage_credential_sid)
);
```

#### 2. `call_recordings`
Tracks metadata for all call recordings.

```sql
CREATE TABLE call_recordings (
  call_recording_sid CHAR(36) NOT NULL UNIQUE,
  call_sid CHAR(36) NOT NULL,
  account_sid CHAR(36) NOT NULL,
  recording_storage_credential_sid CHAR(36),
  vendor VARCHAR(32) NOT NULL,
  bucket_name VARCHAR(255) NOT NULL,
  object_key VARCHAR(512) NOT NULL,
  file_size_bytes BIGINT,
  duration_seconds INT,
  format VARCHAR(16),
  sample_rate INT,
  channels INT,
  recording_started_at DATETIME,
  recording_ended_at DATETIME,
  uploaded_at DATETIME,
  is_public BOOLEAN DEFAULT false,
  public_url VARCHAR(512),
  metadata JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (call_recording_sid)
);
```

## DigitalOcean Spaces Configuration

### Credentials Provided

```
Profile: do-tor1
Access Key ID: DO004ZCBX8K7U749W8V7
Secret Access Key: VFrETSS84jGJyQmRRdthC3wuRILTL1BI9+ojHcrqC1s
Endpoint: https://sgp1.digitaloceanspaces.com
Region: sgp1 (Singapore)
Bucket: voiceerp-recordings
```

### Setup Steps

#### 1. Create Database Tables

```bash
# SSH to server
ssh forge@104.248.152.123

# Connect to MySQL
mysql -h 172.10.0.2 -u jambones -p jambones

# Run migration
source aws-recording-storage-migration.sql;
```

#### 2. Configure AWS CLI (Optional)

```bash
# Install AWS CLI
pip install awscli

# Configure profile
aws --profile do-tor1 configure set aws_access_key_id DO004ZCBX8K7U749W8V7
aws --profile do-tor1 configure set aws_secret_access_key VFrETSS84jGJyQmRRdthC3wuRILTL1BI9+ojHcrqC1s
aws --profile do-tor1 configure set endpoint_url https://sgp1.digitaloceanspaces.com
aws --profile do-tor1 configure set region sgp1
```

#### 3. Test Connection

```bash
# List buckets
aws --profile do-tor1 s3 ls

# List recordings bucket
aws --profile do-tor1 s3 ls s3://voiceerp-recordings/

# Upload test file
echo "test" > test.txt
aws --profile do-tor1 s3 cp test.txt s3://voiceerp-recordings/test.txt
```

## Database Queries

### View Active Storage Credentials

```sql
SELECT * FROM active_recording_storage_credentials;
```

### View Recent Recordings

```sql
SELECT * FROM recent_call_recordings LIMIT 10;
```

### Get Recordings for Specific Account

```sql
SELECT 
  call_recording_sid,
  call_sid,
  duration_seconds,
  file_size_bytes,
  format,
  uploaded_at
FROM call_recordings
WHERE account_sid = 'your-account-id'
ORDER BY created_at DESC
LIMIT 20;
```

### Get Recordings for Specific Call

```sql
SELECT * FROM call_recordings
WHERE call_sid = 'your-call-id';
```

### Storage Usage Statistics

```sql
SELECT 
  account_sid,
  COUNT(*) as recording_count,
  SUM(file_size_bytes) / 1024 / 1024 / 1024 as total_size_gb,
  SUM(duration_seconds) / 3600 as total_hours,
  AVG(duration_seconds) as avg_duration_seconds
FROM call_recordings
WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY account_sid;
```

## Environment Variables

Add to `.env` or Docker environment:

```bash
# DigitalOcean Spaces
RECORDING_STORAGE_VENDOR=digitalocean
RECORDING_STORAGE_BUCKET=voiceerp-recordings
RECORDING_STORAGE_REGION=sgp1
RECORDING_STORAGE_ENDPOINT=https://sgp1.digitaloceanspaces.com
RECORDING_STORAGE_ACCESS_KEY_ID=DO004ZCBX8K7U749W8V7
RECORDING_STORAGE_SECRET_ACCESS_KEY=VFrETSS84jGJyQmRRdthC3wuRILTL1BI9+ojHcrqC1s
RECORDING_STORAGE_PREFIX=recordings/
```

## Node.js Integration Example

```javascript
const AWS = require('aws-sdk');

// Configure S3 client for DigitalOcean Spaces
const s3 = new AWS.S3({
  accessKeyId: process.env.RECORDING_STORAGE_ACCESS_KEY_ID,
  secretAccessKey: process.env.RECORDING_STORAGE_SECRET_ACCESS_KEY,
  endpoint: process.env.RECORDING_STORAGE_ENDPOINT,
  s3ForcePathStyle: true,
  region: process.env.RECORDING_STORAGE_REGION
});

// Upload recording
async function uploadRecording(callSid, filePath) {
  const fileContent = fs.readFileSync(filePath);
  const key = `${process.env.RECORDING_STORAGE_PREFIX}${callSid}.wav`;
  
  const params = {
    Bucket: process.env.RECORDING_STORAGE_BUCKET,
    Key: key,
    Body: fileContent,
    ContentType: 'audio/wav'
  };
  
  try {
    const result = await s3.upload(params).promise();
    console.log('Recording uploaded:', result.Location);
    return result;
  } catch (err) {
    console.error('Upload failed:', err);
    throw err;
  }
}
```

## Security Considerations

1. **Encrypt Credentials**: Store credentials encrypted in database
2. **Access Control**: Use IAM policies to limit bucket access
3. **Lifecycle Policies**: Set expiration for old recordings
4. **Versioning**: Enable bucket versioning for recovery
5. **Logging**: Enable access logging for audit trail

## Troubleshooting

### Connection Issues

```bash
# Test endpoint connectivity
curl -I https://sgp1.digitaloceanspaces.com

# Test AWS CLI
aws --profile do-tor1 s3 ls
```

### Permission Errors

```bash
# Check credentials
aws --profile do-tor1 sts get-caller-identity

# Check bucket permissions
aws --profile do-tor1 s3api head-bucket --bucket voiceerp-recordings
```

### Database Issues

```sql
-- Check if tables exist
SHOW TABLES LIKE 'recording%';

-- Check credentials
SELECT * FROM recording_storage_credentials;

-- Check recordings
SELECT COUNT(*) FROM call_recordings;
```

## Monitoring

### Check Upload Status

```sql
SELECT 
  DATE(uploaded_at) as date,
  COUNT(*) as uploads,
  SUM(file_size_bytes) / 1024 / 1024 as size_mb
FROM call_recordings
WHERE uploaded_at IS NOT NULL
GROUP BY DATE(uploaded_at)
ORDER BY date DESC;
```

### Failed Uploads

```sql
SELECT * FROM call_recordings
WHERE uploaded_at IS NULL
AND created_at > DATE_SUB(NOW(), INTERVAL 1 DAY);
```

## Backup & Recovery

### Backup Recordings

```bash
# Sync all recordings locally
aws --profile do-tor1 s3 sync s3://voiceerp-recordings/ ./recordings-backup/
```

### Restore Recordings

```bash
# Sync back to bucket
aws --profile do-tor1 s3 sync ./recordings-backup/ s3://voiceerp-recordings/
```

## Cost Optimization

1. **Lifecycle Rules**: Archive old recordings to cheaper storage
2. **Compression**: Compress recordings before upload
3. **Cleanup**: Delete recordings after retention period
4. **Monitoring**: Track storage usage and costs

## References

- [DigitalOcean Spaces Documentation](https://docs.digitalocean.com/products/spaces/)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS SDK for Node.js](https://docs.aws.amazon.com/sdk-for-javascript/)

