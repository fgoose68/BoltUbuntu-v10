#!/bin/bash

set -e

echo "====================================="
echo "Raspberry Pi Dashboard Setup"
echo "====================================="
echo ""

if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "Creating required directories..."
mkdir -p backups uploads/office

echo ""
echo "Checking environment variables..."

if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cat > .env << EOF
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=$(openssl rand -hex 32)

VITE_API_URL=http://localhost:3050/api

NAS_IP=192.168.1.100
NAS_SHARE=backups
NAS_USER=admin
NAS_PASS=password
EOF
    echo ""
    echo "⚠️  IMPORTANT: Edit the .env file with your actual Supabase credentials"
    echo "   The JWT_SECRET has been generated automatically."
    echo ""
    read -p "Press Enter after updating .env file..."
fi

source .env

if [ "$VITE_SUPABASE_URL" = "your_supabase_url" ]; then
    echo "⚠️  Please update the .env file with your Supabase credentials"
    exit 1
fi

echo ""
read -p "Do you want to mount a NAS? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    chmod +x scripts/mount-nas.sh
    ./scripts/mount-nas.sh
fi

echo ""
echo "Installing dependencies..."
npm install

echo ""
echo "Building the application..."
npm run build

echo ""
echo "Starting Docker containers..."
docker-compose up -d

echo ""
echo "====================================="
echo "Setup Complete!"
echo "====================================="
echo ""
echo "Your Raspberry Pi Dashboard is now running!"
echo ""
echo "Access it at: http://localhost:3050"
echo "Or use your Raspberry Pi IP address: http://<raspberry-pi-ip>:3050"
echo ""
echo "Next steps:"
echo "1. Open the dashboard in your browser"
echo "2. Register a new account"
echo "3. Configure Pushover notifications in Settings"
echo "4. Start backing up your Docker containers!"
echo ""
echo "Useful commands:"
echo "  - View logs: docker-compose logs -f dashboard"
echo "  - Stop: docker-compose stop"
echo "  - Restart: docker-compose restart"
echo "  - Update: git pull && docker-compose up -d --build"
echo ""
