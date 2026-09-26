# Docker Setup Guide - vsay-terminal

Simple Docker setup for building and running vsay-terminal in production.

## Prerequisites

- Docker Engine 20.10+ or Docker Desktop
- Docker Compose V2+

## Quick Start

### Setup Environment

```bash
# Copy and configure environment file
 .env.local
# Edit .env.local with your actual values
```

## Common Commands

### Local Testing

```bash
# Start application
docker-compose up

# Start in background
docker-compose up -d

# Stop application
docker-compose down

# Restart application
docker-compose restart

# View logs
docker-compose logs -f

# Rebuild and restart
docker-compose up -d --build
```

### Production Deployment

```bash
# 1. Build the image
docker build -t vsay-terminal:latest .

# 2. Tag for your registry
docker tag vsay-terminal:latest your-registry.com/vsay-terminal:v1.0.0

# 3. Push to registry
docker push your-registry.com/vsay-terminal:v1.0.0

# 4. Deploy to your K8s cluster
kubectl apply -f k8s/deployment.yaml
```

### Direct Docker Run (without compose)

```bash
# Run production container directly
docker run -d \
  --name vsay-terminal \
  -p 3000:3000 \
  --env-file .env.local \
  vsay-terminal:latest

# View logs
docker logs -f vsay-terminal

# Stop container
docker stop vsay-terminal

# Remove container
docker rm vsay-terminal
```

## Multi-Platform Build (for K8s)

Build for multiple architectures (AMD64, ARM64):

```bash
# Create buildx builder (first time only)
docker buildx create --name multiplatform --use

# Build and push multi-platform image
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t your-registry.com/vsay-terminal:latest \
  --push .
```

## Environment Variables

Key variables to configure in `.env.local`:

```env
# Application
NODE_ENV=production
PORT=3000

# Backend API
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com

# Authentication
JWT_SECRET=your-secret-key
SESSION_SECRET=your-session-secret

# Database (if using)
DATABASE_URL=postgresql://user:pass@host:5432/db

# Add more as needed...
```

See [.env.example](./env.example) for all available options.

## Kubernetes Deployment

### Create Secret

```bash
# Create secret from .env.local
kubectl create secret generic vsay-terminal-secrets \
  --from-env-file=.env.local
```

### Basic Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vsay-terminal
  labels:
    app: vsay-terminal
spec:
  replicas: 3
  selector:
    matchLabels:
      app: vsay-terminal
  template:
    metadata:
      labels:
        app: vsay-terminal
    spec:
      containers:
      - name: vsay-terminal
        image: your-registry.com/vsay-terminal:latest
        ports:
        - containerPort: 3000
        envFrom:
        - secretRef:
            name: vsay-terminal-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: vsay-terminal
spec:
  selector:
    app: vsay-terminal
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

Save as `deployment.yaml` and apply:

```bash
kubectl apply -f deployment.yaml
```

## Container Management

### Access Container Shell

```bash
# Docker Compose
docker-compose exec vsay-terminal sh

# Docker
docker exec -it vsay-terminal sh
```

### Check Container Status

```bash
# Docker Compose
docker-compose ps

# Docker
docker ps | grep vsay-terminal
```

### View Resource Usage

```bash
# Real-time stats
docker stats vsay-terminal

# Disk usage
docker system df
```

## Troubleshooting

### Port Already in Use

```bash
# Check what's using port 3000
lsof -i :3000

# Or use different port
docker run -p 3001:3000 vsay-terminal:latest
```

### Build Errors

```bash
# Clean build cache
docker builder prune -a

# Rebuild from scratch
docker-compose build --no-cache
```

### Container Won't Start

```bash
# Check logs
docker-compose logs

# Inspect container
docker inspect vsay-terminal
```

### Out of Disk Space

```bash
# Remove unused containers
docker container prune

# Remove unused images
docker image prune -a

# Remove everything unused
docker system prune -a --volumes
```

## Performance Tips

The Dockerfile is already optimized with:
- **Multi-stage build** - Smaller final image (~150MB)
- **Standalone output** - Only necessary files included
- **Non-root user** - Better security
- **Layer caching** - Faster rebuilds

## Security Best Practices

1. **Never commit `.env.local`** - Contains sensitive data
2. **Use secrets in K8s** - Don't hardcode credentials
3. **Scan images regularly**:
   ```bash
   docker scan vsay-terminal:latest
   ```
4. **Keep base images updated**:
   ```bash
   docker pull node:20-alpine
   docker build --no-cache -t vsay-terminal:latest .
   ```
5. **Use specific image tags** - Not `latest` in production

## Health Check Endpoint

The health check expects an API endpoint. Create `app/api/health/route.ts`:

```typescript
export async function GET() {
  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
}
```

Or remove the health check from docker-compose.yml if not needed.

## Summary

**For Local Testing:**
```bash
docker-compose up
```

**For Production:**
```bash
docker build -t vsay-terminal:latest .
docker tag vsay-terminal:latest your-registry.com/vsay-terminal:latest
docker push your-registry.com/vsay-terminal:latest
```

**For K8s:**
```bash
docker buildx build --platform linux/amd64,linux/arm64 \
  -t your-registry.com/vsay-terminal:latest --push .
kubectl apply -f deployment.yaml
```

That's it! Simple and production-ready.
