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
echo "✅ TypeScript build complete!"
echo ""

# Run global installation
echo "🌍 Setting up global command..."
SIRCODE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_DIR="$HOME/.local/bin"
mkdir -p "$BIN_DIR"

echo "🔗 Creating sircode command in $BIN_DIR..."
cat > "$BIN_DIR/sircode" << 'EOF'
#!/bin/bash
# Get the directory where sircode is installed
SIRCODE_DIR="$(dirname "$(readlink -f "$0")")/.."

# Check if the command is a subcommand that needs special handling
if [ "$1" = "server" ]; then
    # For server command, use Python launcher
    exec python3 "$SIRCODE_DIR/server.py" "${@:2}"
elif [ "$1" = "chat" ] && [[ "$*" == *"--server"* ]]; then
    # Chat with --server flag - pass through to Node
    exec node "$SIRCODE_DIR/dist/cli.js" "$@"
else
    # Default: use Node CLI
    exec node "$SIRCODE_DIR/dist/cli.js" "$@"
fi
EOF
chmod +x "$BIN_DIR/sircode"

# Check if ~/.local/bin is in PATH
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
  echo ""
  echo "⚠️  Add to your shell profile (~/.bashrc, ~/.zshrc, ~/.bash_profile):"
  echo "   export PATH=\"\$HOME/.local/bin:\$PATH\""
  echo ""
  echo "Then reload: source ~/.bashrc"
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "📝 Quick start:"
echo "   sircode chat                    # Interactive chat"
echo "   sircode chat mistral            # Use specific model"
echo "   sircode server                  # Start server (port 8093)"
echo "   sircode agent                   # Autonomous agent mode"
echo "   sircode models                  # List available models"
echo ""
