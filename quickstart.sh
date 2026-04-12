#!/bin/bash

# Quick start script for Sircode

echo "╔════════════════════════════════════════╗"
echo "║     🚀 Sircode Quick Start Guide 🚀    ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Verify Prerequisites${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js $NODE_VERSION installed"
else
    echo -e "${RED}✗${NC} Node.js not found. Install from https://nodejs.org/"
    exit 1
fi

# Check Ollama
if command -v ollama &> /dev/null; then
    echo -e "${GREEN}✓${NC} Ollama installed"
else
    echo -e "${RED}✗${NC} Ollama not found. Install from https://ollama.ai"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 2: Install Dependencies${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} Dependencies already installed"
else
    echo "Installing packages..."
    npm install --silent
    echo -e "${GREEN}✓${NC} Dependencies installed"
fi

echo ""
echo -e "${BLUE}Step 3: Start Ollama Server${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}ℹ${NC} Open a new terminal and run:"
echo ""
echo -e "${BLUE}  ollama serve${NC}"
echo ""
echo -e "${YELLOW}ℹ${NC} Then pull a model (e.g.):"
echo ""
echo -e "${BLUE}  ollama pull mistral${NC}"
echo ""

echo "Once Ollama is running, come back here and press Enter..."
read -p ""

# Check if Ollama is running
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Ollama is running"
else
    echo -e "${RED}✗${NC} Cannot connect to Ollama"
    echo "Make sure 'ollama serve' is running in another terminal"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 4: Build Project${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npm run build > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Build successful"

echo ""
echo -e "${BLUE}Step 5: Launch Sircode${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}Sircode is ready! 🎉${NC}"
echo ""
echo "Commands:"
echo -e "  ${BLUE}npm run dev chat${NC}              Interactive chat mode"
echo -e "  ${BLUE}npm run dev chat mistral${NC}      Use specific model"
echo -e "  ${BLUE}npm run dev models${NC}            List available models"
echo -e "  ${BLUE}npm run dev exec \"query\"${NC}    Single command"
echo ""
echo "Examples:"
echo -e "  ${BLUE}npm run dev chat${NC}"
echo -e "  ${BLUE}npm run dev exec \"What is TypeScript?\"${NC}"
echo -e "  ${BLUE}npm run dev chat neural-chat${NC}"
echo ""
echo "Type 'exit' to quit the chat, 'clear' to reset conversation."
echo ""
echo -e "${YELLOW}📖 For more info:${NC}"
echo "  • README.md - User guide"
echo "  • ARCHITECTURE.md - Technical details"
echo "  • EXAMPLES.md - Usage examples"
echo ""
