#!/usr/bin/env python3
"""
Sircode: Ollama CLI coding assistant
Usage: python code.py chat [--model MODEL] [--url URL]
       python code.py models [--url URL]
       python code.py exec QUERY [--model MODEL] [--url URL]
       python code.py setup
       python code.py config [--model MODEL] [--url URL]
"""

import subprocess
import sys
import argparse
import json
import os
import requests
from pathlib import Path
from typing import Optional, Dict, List

class Config:
    """Manage Sircode config"""
    def __init__(self):
        self.dir = Path.home() / '.sircode'
        self.file = self.dir / 'config.json'
        self.dir.mkdir(exist_ok=True)
        
    def load(self) -> Dict:
        """Load config"""
        if self.file.exists():
            try:
                return json.loads(self.file.read_text())
            except:
                return {'model': 'mistral', 'url': 'http://localhost:11434'}
        return {'model': 'mistral', 'url': 'http://localhost:11434'}
    
    def save(self, cfg: Dict):
        """Save config"""
        self.file.write_text(json.dumps(cfg, indent=2))
    
    def get(self, key: str, default: str = None) -> str:
        """Get config value"""
        cfg = self.load()
        return cfg.get(key, default)
    
    def set(self, key: str, val: str):
        """Set config value"""
        cfg = self.load()
        cfg[key] = val
        self.save(cfg)
        print(f"✓ Set {key} = {val}")

class OllamaAPI:
    """Interact with Ollama API"""
    def __init__(self, url: str):
        self.url = url
        self.timeout = 5
    
    def check(self) -> bool:
        """Check if Ollama is running"""
        try:
            req = requests.get(f"{self.url}/api/tags", timeout=self.timeout)
            return req.status_code == 200
        except:
            return False
    
    def ls_models(self) -> List[str]:
        """List available models"""
        try:
            req = requests.get(f"{self.url}/api/tags", timeout=self.timeout)
            if req.status_code == 200:
                data = req.json()
                return [m['name'].split(':')[0] for m in data.get('models', [])]
        except:
            pass
        return []
    
    def pull(self, model: str) -> bool:
        """Pull a model"""
        print(f"📦 Pulling {model}...")
        try:
            res = subprocess.run(['ollama', 'pull', model], capture_output=True, timeout=300)
            return res.returncode == 0
        except:
            return False

class Sircode:
    def __init__(self):
        self.root = Path(__file__).parent
        self.cfg = Config()
        self.api = OllamaAPI(self.cfg.get('url', 'http://localhost:11434'))
        
    def run(self, cmd, model=None, url=None, query=None):
        """Run sircode CLI command"""
        args = ['npm', 'run', 'dev', cmd]
        
        if model:
            args.append(model)
        
        opts = []
        if url:
            opts.extend(['-u', url])
        if query:
            args.append(query)
        
        if opts:
            args.extend(opts)
        
        try:
            result = subprocess.run(args, cwd=self.root, capture_output=False, text=True)
            return result.returncode
        except Exception as e:
            print(f"✗ Error: {e}", file=sys.stderr)
            return 1
    
    def setup(self):
        """First-time setup"""
        print("🚀 Sircode Setup\n")
        
        # Check Ollama
        url = input("Ollama URL [http://localhost:11434]: ").strip() or 'http://localhost:11434'
        api = OllamaAPI(url)
        
        if not api.check():
            print(f"✗ Cannot connect to Ollama at {url}")
            print("  Start Ollama with: ollama serve")
            return 1
        
        print("✓ Connected to Ollama\n")
        self.cfg.set('url', url)
        
        # Get models
        models = api.ls_models()
        
        if not models:
            print("No models found in Ollama")
            print("\nPopular models to download:")
            defaults = [
                ('mistral', 'Fast & capable (~5GB)'),
                ('neural-chat', 'Conversation optimized (~4GB)'),
                ('codellama', 'Code generation (~8GB)'),
                ('dolphin-mixtral', 'Very capable (~45GB)'),
            ]
            for name, desc in defaults:
                print(f"  • {name:20} - {desc}")
            
            ch = input("\nDownload model [mistral]: ").strip() or 'mistral'
            if api.pull(ch):
                print(f"✓ {ch} ready!")
                self.cfg.set('model', ch)
            else:
                print(f"✗ Failed to pull {ch}")
                return 1
        else:
            print(f"Found {len(models)} model(s):")
            for i, m in enumerate(models):
                mark = " ←" if i == 0 else ""
                print(f"  {i+1}. {m}{mark}")
            
            ch = input(f"\nDefault model [1]: ").strip() or '1'
            try:
                idx = int(ch) - 1
                if 0 <= idx < len(models):
                    self.cfg.set('model', models[idx])
                    print(f"✓ Default: {models[idx]}")
            except:
                print("Invalid choice")
                return 1
        
        print("\n✅ Setup complete!")
        print(f"   Model: {self.cfg.get('model')}")
        print(f"   URL: {self.cfg.get('url')}")
        return 0

