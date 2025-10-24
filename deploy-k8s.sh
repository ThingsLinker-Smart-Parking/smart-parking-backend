#!/bin/bash

##############################################################################
# Kubernetes Deployment Script for Smart Parking Backend
# This script deploys the application to a Kubernetes cluster
##############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="${NAMESPACE:-smart-parking}"
K8S_DIR="${K8S_DIR:-./k8s}"
CONTEXT="${CONTEXT:-}"
DRY_RUN="${DRY_RUN:-false}"
WAIT_TIMEOUT="${WAIT_TIMEOUT:-300s}"

# Functions
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo ""
    echo "============================================"
    echo "$1"
    echo "============================================"
    echo ""
}

check_prerequisites() {
    print_header "Checking Prerequisites"

    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    print_success "kubectl is installed ($(kubectl version --client --short 2>/dev/null || kubectl version --client))"

    # Check if k8s directory exists
    if [ ! -d "$K8S_DIR" ]; then
        print_error "Kubernetes manifests directory not found: $K8S_DIR"
        exit 1
    fi
    print_success "Kubernetes manifests directory found"

    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    print_success "Connected to Kubernetes cluster"

    # Show current context
    CURRENT_CONTEXT=$(kubectl config current-context)
    print_info "Current context: ${CURRENT_CONTEXT}"

    # Switch context if specified
    if [ -n "$CONTEXT" ] && [ "$CONTEXT" != "$CURRENT_CONTEXT" ]; then
        print_info "Switching to context: ${CONTEXT}"
        kubectl config use-context "$CONTEXT"
    fi
}

create_namespace() {
    print_header "Creating Namespace"

    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        print_info "Namespace '$NAMESPACE' already exists"
    else
        print_info "Creating namespace '$NAMESPACE'"
        if [ "$DRY_RUN" = "true" ]; then
            kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml
        else
            kubectl create namespace "$NAMESPACE"
            print_success "Namespace created"
        fi
    fi
}

deploy_secrets() {
    print_header "Deploying Secrets"

    print_warning "Make sure to update secrets in ${K8S_DIR}/secret.yaml with actual values!"
    print_info "You can also create secrets from command line (see secret.yaml for examples)"

    read -p "Have you updated the secrets? (yes/no) " -n 3 -r
    echo
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_error "Please update the secrets before deploying"
        exit 1
    fi

    if [ "$DRY_RUN" = "true" ]; then
        kubectl apply -f "${K8S_DIR}/secret.yaml" --namespace="$NAMESPACE" --dry-run=client
    else
        kubectl apply -f "${K8S_DIR}/secret.yaml" --namespace="$NAMESPACE"
        print_success "Secrets deployed"
    fi
}

deploy_configmap() {
    print_header "Deploying ConfigMap"

    if [ "$DRY_RUN" = "true" ]; then
        kubectl apply -f "${K8S_DIR}/configmap.yaml" --namespace="$NAMESPACE" --dry-run=client
    else
        kubectl apply -f "${K8S_DIR}/configmap.yaml" --namespace="$NAMESPACE"
        print_success "ConfigMap deployed"
    fi
}

deploy_service() {
    print_header "Deploying Service"

    if [ "$DRY_RUN" = "true" ]; then
        kubectl apply -f "${K8S_DIR}/service.yaml" --namespace="$NAMESPACE" --dry-run=client
    else
        kubectl apply -f "${K8S_DIR}/service.yaml" --namespace="$NAMESPACE"
        print_success "Service deployed"
    fi
}

deploy_deployment() {
    print_header "Deploying Application"

    print_warning "Make sure to update the image name in ${K8S_DIR}/deployment.yaml!"
    print_info "Replace 'your-registry/smart-parking-backend:latest' with your actual image"

    if [ "$DRY_RUN" = "true" ]; then
        kubectl apply -f "${K8S_DIR}/deployment.yaml" --namespace="$NAMESPACE" --dry-run=client
    else
        kubectl apply -f "${K8S_DIR}/deployment.yaml" --namespace="$NAMESPACE"
        print_success "Deployment created"
    fi
}

