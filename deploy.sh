#!/bin/bash

# 🚀 Viaticos 2025 - DigitalOcean Deployment Script

set -e

echo "🚀 Viaticos 2025 - DigitalOcean Deployment"
echo "==========================================="

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo "❌ doctl is not installed. Please install it first:"
    echo "   brew install doctl"
    exit 1
fi

# Check if user is authenticated
if ! doctl auth list | grep -q "current"; then
    echo "❌ You need to authenticate with DigitalOcean first:"
    echo "   doctl auth init"
    echo ""
    echo "1. Go to https://cloud.digitalocean.com/account/api/tokens"
    echo "2. Generate a new token"
    echo "3. Run 'doctl auth init' and paste the token"
    exit 1
fi

echo "✅ doctl is installed and authenticated"

# Check if app.yaml exists
if [ ! -f ".do/app.yaml" ]; then
    echo "❌ .do/app.yaml not found"
    exit 1
fi

echo "✅ Found deployment configuration"

# Generate a strong JWT secret if not provided
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 32)
    echo "🔑 Generated JWT secret: $JWT_SECRET"
fi

echo ""
echo "📋 Pre-deployment checklist:"
echo "   1. ✅ Code is ready for deployment"
echo "   2. ✅ Docker configurations are prepared"
echo "   3. ✅ Environment variables are configured"
echo ""

read -p "🤔 Do you want to proceed with deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

echo ""
echo "🚀 Starting deployment..."

# Deploy the app
echo "📦 Creating app on DigitalOcean..."
APP_ID=$(doctl apps create .do/app.yaml --format ID --no-header)

if [ $? -eq 0 ]; then
    echo "✅ App created successfully!"
    echo "📱 App ID: $APP_ID"
    echo ""
    echo "🔗 View your app:"
    echo "   Web: https://cloud.digitalocean.com/apps/$APP_ID"
    echo "   CLI: doctl apps get $APP_ID"
    echo ""
    echo "📊 Monitor deployment:"
    echo "   doctl apps logs $APP_ID"
    echo ""
    echo "⏳ Deployment typically takes 5-10 minutes..."
    echo ""
    echo "🎉 Next steps after deployment completes:"
    echo "   1. Set the JWT_SECRET environment variable"
    echo "   2. Create initial super admin user"
    echo "   3. Add initial countries and categories"
    echo ""
    echo "📖 See DEPLOYMENT.md for detailed post-deployment setup"
else
    echo "❌ Deployment failed"
    exit 1
fi
