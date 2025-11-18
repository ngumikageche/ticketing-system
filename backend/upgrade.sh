#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
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

# Function to show progress bar
show_progress() {
    local current=$1
    local total=$2
    local width=50
    local percentage=$((current * 100 / total))
    local completed=$((current * width / total))

    printf "\rProgress: ["
    for ((i=1; i<=completed; i++)); do printf "="; done
    for ((i=completed+1; i<=width; i++)); do printf " "; done
    printf "] %d%%" $percentage
}

echo "========================================"
echo "Support Ticketing System Upgrade Script"
echo "========================================"

# Function to check Docker Compose availability
check_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker-compose"
        return 0
    elif docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
        return 0
    else
        return 1
    fi
}

# Step 1: Check if docker and docker-compose are available
print_status "Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! check_docker_compose; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi
print_success "Docker and Docker Compose are available."

# Step 2: Pull latest changes (assuming git repo)
print_status "Pulling latest changes from repository..."
if [ -d ".git" ]; then
    git pull
    print_success "Repository updated."
else
    print_warning "Not a git repository. Skipping git pull."
fi

# Step 3: Build new Docker image
print_status "Building new Docker image..."
$DOCKER_COMPOSE_CMD build --no-cache
print_success "Docker image built successfully."

# Step 5: Start new containers
print_status "Starting new containers..."
$DOCKER_COMPOSE_CMD up -d

# Wait for containers to be healthy
print_status "Waiting for containers to start..."
sleep 10

# Check if containers are running
if $DOCKER_COMPOSE_CMD ps | grep -q "Up"; then
    print_success "Containers are running."
else
    print_error "Failed to start containers. Check logs with: $DOCKER_COMPOSE_CMD logs"
    exit 1
fi

# Step 6: Run database migrations
print_status "Running database migrations..."
# Wait for external database to be available
sleep 5

# Run migrations inside the container
$DOCKER_COMPOSE_CMD exec -T app python -c "
from app import create_app
from app.models.base import db
from flask_migrate import Migrate
import time

app = create_app()[0]
migrate = Migrate(app, db)

with app.app_context():
    # Run migrations
    from flask_migrate import upgrade
    upgrade()
    print('Database migrations completed successfully.')
"

if [ $? -eq 0 ]; then
    print_success "Database migrations completed."
else
    print_error "Database migration failed."
    exit 1
fi

# Step 7: Health check
print_status "Performing health check..."
sleep 5

# Simple health check - try to access the app
if curl -f http://localhost:5000/api/docs > /dev/null 2>&1; then
    print_success "Application is responding correctly."
else
    print_warning "Application health check failed. Please check logs with: $DOCKER_COMPOSE_CMD logs app"
fi

print_success "Upgrade completed successfully!"
echo ""
echo "Your application is now running at: http://localhost:5000"
echo "API documentation available at: http://localhost:5000/api/docs"
echo ""
echo "To view logs: $DOCKER_COMPOSE_CMD logs -f"
echo "To stop: $DOCKER_COMPOSE_CMD down"
echo "To restart: $DOCKER_COMPOSE_CMD restart"