deploy_ingress() {
    print_header "Deploying Ingress"

    print_warning "Make sure to update the domain name in ${K8S_DIR}/ingress.yaml!"
    print_info "Replace 'api.smartparking.com' with your actual domain"

    if [ "$DRY_RUN" = "true" ]; then
        kubectl apply -f "${K8S_DIR}/ingress.yaml" --namespace="$NAMESPACE" --dry-run=client
    else
        # Check if cert-manager is installed
        if kubectl get crd certificates.cert-manager.io &> /dev/null; then
            print_info "cert-manager detected, deploying with certificates"
            kubectl apply -f "${K8S_DIR}/ingress.yaml" --namespace="$NAMESPACE"
        else
            print_warning "cert-manager not found, you may need to manage TLS certificates manually"
            kubectl apply -f "${K8S_DIR}/ingress.yaml" --namespace="$NAMESPACE"
        fi
        print_success "Ingress deployed"
    fi
}

wait_for_deployment() {
    if [ "$DRY_RUN" = "true" ]; then
        print_info "Skipping wait in dry-run mode"
        return
    fi

    print_header "Waiting for Deployment to be Ready"

    print_info "Waiting for deployment to be ready (timeout: ${WAIT_TIMEOUT})..."

    if kubectl wait --for=condition=available --timeout="$WAIT_TIMEOUT" \
        deployment/smart-parking-backend --namespace="$NAMESPACE"; then
        print_success "Deployment is ready!"
    else
        print_error "Deployment failed to become ready within timeout"
        print_info "Checking pod status..."
        kubectl get pods --namespace="$NAMESPACE" -l app=smart-parking-backend
        print_info "Checking recent events..."
        kubectl get events --namespace="$NAMESPACE" --sort-by='.lastTimestamp' | tail -20
        exit 1
    fi
}

show_status() {
    if [ "$DRY_RUN" = "true" ]; then
        print_info "Skipping status check in dry-run mode"
        return
    fi

    print_header "Deployment Status"

    echo "Pods:"
    kubectl get pods --namespace="$NAMESPACE" -l app=smart-parking-backend

    echo ""
    echo "Services:"
    kubectl get services --namespace="$NAMESPACE" -l app=smart-parking-backend

    echo ""
    echo "Ingress:"
    kubectl get ingress --namespace="$NAMESPACE"

    echo ""
    echo "Deployment:"
    kubectl get deployment smart-parking-backend --namespace="$NAMESPACE"

    echo ""
    echo "HPA:"
    kubectl get hpa --namespace="$NAMESPACE"
}

show_logs() {
    if [ "$DRY_RUN" = "true" ]; then
        return
    fi

    print_header "Recent Logs"

    print_info "Fetching logs from the most recent pod..."
    POD=$(kubectl get pods --namespace="$NAMESPACE" -l app=smart-parking-backend \
        --sort-by=.metadata.creationTimestamp -o jsonpath='{.items[-1].metadata.name}' 2>/dev/null || echo "")

    if [ -n "$POD" ]; then
        kubectl logs "$POD" --namespace="$NAMESPACE" --tail=50 || true
    else
        print_warning "No pods found"
    fi
}

rollback_deployment() {
    print_header "Rolling Back Deployment"

    print_warning "This will rollback to the previous deployment revision"
    read -p "Are you sure you want to rollback? (yes/no) " -n 3 -r
    echo

    if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        kubectl rollout undo deployment/smart-parking-backend --namespace="$NAMESPACE"
        print_success "Rollback initiated"
        kubectl rollout status deployment/smart-parking-backend --namespace="$NAMESPACE"
    else
        print_info "Rollback cancelled"
    fi
}

delete_deployment() {
    print_header "Deleting Deployment"

    print_warning "This will delete all resources in namespace: $NAMESPACE"
    read -p "Are you sure you want to delete? (yes/no) " -n 3 -r
    echo

    if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        kubectl delete -f "${K8S_DIR}/" --namespace="$NAMESPACE" --ignore-not-found=true
        print_success "Resources deleted"

        read -p "Do you want to delete the namespace as well? (yes/no) " -n 3 -r
        echo
        if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            kubectl delete namespace "$NAMESPACE"
            print_success "Namespace deleted"
        fi
    else
        print_info "Deletion cancelled"
    fi
}

