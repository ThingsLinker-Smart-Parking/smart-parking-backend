#!/bin/bash

echo "🚗 Smart Parking Backend Setup Script"
echo "====================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if PostgreSQL is running
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL client not found. Please install PostgreSQL first."
    echo "   On macOS: brew install postgresql"
    echo "   On Ubuntu: sudo apt-get install postgresql-client"
    echo ""
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    if [ -f env.example ]; then
        cp env.example .env
        echo "✅ .env file created. Please update it with your configuration."
        echo "   Important: Set your JWT_SECRET and database credentials!"
        echo ""
    else
        echo "❌ env.example not found. Please create .env file manually."
        exit 1
    fi
else
    echo "✅ .env file found"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Check if database is accessible
echo "🗄️  Checking database connection..."
if command -v psql &> /dev/null; then
    # Try to connect to database (this will fail if not configured, but that's okay)
    echo "   Note: Database connection will be tested when server starts"
else
    echo "   Note: PostgreSQL client not available - database connection will be tested when server starts"
fi

echo ""
echo "🎯 Setup Complete! Next steps:"
echo "1. Update your .env file with database credentials and JWT secret"
echo "2. Start PostgreSQL service"
echo "3. Run: npm run dev"
echo "4. Open: http://localhost:3000/api-docs"
echo ""
echo "🧪 To test the authentication system:"
echo "1. Start the server: npm run dev"
echo "2. Run tests: node test-auth.js"
echo "3. Check server console for OTP codes during testing"
echo ""
echo "📚 For more information, see README.md"
echo ""
echo "🚀 Happy coding!"
