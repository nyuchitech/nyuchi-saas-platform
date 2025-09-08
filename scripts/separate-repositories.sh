#!/bin/bash

# Repository Separation Script for Nyuchi Packages
# This script helps separate the MailSense Extension and WordPress Plugin into their own repositories

echo "🚀 Nyuchi Repository Separation Script"
echo "======================================="

# Function to create a new repository directory
create_repo() {
    local package_name=$1
    local source_dir=$2
    local repo_name=$3
    
    echo "📁 Creating repository for $package_name..."
    
    # Create new directory
    mkdir -p "../$repo_name"
    
    # Copy package files
    cp -r "$source_dir"/* "../$repo_name/"
    
    # Initialize git repository
    cd "../$repo_name"
    git init
    git add .
    git commit -m "Initial commit: $package_name"
    
    echo "✅ Repository created at ../$repo_name"
    cd - > /dev/null
}

# Function to create GitHub repository (requires GitHub CLI)
create_github_repo() {
    local repo_name=$1
    local description=$2
    
    if command -v gh &> /dev/null; then
        echo "🌐 Creating GitHub repository: $repo_name"
        cd "../$repo_name"
        gh repo create "nyuchitech/$repo_name" --public --description "$description" --source=.
        cd - > /dev/null
    else
        echo "⚠️  GitHub CLI not found. Please create repository manually at:"
        echo "   https://github.com/new"
        echo "   Repository name: $repo_name"
        echo "   Organization: nyuchitech"
    fi
}

# Check if we're in the right directory
if [ ! -d "packages" ]; then
    echo "❌ Error: This script must be run from the nyuchi-saas-platform root directory"
    exit 1
fi

echo "📦 Found packages:"
ls -la packages/

echo ""
read -p "🤔 Do you want to create separate repositories? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Create MailSense Extension repository
    echo ""
    echo "1️⃣ Creating MailSense Extension Repository..."
    create_repo "MailSense Extension" "packages/mailsense-extension" "mailsense-extension"
    
    # Create WordPress Plugin repository  
    echo ""
    echo "2️⃣ Creating WordPress Plugin Repository..."
    create_repo "Nyuchi SEO Manager" "packages/wordpress-plugin" "nyuchi-seo-manager"
    
    echo ""
    echo "🎯 Local repositories created successfully!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Review the files in each repository"
    echo "2. Create GitHub repositories:"
    echo "   - https://github.com/nyuchitech/mailsense-extension"
    echo "   - https://github.com/nyuchitech/nyuchi-seo-manager"
    echo "3. Push the local repositories to GitHub"
    echo ""
    
    read -p "🌐 Do you want to create GitHub repositories now? (requires GitHub CLI) (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        create_github_repo "mailsense-extension" "MailSense - AI Email Intelligence Chrome Extension"
        create_github_repo "nyuchi-seo-manager" "Nyuchi SEO Manager - WordPress Plugin for Centralized SEO Management"
    fi
    
    echo ""
    echo "🏁 Repository separation complete!"
    echo ""
    echo "📁 Repository structure:"
    echo "   ../mailsense-extension/     - Chrome extension for Gmail AI"
    echo "   ../nyuchi-seo-manager/      - WordPress SEO management plugin"
    echo "   ./                          - Main Nyuchi Platform (SaaS dashboard)"
    
else
    echo "⏹️  Repository separation cancelled."
fi

echo ""
echo "✨ Script completed!"