show_summary() {
    print_header "Deployment Summary"

    cat << EOF
Deployment completed successfully!

Namespace: ${NAMESPACE}
Context: $(kubectl config current-context)

Useful commands:
  # Check pod status
  kubectl get pods -n ${NAMESPACE} -l app=smart-parking-backend

  # View logs
  kubectl logs -n ${NAMESPACE} -l app=smart-parking-backend --tail=100 -f

  # Check deployment status
  kubectl get deployment -n ${NAMESPACE}

  # View service
  kubectl get svc -n ${NAMESPACE}

  # View ingress
  kubectl get ingress -n ${NAMESPACE}

  # Port forward for local testing
  kubectl port-forward -n ${NAMESPACE} svc/smart-parking-backend 3000:80

  # Rollback deployment
  kubectl rollout undo deployment/smart-parking-backend -n ${NAMESPACE}

  # Scale deployment
  kubectl scale deployment/smart-parking-backend -n ${NAMESPACE} --replicas=5

  # Update deployment image
  kubectl set image deployment/smart-parking-backend -n ${NAMESPACE} \\
    smart-parking-backend=your-registry/smart-parking-backend:new-version

  # View HPA status
  kubectl get hpa -n ${NAMESPACE}

  # Describe pod for troubleshooting
  kubectl describe pod -n ${NAMESPACE} -l app=smart-parking-backend

EOF
}

print_usage() {
    cat << EOF
Usage: $0 [COMMAND] [OPTIONS]

Deploy Smart Parking Backend to Kubernetes cluster

COMMANDS:
    deploy          Deploy or update all resources (default)
    delete          Delete all resources
    rollback        Rollback to previous deployment
    status          Show deployment status
    logs            Show recent logs
    help            Show this help message

OPTIONS:
    -n, --namespace NAMESPACE   Kubernetes namespace (default: smart-parking)
    -c, --context CONTEXT       Kubernetes context to use
    -d, --dry-run              Run in dry-run mode
    --timeout TIMEOUT          Wait timeout (default: 300s)
    -h, --help                 Show this help message

ENVIRONMENT VARIABLES:
    NAMESPACE       Kubernetes namespace
    K8S_DIR         Directory containing Kubernetes manifests (default: ./k8s)
    CONTEXT         Kubernetes context
    DRY_RUN         Run in dry-run mode (true/false)
    WAIT_TIMEOUT    Deployment wait timeout

EXAMPLES:
    # Deploy to default namespace
    ./deploy-k8s.sh

    # Deploy to custom namespace
    ./deploy-k8s.sh -n production

    # Dry-run deployment
    ./deploy-k8s.sh --dry-run

    # Deploy to specific context
    ./deploy-k8s.sh -c prod-cluster

    # Check deployment status
    ./deploy-k8s.sh status

    # View logs
    ./deploy-k8s.sh logs

    # Rollback deployment
    ./deploy-k8s.sh rollback

    # Delete all resources
    ./deploy-k8s.sh delete

EOF
}

# Main execution
main() {
    COMMAND="${1:-deploy}"

    # Parse command line arguments
    shift || true
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                print_usage
                exit 0
                ;;
            -n|--namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            -c|--context)
                CONTEXT="$2"
                shift 2
                ;;
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            --timeout)
                WAIT_TIMEOUT="$2"
                shift 2
                ;;
            *)
                print_error "Unknown option: $1"
                print_usage
                exit 1
                ;;
        esac
    done

    # Execute command
    case $COMMAND in
        deploy)
            check_prerequisites
            create_namespace
            deploy_secrets
            deploy_configmap
            deploy_service
            deploy_deployment
            deploy_ingress
            wait_for_deployment
            show_status
            show_logs
            show_summary
            ;;
        delete)
            check_prerequisites
            delete_deployment
            ;;
        rollback)
            check_prerequisites
            rollback_deployment
            ;;
        status)
            check_prerequisites
            show_status
            ;;
        logs)
            check_prerequisites
            show_logs
            ;;
        help)
            print_usage
            exit 0
            ;;
        *)
            print_error "Unknown command: $COMMAND"
            print_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
