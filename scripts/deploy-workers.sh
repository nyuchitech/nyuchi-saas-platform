#!/bin/bash

# Nyuchi Platform Unified Deployment Script
# This script handles deployment for all apps in the monorepo

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APPS=("marketing" "dashboard" "admin")
ENVIRONMENT=${1:-preview}

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Validate environment
validate_environment() {
    if [[ ! "$ENVIRONMENT" =~ ^(preview|production)$ ]]; then
        log_error "Invalid environment: $ENVIRONMENT"
        echo "Usage: $0 [preview|production] [app1,app2,app3]"
        echo "Apps: marketing, dashboard, admin"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if wrangler is installed
    if ! command -v wrangler &> /dev/null; then
        log_error "Wrangler CLI is not installed. Run: npm install -g wrangler"
        exit 1
    fi
    
    # Check if logged in to Cloudflare
    if ! wrangler whoami &> /dev/null; then
        log_error "Not logged in to Cloudflare. Run: wrangler login"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Build app
build_app() {
    local app=$1
    log_info "Building $app..."
    
    if ! npm run build:$app; then
        log_error "Failed to build $app"
        return 1
    fi
    
    log_success "$app built successfully"
}

# Deploy app
deploy_app() {
    local app=$1
    log_info "Deploying $app to $ENVIRONMENT..."
    
    cd "apps/$app"
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        if ! npm run deploy:production; then
            log_error "Failed to deploy $app to production"
            cd ../..
            return 1
        fi
    else
        if ! npm run deploy:preview; then
            log_error "Failed to deploy $app to preview"
            cd ../..
            return 1
        fi
    fi
    
    cd ../..
    log_success "$app deployed to $ENVIRONMENT"
}

# Main deployment logic
main() {
    log_info "🚀 Starting Nyuchi Platform deployment..."
    log_info "Environment: $ENVIRONMENT"
    
    # Parse specific apps if provided
    local target_apps=("${APPS[@]}")
    if [[ -n "$2" ]]; then
        IFS=',' read -ra target_apps <<< "$2"
    fi
    
    log_info "Apps to deploy: ${target_apps[*]}"
    
    validate_environment
    check_prerequisites
    
    # Install dependencies
    log_info "Installing dependencies..."
    npm ci
    
    # Build and deploy each app
    local failed_apps=()
    for app in "${target_apps[@]}"; do
        if [[ ! " ${APPS[@]} " =~ " $app " ]]; then
            log_warning "Unknown app: $app. Skipping..."
            continue
        fi
        
        if build_app "$app" && deploy_app "$app"; then
            log_success "$app deployment completed"
        else
            failed_apps+=("$app")
            log_error "$app deployment failed"
        fi
    done
    
    # Summary
    echo
    log_info "📋 Deployment Summary:"
    echo "Environment: $ENVIRONMENT"
    
    if [[ ${#failed_apps[@]} -eq 0 ]]; then
        log_success "All apps deployed successfully!"
        
        if [[ "$ENVIRONMENT" == "production" ]]; then
            echo
            log_info "🌐 Production URLs:"
            echo "Marketing: https://www.nyuchi.com"
            echo "Dashboard: https://dashboard.nyuchi.com"
            echo "Admin: https://admin.nyuchi.com"
        else
            echo
            log_info "🌐 Preview URLs:"
            echo "Marketing: https://nyuchi-marketing-preview.nyuchi.workers.dev"
            echo "Dashboard: https://nyuchi-dashboard-preview.nyuchi.workers.dev"
            echo "Admin: https://nyuchi-admin-preview.nyuchi.workers.dev"
        fi
    else
        log_error "Failed deployments: ${failed_apps[*]}"
        exit 1
    fi
}

# Run main function
main "$@"
