#!/bin/bash

# WordPress Plugin Build Script

set -e

echo "🔌 Building WordPress Plugin..."

cd packages/wordpress-plugin

# Install dependencies
if [ -f "composer.json" ]; then
    composer install --no-dev --optimize-autoloader
fi

if [ -f "package.json" ]; then
    npm install
    npm run build
fi

# Create build directory
mkdir -p build
rm -rf build/*

# Copy plugin files
cp -r . build/nyuchi-platform-connector/
cd build/nyuchi-platform-connector

# Remove development files
rm -rf node_modules
rm -rf vendor
rm -rf tests
rm -rf .git*
rm -f package*.json
rm -f composer.*
rm -f phpunit.xml
rm -f phpcs.xml

# Create ZIP package
cd ..
zip -r nyuchi-platform-connector.zip nyuchi-platform-connector/

echo "✅ Plugin built successfully!"
echo "📦 Package: packages/wordpress-plugin/build/nyuchi-platform-connector.zip"
