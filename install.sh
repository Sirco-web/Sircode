#!/bin/bash
set -e

echo "🚀 Installing Sircode..."
echo ""

# Detect OS
OS="unknown"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  OS="linux"
  if [ -f /etc/debian_version ]; then
    DISTRO="debian"
  elif [ -f /etc/redhat-release ]; then
    DISTRO="redhat"
  fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
  OS="macos"
fi

# Install Node.js if needed
if ! command -v node &> /dev/null; then
  echo "📦 Installing Node.js..."
  if [ "$OS" = "linux" ] && [ "$DISTRO" = "debian" ]; then
    sudo apt-get update && sudo apt-get install -y nodejs npm
  elif [ "$OS" = "linux" ] && [ "$DISTRO" = "redhat" ]; then
    sudo dnf install -y nodejs npm
  elif [ "$OS" = "macos" ]; then
    if ! command -v brew &> /dev/null; then
      echo "❌ Homebrew not found. Please install from https://brew.sh"
      exit 1
    fi
    brew install node
  else
    echo "❌ Please install Node.js v18+ from https://nodejs.org/"
    exit 1
  fi
else
  echo "✓ Node.js $(node --version) already installed"
fi

# Install npm if needed
if ! command -v npm &> /dev/null; then
  echo "📦 Installing npm..."
  if [ "$OS" = "linux" ] && [ "$DISTRO" = "debian" ]; then
    sudo apt-get install -y npm
  elif [ "$OS" = "linux" ] && [ "$DISTRO" = "redhat" ]; then
    sudo dnf install -y npm
  elif [ "$OS" = "macos" ]; then
    brew install npm
  fi
else
  echo "✓ npm $(npm --version) already installed"
fi

# Install Ollama if needed
if ! command -v ollama &> /dev/null; then
  echo "📦 Installing Ollama..."
  if [ "$OS" = "linux" ]; then
    curl -fsSL https://ollama.ai/install.sh | sh
  elif [ "$OS" = "macos" ]; then
    if ! command -v brew &> /dev/null; then
      echo "❌ Homebrew not found. Please install from https://brew.sh"
      exit 1
    fi
    brew install ollama
  else
    echo "❌ Please install Ollama from https://ollama.ai"
    exit 1
  fi
else
  echo "✓ Ollama already installed"
fi

# Setup Sircode
INSTALL_DIR="${SIRCODE_INSTALL_DIR:=$HOME/.local/share/sircode}"

# Create directories
mkdir -p "$INSTALL_DIR"

# Clone or update repository
if [ -d "$INSTALL_DIR/.git" ]; then
  echo "📦 Updating Sircode..."
  cd "$INSTALL_DIR"
  git pull origin main
else
  echo "📦 Cloning Sircode from GitHub..."
  git clone https://github.com/Sirco-web/Sircode.git "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

# Install dependencies
echo "📚 Installing TypeScript dependencies..."
if command -v bun &> /dev/null; then
  bun install
else
  npm install
fi

# Build TypeScript
echo "🔨 Building Sircode..."
npm run build

echo ""
echo "✅ Installation complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Start Ollama in a terminal:  ollama serve"
echo "   2. Pull a model (optional):    ollama pull mistral"
echo "   3. Run setup for global cmd:   bash ./install-global.sh"
echo ""