def main():
    parser = argparse.ArgumentParser(
        description='Sircode: Ollama-powered CLI coding assistant',
        prog='code.py'
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Command')
    
    # Chat command
    chat = subparsers.add_parser('chat', help='Interactive chat')
    chat.add_argument('model', nargs='?', help='Model (default: from config)')
    chat.add_argument('-u', '--url', help='Ollama API URL')
    
    # Models command
    models_cmd = subparsers.add_parser('models', help='List available models')
    models_cmd.add_argument('-u', '--url', help='Ollama API URL')
    
    # Exec command
    exec_cmd = subparsers.add_parser('exec', help='Execute single query')
    exec_cmd.add_argument('query', help='Query to execute')
    exec_cmd.add_argument('-m', '--model', help='Model (default: from config)')
    exec_cmd.add_argument('-u', '--url', help='Ollama API URL')
    
    # Setup command
    setup_cmd = subparsers.add_parser('setup', help='First-time setup')
    
    # Config command
    config_cmd = subparsers.add_parser('config', help='Manage config')
    config_cmd.add_argument('-m', '--model', help='Set default model')
    config_cmd.add_argument('-u', '--url', help='Set Ollama URL')
    config_cmd.add_argument('-s', '--show', action='store_true', help='Show current config')
    
    # Help
    help_cmd = subparsers.add_parser('help', help='Show help')
    
    args = parser.parse_args()
    
    if not args.command or args.command == 'help':
        parser.print_help()
        print("\nExample:")
        print("  python code.py setup          # First-time setup")
        print("  python code.py chat           # Chat with default model")
        print("  python code.py chat mistral   # Chat with specific model")
        print("  python code.py models         # List models")
        print("  python code.py config -s      # Show config")
        return 0
    
    s = Sircode()
    cfg = s.cfg.load()
    
    if args.command == 'setup':
        return s.setup()
    
    elif args.command == 'config':
        if args.show:
            print(json.dumps(cfg, indent=2))
        if args.model:
            s.cfg.set('model', args.model)
        if args.url:
            s.cfg.set('url', args.url)
        return 0
    
    # Use config defaults if not provided
    model = args.model or (getattr(args, 'model', None)) or cfg.get('model', 'mistral')
    url = args.url or (getattr(args, 'url', None)) or cfg.get('url', 'http://localhost:11434')
    query = getattr(args, 'query', None)
    
    if args.command == 'chat':
        model = args.model or cfg.get('model', 'mistral')
        url = args.url or cfg.get('url', 'http://localhost:11434')
        return s.run('chat', model=model, url=url)
    elif args.command == 'models':
        url = args.url or cfg.get('url', 'http://localhost:11434')
        return s.run('models', url=url)
    elif args.command == 'exec':
        model = args.model or cfg.get('model', 'mistral')
        url = args.url or cfg.get('url', 'http://localhost:11434')
        return s.run('exec', model=model, url=url, query=args.query)
    
    return 0

if __name__ == '__main__':
    sys.exit(main())
