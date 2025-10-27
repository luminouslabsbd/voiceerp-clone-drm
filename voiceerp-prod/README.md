# VoiceERP Production Setup

This repository contains the production-ready VoiceERP/Jambonz deployment with Docker Compose orchestration and the API server.

## Directory Structure

```
voiceerp-prod/
├── infrastructure/          # Docker Compose configuration and services
│   ├── docker-compose-server-lumi.yaml  # Production Docker Compose file
│   ├── mysql/              # MySQL database setup
│   ├── sbc/                # SBC (Session Border Controller) configuration
│   ├── data_volume/        # Database persistent storage
│   └── ...                 # Other service configurations
├── api-server/             # VoiceERP REST API Server
│   ├── lib/
│   ├── routes/
│   ├── package.json
│   └── ...
└── README.md               # This file
```

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 16+ (for local development)
- Git

### Start Production Environment

```bash
cd infrastructure
docker compose -f docker-compose-server-lumi.yaml up -d
```

### Available Services

| Service | URL | Port |
|---------|-----|------|
| Webapp | http://localhost:3001 | 3001 |
| API Server | http://localhost:3003 | 3003 |
| PhpMyAdmin | http://localhost:8080 | 8080 |
| SIP Server | localhost:5060 | 5060 |

### Database Access

- **Host**: localhost:3360
- **User**: jambones
- **Password**: jambones
- **Database**: jambones

### API Server Development

```bash
cd api-server
npm install
npm start
```

## Configuration

### Environment Variables

Key environment variables in `docker-compose-server-lumi.yaml`:

- `JAMBONES_MYSQL_HOST`: MySQL host (172.10.0.2)
- `JAMBONES_REDIS_HOST`: Redis host (172.10.0.3)
- `JWT_SECRET`: JWT signing secret
- `ENCRYPTION_SECRET`: Data encryption secret
- `NODE_ENV`: Environment (production/development)

### MySQL Database

The MySQL database is initialized with the schema from `infrastructure/mysql/create_db.sql`.

## Containers

The production setup includes 16 containers:

- MySQL (Database)
- Redis (Cache)
- InfluxDB (Metrics)
- Drachtio SBC (SIP Server)
- Drachtio FS (FreeSWITCH)
- RTPEngine (Media)
- SBC Inbound/Outbound
- SBC Registrar
- Call Router
- API Server
- Feature Server
- Webapp
- PhpMyAdmin
- SBC SIP Sidecar

## Logs

View container logs:

```bash
cd infrastructure
docker compose -f docker-compose-server-lumi.yaml logs -f [service-name]
```

## Stopping Services

```bash
cd infrastructure
docker compose -f docker-compose-server-lumi.yaml down
```

## Documentation

- [VoiceERP Documentation](https://docs.voiceerp.com)
- [Jambonz Documentation](https://jambonz.org)

## Support

For issues and questions, please refer to the official documentation or create an issue in the repository.

