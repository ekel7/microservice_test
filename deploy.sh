#!/bin/bash

# Tennis Court App Deployment Script
# This script installs dependencies and deploys both frontend and backend to Vercel
# 
# Usage: ./deploy.sh
# 
# Note: This script is now supplemented by GitHub Actions for automatic deployment.
# You can still use this script for manual deployments when needed.

set -e  # Exit on any error

echo "🚀 Starting manual deployment process..."
echo "💡 Tip: Consider using GitHub Actions for automatic deployment!"

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd "$SCRIPT_DIR/backend"
npm install

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd "$SCRIPT_DIR/frontend"
npm install

# Deploy backend to Vercel
echo "🔧 Deploying backend to Vercel..."
cd "$SCRIPT_DIR/backend"
vercel --prod

# Deploy frontend to Vercel
echo "🎨 Deploying frontend to Vercel..."
cd "$SCRIPT_DIR/frontend"
vercel --prod

echo "✅ Deployment completed successfully!"
echo "🌐 Both frontend and backend have been deployed to production"
