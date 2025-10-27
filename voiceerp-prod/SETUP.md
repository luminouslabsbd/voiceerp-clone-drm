# VoiceERP Production Setup Guide

## Initial Setup

### 1. Clone the Repository

```bash
git clone git@github.com:luminouslabsbd/voiceerp-prod.git
cd voiceerp-prod
```

### 2. Start Docker Containers

```bash
cd infrastructure
docker compose -f docker-compose-server-lumi.yaml up -d
```

This will start all 16 services. Wait for MySQL to be healthy (check with `docker ps`).

### 3. Verify Services

```bash
# Check all containers are running
docker ps | grep voiceerp

# Check API server is responding
curl http://localhost:3003/v1/ServiceProviders

# Access webapp
open http://localhost:3001
```

## Configuration

### MySQL Database

The database is automatically initialized with:
- Database: `jambones`
- User: `jambones`
- Password: `jambones`

Access via PhpMyAdmin: http://localhost:8080

### API Server

The API server runs on port 3003 and requires JWT authentication.

**Default JWT Secret**: `5a3e38b5-3188-4936-89c9-fb0df3138b5c`

### Environment Variables

Edit `infrastructure/docker-compose-server-lumi.yaml` to modify:
- `JWT_SECRET`
- `ENCRYPTION_SECRET`
- `AUTHENTICATION_KEY`
- `JAMBONES_LOGLEVEL`

## Development

### API Server Development

```bash
cd api-server
npm install
npm start
```

The API server will run on port 3000 locally.

### Building Custom Images

To rebuild the MySQL image with the latest version:

```bash
cd infrastructure/mysql
docker build -t voiceerp-mysql:latest .
```

## Monitoring

### View Logs

```bash
cd infrastructure

# All services
docker compose -f docker-compose-server-lumi.yaml logs -f

# Specific service
docker compose -f docker-compose-server-lumi.yaml logs -f api-server
docker compose -f docker-compose-server-lumi.yaml logs -f feature-server
```

### Check Container Health

```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

## Troubleshooting

### MySQL Connection Issues

```bash
# Check MySQL is running
docker ps | grep mysql

# Check MySQL logs
docker logs voiceerp-mysql-1

# Connect to MySQL
docker exec -it voiceerp-mysql-1 mysql -u jambones -p jambones
```

### API Server Issues

```bash
# Check API server logs
docker logs voiceerp-api-server-1

# Test API endpoint
curl -v http://localhost:3003/v1/ServiceProviders
```

### SIP Issues

```bash
# Check Drachtio SBC logs
docker logs voiceerp-drachtio-sbc-1

# Check SBC Outbound logs
docker logs voiceerp-sbc-outbound-1
```

## Stopping Services

```bash
cd infrastructure
docker compose -f docker-compose-server-lumi.yaml down
```

To also remove volumes:

```bash
docker compose -f docker-compose-server-lumi.yaml down -v
```

## Production Deployment

For production deployment:

1. Update environment variables in `docker-compose-server-lumi.yaml`
2. Use external database (not containerized)
3. Configure proper SSL/TLS certificates
4. Set up monitoring and alerting
5. Configure backup strategy for database
6. Use environment-specific configuration files

## Support

For issues, check:
- Container logs: `docker logs <container-name>`
- Database: PhpMyAdmin at http://localhost:8080
- API documentation: http://localhost:3003/api-docs (if available)

