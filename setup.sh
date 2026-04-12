#!/bin/bash

# Sircode development helper script

set -e

echo "🚀 Sircode Development Setup"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js v18 or higher."
    echo "   https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js found: $(node --version)"

# Check Ollama
if ! command -v ollama &> /dev/null; then
    echo "⚠️  Ollama not found. Please install Ollama."
    echo "   https://ollama.ai"
    echo ""
    echo "After installing Ollama, run: ollama pull mistral"
    exit 1
fi

echo "✓ Ollama found"

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null; then
    echo ""
    echo "⚠️  Ollama is not running."
    echo "   Start Ollama in another terminal with: ollama serve"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "✓ Ollama is running"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Installing dependencies..."
    npm install
fi

echo ""
echo "✓ All checks passed!"
echo ""
echo "🎉 Ready to go! Run:"
echo "   npm run dev chat"
echo ""
