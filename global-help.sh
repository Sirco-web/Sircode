#!/bin/bash
set -e

echo "🚀 Sircode Global Installer for Ubuntu Desktop"
echo ""

# Detect if running as root or normal user
if [ "$EUID" -eq 0 ]; then
    BIN_DIR="/usr/local/bin"
    IS_ROOT=true
else
    BIN_DIR="$HOME/.local/bin"
    IS_ROOT=false
fi

echo "📦 Installing dependencies..."

# Install Node.js if needed
if ! command -v node &> /dev/null; then
    echo "   Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - > /dev/null 2>&1
    sudo apt-get install -y nodejs > /dev/null 2>&1
fi
echo "   ✓ Node.js $(node --version)"

# Install Ollama if needed
if ! command -v ollama &> /dev/null; then
    echo "   Installing Ollama..."
    curl -fsSL https://ollama.ai/install.sh | sh > /dev/null 2>&1
fi
echo "   ✓ Ollama $(ollama --version 2>/dev/null || echo 'installed')"

# Find Sircode directory
SIRCODE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Build if needed
if [ ! -d "$SIRCODE_DIR/dist" ]; then
    echo "   Building Sircode..."
    cd "$SIRCODE_DIR"
    npm install > /dev/null 2>&1
    npm run build > /dev/null 2>&1
fi
echo "   ✓ Sircode built"

# Create wrapper script
mkdir -p "$BIN_DIR"
echo "   Creating sircode command..."

cat > "$BIN_DIR/sircode" << 'WRAPPER'
#!/bin/bash
SIRCODE_DIR="__SIRCODE_DIR__"

if [ "$1" = "server" ]; then
    exec python3 "$SIRCODE_DIR/server.py" "${@:2}"
else
    exec node "$SIRCODE_DIR/dist/cli.js" "$@"
fi
WRAPPER

# Replace placeholder with actual path
sed -i "s|__SIRCODE_DIR__|$SIRCODE_DIR|g" "$BIN_DIR/sircode"
chmod +x "$BIN_DIR/sircode"

echo ""
echo "✅ Installation complete!"
echo ""

# Verify it works
if "$BIN_DIR/sircode" --version &> /dev/null 2>&1; then
    echo "✓ sircode command ready"
else
    echo "⚠️  Run this to use sircode from any terminal:"
    echo "   source ~/.bashrc"
fi

echo ""
echo "📝 Usage:"
echo "   sircode chat                    # Interactive chat"
echo "   sircode server                  # Start server (port 8093)"
echo "   sircode chat --server 192.168.x # Connect to remote server"
echo ""
echo "🚀 To start server now:"
echo "   sircode server"
echo ""
