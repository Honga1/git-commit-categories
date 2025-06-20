#!/bin/bash

# Git Commit Categories Analyzer - Installation Script
# This script installs the tool globally and sets up the environment

set -e

echo "🔍 Git Commit Categories Analyzer - Installation Script"
echo "======================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first:"
    echo "   https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Install dependencies and build
echo "📦 Installing dependencies..."
npm install

echo "🔨 Building the project..."
npm run build

# Install globally
echo "🌍 Installing globally..."
npm install -g .

echo ""
echo "✅ Installation complete!"
echo ""
echo "🎉 You can now use the tool with either command:"
echo "   git-commit-analyzer /path/to/repo"
echo "   gca /path/to/repo"
echo ""
echo "📋 Next steps:"
echo "1. Copy .env.example to .env: cp .env.example .env"
echo "2. Add your OpenRouter API key to .env"
echo "3. Run: gca --help for usage information"
echo "4. Test with: gca --synthetic-test"
echo ""
echo "📚 For more information, see README.md"
