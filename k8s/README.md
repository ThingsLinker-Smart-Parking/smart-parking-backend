# Kubernetes Deployment for Smart Parking Backend

This directory contains Kubernetes manifests and deployment scripts for the Smart Parking Backend application.

## Prerequisites

- Kubernetes cluster (v1.20+)
- kubectl CLI tool installed and configured
- Docker registry access (for pushing/pulling images)
- cert-manager (optional, for automatic TLS certificate management)
- Ingress controller (nginx-ingress recommended)

## Quick Start

### 1. Build Docker Image

```bash
# Build image locally
./build-docker.sh

# Build and push to registry
REGISTRY=your-registry.com/your-username \
PUSH=true \
REGISTRY_USERNAME=your-username \
REGISTRY_PASSWORD=your-password \
./build-docker.sh
```

### 2. Update Configuration

Before deploying, update the following files:

**k8s/secret.yaml**
- Database credentials
- JWT secrets
- Email credentials
- MQTT credentials
- Cashfree payment gateway credentials

**k8s/configmap.yaml**
- Database host (if not using default)
- MQTT broker URL
- Base URL and allowed origins
- Email SMTP settings

**k8s/deployment.yaml**
- Container image name (replace `your-registry/smart-parking-backend:latest`)

**k8s/ingress.yaml**
- Domain name (replace `api.smartparking.com`)
- TLS certificate configuration

### 3. Deploy to Kubernetes

```bash
# Deploy to default namespace (smart-parking)
./deploy-k8s.sh

# Deploy to custom namespace
./deploy-k8s.sh -n production

# Dry-run to see what would be deployed
./deploy-k8s.sh --dry-run
```

## Kubernetes Resources

### Namespace
- **File**: `namespace.yaml`
- **Purpose**: Isolates application resources

### ConfigMap
- **File**: `configmap.yaml`
- **Purpose**: Non-sensitive configuration (database host, ports, etc.)

### Secret
- **File**: `secret.yaml`
- **Purpose**: Sensitive data (passwords, API keys, JWT secrets)
- **Security**: Update with actual values before deployment

### Deployment
- **File**: `deployment.yaml`
- **Resources**:
  - Deployment with 3 replicas
  - Init container for database migrations
  - Resource limits and requests
  - Liveness, readiness, and startup probes
  - Security contexts
  - ServiceAccount
  - PodDisruptionBudget
  - HorizontalPodAutoscaler (3-10 replicas)

### Service
- **File**: `service.yaml`
- **Type**: ClusterIP
- **Ports**: 80 (HTTP), 443 (HTTPS)
- **Includes**: Headless service for StatefulSet (if needed)

### Ingress
- **File**: `ingress.yaml`
- **Features**:
  - TLS/SSL termination
  - CORS configuration
  - Rate limiting
  - Security headers
  - cert-manager integration for automatic TLS certificates
  - Multiple ingress controller options (nginx, AWS ALB, GCP)

## Deployment Commands

### Deploy Application
```bash
# Deploy all resources
./deploy-k8s.sh

# Deploy to specific namespace
./deploy-k8s.sh -n production

# Deploy using specific kubeconfig context
./deploy-k8s.sh -c prod-cluster

# Dry-run deployment
./deploy-k8s.sh --dry-run
```

### Check Status
```bash
# Show deployment status
./deploy-k8s.sh status

# View logs
./deploy-k8s.sh logs

# Or use kubectl directly
kubectl get all -n smart-parking
kubectl get pods -n smart-parking -l app=smart-parking-backend
kubectl logs -n smart-parking -l app=smart-parking-backend --tail=100 -f
```

### Update Deployment
```bash
# Update with new image
kubectl set image deployment/smart-parking-backend \
  smart-parking-backend=your-registry/smart-parking-backend:v2.0.0 \
  -n smart-parking

# Or rebuild and deploy
./build-docker.sh --push --version v2.0.0
./deploy-k8s.sh
```

### Rollback Deployment
```bash
# Rollback using script
./deploy-k8s.sh rollback

# Or use kubectl
kubectl rollout undo deployment/smart-parking-backend -n smart-parking
kubectl rollout status deployment/smart-parking-backend -n smart-parking
```

### Scale Deployment
```bash
# Manual scaling
kubectl scale deployment/smart-parking-backend --replicas=5 -n smart-parking

# HPA will automatically scale between 3-10 replicas based on CPU/memory
kubectl get hpa -n smart-parking
```

### Delete Deployment
```bash
# Delete all resources
./deploy-k8s.sh delete

# Or use kubectl
kubectl delete -f k8s/ -n smart-parking
kubectl delete namespace smart-parking
```

## Managing Secrets

### Option 1: Using YAML file (less secure)
```bash
# Edit k8s/secret.yaml with actual values
kubectl apply -f k8s/secret.yaml -n smart-parking
```

