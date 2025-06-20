#!/bin/bash

# Git Commit Categories Analyzer - Uninstall Script
# This script removes the globally installed tool

set -e

echo "🗑️  Git Commit Categories Analyzer - Uninstall Script"
echo "====================================================="

# Check if the tool is installed
if command -v git-commit-analyzer &> /dev/null; then
    echo "📍 Found git-commit-analyzer installed globally"
    
    # Uninstall globally
    echo "🗑️  Uninstalling globally..."
    npm uninstall -g git-commit-categories
    
    echo ""
    echo "✅ Uninstallation complete!"
    echo ""
    echo "The following commands are no longer available:"
    echo "   git-commit-analyzer"
    echo "   gca"
else
    echo "ℹ️  git-commit-analyzer is not installed globally"
    echo "Nothing to uninstall."
fi

echo ""
echo "📝 Note: Your .env file and project files remain unchanged."
echo "   You can still run the tool locally with: npm start"
