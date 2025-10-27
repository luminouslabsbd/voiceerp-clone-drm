# Recording Storage - Quick Reference

## 🎯 What This Does

Stores call recordings in DigitalOcean Spaces (S3-compatible) with database tracking.

## 📋 Credentials

```
Vendor: DigitalOcean Spaces
Region: sgp1 (Singapore)
Endpoint: https://sgp1.digitaloceanspaces.com
Bucket: voiceerp-recordings
Access Key: DO004ZCBX8K7U749W8V7
Secret Key: VFrETSS84jGJyQmRRdthC3wuRILTL1BI9+ojHcrqC1s
```

## 🚀 Setup

### 1. Create Database Tables

```bash
ssh forge@104.248.152.123
mysql -h 172.10.0.2 -u jambones -p jambones < aws-recording-storage-migration.sql
```

### 2. Verify Tables

```sql
SHOW TABLES LIKE 'recording%';
SHOW TABLES LIKE 'call_recording%';
```

### 3. Check Credentials

```sql
SELECT * FROM recording_storage_credentials;
```

## 📊 Database Tables

### `recording_storage_credentials`
Stores cloud storage credentials

| Column | Type | Purpose |
|--------|------|---------|
| recording_storage_credential_sid | CHAR(36) | Unique ID |
| vendor | VARCHAR(32) | aws, digitalocean, etc. |
| bucket_name | VARCHAR(255) | S3 bucket name |
| endpoint_url | VARCHAR(255) | S3 endpoint (for DigitalOcean) |
| credential_data | JSON | Encrypted credentials |
| is_active | BOOLEAN | Enable/disable credential |

### `call_recordings`
Tracks all uploaded recordings

| Column | Type | Purpose |
|--------|------|---------|
| call_recording_sid | CHAR(36) | Unique ID |
| call_sid | CHAR(36) | Call ID |
| account_sid | CHAR(36) | Account ID |
| object_key | VARCHAR(512) | Path in storage |
| file_size_bytes | BIGINT | File size |
| duration_seconds | INT | Recording duration |
| uploaded_at | DATETIME | Upload timestamp |
| public_url | VARCHAR(512) | Public URL |

## 🔍 Common Queries

### View All Credentials

```sql
SELECT * FROM recording_storage_credentials;
```

### View Recent Recordings

```sql
SELECT * FROM recent_call_recordings LIMIT 10;
```

### Get Recordings for Account

```sql
SELECT call_sid, duration_seconds, file_size_bytes, uploaded_at
FROM call_recordings
WHERE account_sid = 'your-account-id'
ORDER BY uploaded_at DESC
LIMIT 20;
```

### Get Recordings for Call

```sql
SELECT * FROM call_recordings
WHERE call_sid = 'your-call-id';
```

### Storage Usage

```sql
SELECT 
  account_sid,
  COUNT(*) as recordings,
  SUM(file_size_bytes) / 1024 / 1024 / 1024 as size_gb,
  SUM(duration_seconds) / 3600 as hours
FROM call_recordings
WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY account_sid;
```

### Failed Uploads

```sql
SELECT * FROM call_recordings
WHERE uploaded_at IS NULL
AND created_at > DATE_SUB(NOW(), INTERVAL 1 DAY);
```

## 🛠️ AWS CLI Commands

### Configure Profile

```bash
aws --profile do-tor1 configure set aws_access_key_id DO004ZCBX8K7U749W8V7
aws --profile do-tor1 configure set aws_secret_access_key VFrETSS84jGJyQmRRdthC3wuRILTL1BI9+ojHcrqC1s
aws --profile do-tor1 configure set endpoint_url https://sgp1.digitaloceanspaces.com
aws --profile do-tor1 configure set region sgp1
```

### List Buckets

```bash
aws --profile do-tor1 s3 ls
```

### List Recordings

```bash
aws --profile do-tor1 s3 ls s3://voiceerp-recordings/
```

### Upload Test File

```bash
echo "test" > test.txt
aws --profile do-tor1 s3 cp test.txt s3://voiceerp-recordings/test.txt
```

### Download Recording

```bash
aws --profile do-tor1 s3 cp s3://voiceerp-recordings/recordings/2025-10-27/call-123.wav ./call-123.wav
```

### Delete Recording

```bash
aws --profile do-tor1 s3 rm s3://voiceerp-recordings/recordings/2025-10-27/call-123.wav
```

### Sync All Recordings

```bash
aws --profile do-tor1 s3 sync s3://voiceerp-recordings/ ./recordings-backup/
```

## 📝 Node.js Usage

```javascript
const RecordingStorage = require('./lib/utils/recording-storage');

const storage = new RecordingStorage(logger, dbHelpers);

// Upload recording
const result = await storage.uploadRecording({
  callSid: 'call-123456',
  accountSid: 'account-789',
  filePath: '/tmp/recording.wav',
  credentialSid: 'credential-id',
  format: 'wav'
});

console.log('Uploaded to:', result.location);
```

## 🔐 Security

1. **Encrypt credentials** in database
2. **Use IAM policies** to limit access
3. **Enable versioning** for recovery
4. **Set lifecycle rules** for old recordings
5. **Enable logging** for audit trail

## 📈 Monitoring

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

### Check Failed Uploads

```sql
SELECT COUNT(*) FROM call_recordings
WHERE uploaded_at IS NULL
AND created_at > DATE_SUB(NOW(), INTERVAL 1 DAY);
```

## 🐛 Troubleshooting

### Test Connection

```bash
aws --profile do-tor1 s3 ls
```

### Check Credentials

```bash
aws --profile do-tor1 sts get-caller-identity
```

### Check Bucket Access

```bash
aws --profile do-tor1 s3api head-bucket --bucket voiceerp-recordings
```

### View Database Logs

```sql
SELECT * FROM recording_storage_credentials;
SELECT * FROM call_recordings ORDER BY created_at DESC LIMIT 10;
```

## 📚 Files

- `aws-recording-storage-migration.sql` - Database schema
- `RECORDING_STORAGE_SETUP.md` - Full documentation
- `jambonz-feature-server/lib/utils/recording-storage.js` - Node.js utility

## 🔗 References

- [DigitalOcean Spaces Docs](https://docs.digitalocean.com/products/spaces/)
- [AWS S3 Docs](https://docs.aws.amazon.com/s3/)
- [AWS CLI Docs](https://docs.aws.amazon.com/cli/)

