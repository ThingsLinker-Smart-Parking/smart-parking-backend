#!/bin/bash

##############################################################################
# Docker Build Script for Smart Parking Backend
# This script builds and optionally pushes the Docker image to a registry
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
IMAGE_NAME="${IMAGE_NAME:-smart-parking-backend}"
REGISTRY="${REGISTRY:-}"
VERSION="${VERSION:-$(git rev-parse --short HEAD 2>/dev/null || echo 'latest')}"
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
PLATFORM="${PLATFORM:-linux/amd64,linux/arm64}"

# Derived variables
if [ -n "$REGISTRY" ]; then
    FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}"
else
    FULL_IMAGE_NAME="${IMAGE_NAME}"
fi

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

    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    print_success "Docker is installed"

    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker."
        exit 1
    fi
    print_success "Docker daemon is running"

    # Check if Dockerfile exists
    if [ ! -f "Dockerfile" ]; then
        print_error "Dockerfile not found in current directory"
        exit 1
    fi
    print_success "Dockerfile found"
}

build_image() {
    print_header "Building Docker Image"

    print_info "Image: ${FULL_IMAGE_NAME}"
    print_info "Version: ${VERSION}"
    print_info "Build Date: ${BUILD_DATE}"
    print_info "Platform: ${PLATFORM}"

    # Build the image
    docker build \
        --platform="${PLATFORM}" \
        --build-arg BUILD_DATE="${BUILD_DATE}" \
        --build-arg VERSION="${VERSION}" \
        --tag "${FULL_IMAGE_NAME}:${VERSION}" \
        --tag "${FULL_IMAGE_NAME}:latest" \
        --file Dockerfile \
        .

    print_success "Docker image built successfully"
}

tag_image() {
    print_header "Tagging Docker Image"

    # Additional tags
    if [ -n "${ADDITIONAL_TAGS:-}" ]; then
        IFS=',' read -ra TAGS <<< "$ADDITIONAL_TAGS"
        for tag in "${TAGS[@]}"; do
            print_info "Tagging as: ${FULL_IMAGE_NAME}:${tag}"
            docker tag "${FULL_IMAGE_NAME}:${VERSION}" "${FULL_IMAGE_NAME}:${tag}"
        done
    fi

    print_success "Image tagged successfully"
}

push_image() {
    if [ "${PUSH:-false}" = "true" ]; then
        print_header "Pushing Docker Image to Registry"

        if [ -z "$REGISTRY" ]; then
            print_error "REGISTRY environment variable is not set"
            exit 1
        fi

        # Login to registry if credentials are provided
        if [ -n "${REGISTRY_USERNAME:-}" ] && [ -n "${REGISTRY_PASSWORD:-}" ]; then
            print_info "Logging in to registry..."
            echo "$REGISTRY_PASSWORD" | docker login "$REGISTRY" -u "$REGISTRY_USERNAME" --password-stdin
        fi

        # Push version tag
        print_info "Pushing ${FULL_IMAGE_NAME}:${VERSION}"
        docker push "${FULL_IMAGE_NAME}:${VERSION}"

        # Push latest tag
        print_info "Pushing ${FULL_IMAGE_NAME}:latest"
        docker push "${FULL_IMAGE_NAME}:latest"

        # Push additional tags
        if [ -n "${ADDITIONAL_TAGS:-}" ]; then
            IFS=',' read -ra TAGS <<< "$ADDITIONAL_TAGS"
            for tag in "${TAGS[@]}"; do
                print_info "Pushing ${FULL_IMAGE_NAME}:${tag}"
                docker push "${FULL_IMAGE_NAME}:${tag}"
            done
        fi

        print_success "Docker image pushed successfully"

        # Logout from registry
        if [ -n "${REGISTRY_USERNAME:-}" ]; then
            docker logout "$REGISTRY" 2>/dev/null || true
        fi
    else
        print_info "Skipping push (set PUSH=true to push to registry)"
    fi
}

show_images() {
    print_header "Built Images"
    docker images | grep "${IMAGE_NAME}" | head -5
}

show_summary() {
    print_header "Build Summary"
    echo "Image Name: ${FULL_IMAGE_NAME}"
    echo "Version: ${VERSION}"
    echo "Build Date: ${BUILD_DATE}"
    echo ""
    echo "To run the container:"
    echo "  docker run -p 3000:3000 --env-file .env ${FULL_IMAGE_NAME}:${VERSION}"
    echo ""
    echo "To push to registry:"
    echo "  PUSH=true REGISTRY=your-registry.com ./build-docker.sh"
    echo ""
}

print_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Build Docker image for Smart Parking Backend

OPTIONS:
    -h, --help              Show this help message
    -p, --push              Push image to registry after build
    -r, --registry REGISTRY Set registry URL (e.g., docker.io/username)
    -v, --version VERSION   Set image version (default: git commit hash or 'latest')
    -t, --tag TAG           Add additional tag (can be used multiple times)
    --platform PLATFORM     Set build platform (default: linux/amd64,linux/arm64)

ENVIRONMENT VARIABLES:
    IMAGE_NAME              Image name (default: smart-parking-backend)
    REGISTRY                Docker registry URL
    VERSION                 Image version tag
    PUSH                    Push to registry (true/false)
    REGISTRY_USERNAME       Registry username for authentication
    REGISTRY_PASSWORD       Registry password for authentication
    ADDITIONAL_TAGS         Comma-separated list of additional tags
    PLATFORM                Build platform(s)

EXAMPLES:
    # Build locally
    ./build-docker.sh

    # Build and push to Docker Hub
    REGISTRY=docker.io/yourusername PUSH=true ./build-docker.sh

    # Build with custom version
    VERSION=v1.2.3 ./build-docker.sh

    # Build for specific platform
    PLATFORM=linux/amd64 ./build-docker.sh

    # Build with additional tags
    ADDITIONAL_TAGS=stable,prod ./build-docker.sh

EOF
}

# Main execution
main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                print_usage
                exit 0
                ;;
            -p|--push)
                PUSH=true
                shift
                ;;
            -r|--registry)
                REGISTRY="$2"
                shift 2
                ;;
            -v|--version)
                VERSION="$2"
                shift 2
                ;;
            -t|--tag)
                if [ -z "${ADDITIONAL_TAGS:-}" ]; then
                    ADDITIONAL_TAGS="$2"
                else
                    ADDITIONAL_TAGS="${ADDITIONAL_TAGS},$2"
                fi
                shift 2
                ;;
            --platform)
                PLATFORM="$2"
                shift 2
                ;;
            *)
                print_error "Unknown option: $1"
                print_usage
                exit 1
                ;;
        esac
    done

    # Update FULL_IMAGE_NAME if registry was set via CLI
    if [ -n "$REGISTRY" ]; then
        FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}"
    fi

    # Execute build steps
    check_prerequisites
    build_image
    tag_image
    push_image
    show_images
    show_summary

    print_success "Build process completed successfully!"
}

# Run main function
main "$@"
