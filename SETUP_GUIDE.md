# VoiceERP Clone - Setup Guide

## Project Overview
This is a complete clone of the VoiceERP project from the production server at `104.248.152.123`.

## Repository Information
- **GitHub Repository**: https://github.com/luminouslabsbd/voiceerp-clone-drm
- **Branch**: main
- **Latest Commit**: Add VoiceERP project files from server

## Project Structure
```
voiceerp-clone-local/
├── .gitignore                    # Git ignore rules
├── .env                          # Environment variables
├── README.md                     # Project documentation
├── docker-compose-server.yaml    # Docker Compose configuration
├── call-session.js               # Call session handler
├── index.html                    # Web interface
├── credentials/                  # Credentials directory
├── mysql/                        # MySQL configuration
│   ├── Dockerfile               # MySQL Docker image
│   ├── create_db.sql            # Database initialization script
│   └── create_db_backup.sql     # Database backup
├── sbc/                          # SBC (Session Border Controller) configuration
│   └── drachtio.conf.xml        # Drachtio configuration
└── tmpAudio/                     # Temporary audio files
```

## Local Setup Instructions

### Prerequisites
- Docker and Docker Compose installed
- Git installed
- SSH key configured for GitHub

### Step 1: Clone the Repository
```bash
git clone git@github.com:luminouslabsbd/voiceerp-clone-drm.git
cd voiceerp-clone-drm
```

### Step 2: Configure Environment
```bash
# Review and update .env file if needed
cat .env
```

### Step 3: Start Docker Containers
```bash
# Start all services
docker-compose -f docker-compose-server.yaml up -d

# Check status
docker-compose -f docker-compose-server.yaml ps

# View logs
docker-compose -f docker-compose-server.yaml logs -f
```

### Step 4: Access Services
- **API Server**: http://localhost:3000 (or http://api.voiceerp.com via reverse proxy)
- **Web App**: http://localhost:3001 (or http://manage.voiceerp.com via reverse proxy)
- **phpMyAdmin**: http://localhost:8080
- **MySQL**: localhost:3360

## Key Services
- **MySQL 8.0**: Database server
- **Redis**: Cache server
- **InfluxDB**: Time-series database
- **Drachtio SBC**: SIP proxy
- **FreeSWITCH**: Media server
- **RTPEngine**: RTP proxy
- **API Server**: Node.js backend
- **Webapp**: Web frontend

## Important Notes
- The `data_volume/` directory is excluded from Git (see .gitignore)
- Database data will be created fresh when containers start
- Some containers (sbc-outbound, sbc-sip-sidecar) may have Node.js compatibility issues - these are non-critical for basic functionality

## Troubleshooting

### MySQL Container Won't Start
```bash
# Clear data and restart
docker-compose -f docker-compose-server.yaml down -v
docker-compose -f docker-compose-server.yaml up -d mysql
```

### Check Container Logs
```bash
docker-compose -f docker-compose-server.yaml logs [service-name]
```

### Restart All Services
```bash
docker-compose -f docker-compose-server.yaml restart
```

## Git Workflow
```bash
# Check status
git status

# Add changes
git add .

# Commit changes
git commit -m "Your message"

# Push to GitHub
git push origin main

# Pull latest changes
git pull origin main
```

## Support
For issues or questions, refer to the README.md or check the GitHub repository.