### Option 2: Using kubectl command (more secure)
```bash
kubectl create secret generic smart-parking-secrets \
  --from-literal=DB_USERNAME=postgres \
  --from-literal=DB_PASSWORD=your-password \
  --from-literal=JWT_SECRET=$(openssl rand -base64 32) \
  --from-literal=SESSION_SECRET=$(openssl rand -base64 32) \
  --from-literal=WEBHOOK_SECRET=$(openssl rand -base64 32) \
  --from-literal=EMAIL=noreply@smartparking.com \
  --from-literal=EMAIL_PASSWORD=your-email-password \
  --from-literal=MQTT_USERNAME=mqtt-user \
  --from-literal=MQTT_PASSWORD=your-mqtt-password \
  --from-literal=CASHFREE_CLIENT_ID=your-client-id \
  --from-literal=CASHFREE_CLIENT_SECRET=your-client-secret \
  --namespace=smart-parking
```

### Option 3: Using external secret manager
- AWS Secrets Manager
- Google Secret Manager
- Azure Key Vault
- HashiCorp Vault
- Kubernetes External Secrets Operator

## TLS/SSL Certificate Management

### Option 1: cert-manager (recommended)
```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Deploy ingress (includes ClusterIssuer and Certificate)
kubectl apply -f k8s/ingress.yaml -n smart-parking

# Check certificate status
kubectl get certificate -n smart-parking
kubectl describe certificate smartparking-tls-cert -n smart-parking
```

### Option 2: Manual certificate
```bash
# Create TLS secret with your certificate
kubectl create secret tls smartparking-tls-cert \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key \
  -n smart-parking
```

## Troubleshooting

### Check Pod Status
```bash
kubectl get pods -n smart-parking -l app=smart-parking-backend
kubectl describe pod <pod-name> -n smart-parking
```

### View Logs
```bash
# All pods
kubectl logs -n smart-parking -l app=smart-parking-backend --tail=100

# Specific pod
kubectl logs <pod-name> -n smart-parking

# Follow logs
kubectl logs -n smart-parking -l app=smart-parking-backend -f

# Previous container (if crashed)
kubectl logs <pod-name> -n smart-parking --previous
```

### Check Events
```bash
kubectl get events -n smart-parking --sort-by='.lastTimestamp'
```

### Debug Pod
```bash
# Execute shell in pod
kubectl exec -it <pod-name> -n smart-parking -- /bin/sh

# Port forward for local testing
kubectl port-forward -n smart-parking svc/smart-parking-backend 3000:80

# Test health endpoint
curl http://localhost:3000/api/health
```

### Check Resource Usage
```bash
# Pod resource usage
kubectl top pods -n smart-parking

# Node resource usage
kubectl top nodes

# HPA status
kubectl get hpa -n smart-parking
kubectl describe hpa smart-parking-backend-hpa -n smart-parking
```

### Database Migration Issues
```bash
# Check init container logs
kubectl logs <pod-name> -n smart-parking -c db-migration

# Manually run migration
kubectl exec -it <pod-name> -n smart-parking -- npm run migration:run
```

## Monitoring and Observability

### Prometheus Metrics
The deployment includes annotations for Prometheus scraping:
```yaml
prometheus.io/scrape: "true"
prometheus.io/port: "3000"
prometheus.io/path: "/metrics"
```

### Health Checks
- Liveness probe: `/api/health` (checks if app is alive)
- Readiness probe: `/api/health` (checks if app is ready to serve traffic)
- Startup probe: `/api/health` (checks if app has started)

## High Availability

### Pod Distribution
- **Replicas**: 3 (minimum)
- **HPA**: Auto-scales between 3-10 replicas
- **PodDisruptionBudget**: Ensures minimum 1 pod available during disruptions

### Rolling Updates
- **Strategy**: RollingUpdate
- **MaxSurge**: 1 (one extra pod during update)
- **MaxUnavailable**: 0 (no downtime during update)

### Resource Management
- **Requests**: 250m CPU, 256Mi memory (guaranteed)
- **Limits**: 500m CPU, 512Mi memory (maximum)

## Security

### Pod Security
- Non-root user (UID 1001)
- Read-only root filesystem (where possible)
- Dropped capabilities
- Security context policies

### Network Security
- CORS configuration
- Rate limiting
- TLS/SSL encryption
- Security headers

### Secrets Management
- Kubernetes secrets for sensitive data
- No hardcoded credentials
- Environment-based configuration

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Build and Push Docker Image
  run: |
    REGISTRY=your-registry.com \
    PUSH=true \
    VERSION=${{ github.sha }} \
    ./build-docker.sh

- name: Deploy to Kubernetes
  run: |
    NAMESPACE=production \
    ./deploy-k8s.sh
```

### GitLab CI Example
```yaml
deploy:
  script:
    - ./build-docker.sh
    - ./deploy-k8s.sh -n production
```

## Production Checklist

- [ ] Update all secrets with production values
- [ ] Configure production database connection
- [ ] Set up TLS certificates
- [ ] Configure domain name in ingress
- [ ] Set appropriate resource limits
- [ ] Configure monitoring and alerting
- [ ] Set up log aggregation
- [ ] Configure backup strategy
- [ ] Test rollback procedure
- [ ] Document runbook procedures
- [ ] Set up CI/CD pipeline

## Support

For issues and questions:
- Check application logs: `kubectl logs -n smart-parking -l app=smart-parking-backend`
- Review Kubernetes events: `kubectl get events -n smart-parking`
- Consult main project README.md
- Check CLAUDE.md for development guidelines
