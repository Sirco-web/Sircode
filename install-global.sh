#!/bin/bash
set -e

echo "🌍 Installing Sircode globally..."
echo ""

# Get the directory where this script is located
SIRCODE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if Sircode is built
if [ ! -d "$SIRCODE_DIR/dist" ]; then
  echo "❌ Sircode not built. Please run: bash install.sh"
  exit 1
fi

# Option 1: User bin directory (preferred, no sudo needed)
BIN_DIR="$HOME/.local/bin"
mkdir -p "$BIN_DIR"

echo "🔗 Creating sircode command in $BIN_DIR..."
cat > "$BIN_DIR/sircode" << 'EOF'
#!/bin/bash
# Get the directory where sircode is installed
SIRCODE_DIR="$(dirname "$(readlink -f "$0")")"

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

# Option 2: System-wide (optional, requires sudo)
echo ""
echo "📝 For system-wide installation, run:"
echo "   sudo ln -sf $SIRCODE_DIR/dist/cli.js /usr/local/bin/sircode"
echo ""

echo "✅ Global installation complete!"
echo ""
echo "📝 Usage:"
echo "   sircode chat                    # Interactive chat"
echo "   sircode chat qwen2.5-coder:3b   # Use specific model"
echo "   sircode models                  # List available models"
echo "   sircode exec \"query\"            # Single query"
echo ""
echo ""
echo "Usage:"
echo "  sircode chat                         # Start interactive chat"
echo "  sircode chat mistral                 # Use specific model"
echo "  sircode models                       # List models"
echo "  sircode exec 'Your question'         # Single query"
echo ""
echo "Run from anywhere:"
echo "  cd ~/projects/my-app"
echo "  sircode chat                         # AI generates code here"
echo ""
