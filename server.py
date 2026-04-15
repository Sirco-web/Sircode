#!/usr/bin/env python3
"""
Sircode Server Launcher
Runs Sircode server in a virtual environment with auto-GPU detection
Automatically detects hardware and installs appropriate CUDA/GPU dependencies
"""

import os
import sys
import subprocess
import json
import platform
import re
from pathlib import Path


# ============================================================================
# GPU Detection & Dependency Management
# ============================================================================

class GPUDetector:
    """Detect GPU hardware and manage dependencies"""
    
    @staticmethod
    def detect_nvidia_cuda():
        """Detect NVIDIA GPU and CUDA version"""
        try:
            result = subprocess.run(['nvidia-smi', '--query-gpu=driver_version'], 
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                driver_version = result.stdout.strip()
                # Get compute capability
                cc_result = subprocess.run(
                    ['nvidia-smi', '--query-gpu=compute_cap'], 
                    capture_output=True, text=True, timeout=5
                )
                compute_cap = cc_result.stdout.strip() if cc_result.returncode == 0 else "unknown"
                return {
                    'type': 'NVIDIA',
                    'available': True,
                    'driver': driver_version,
                    'compute_capability': compute_cap
                }
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass
        return {'type': 'NVIDIA', 'available': False}
    
    @staticmethod
    def detect_amd_rocm():
        """Detect AMD GPU and ROCm"""
        try:
            result = subprocess.run(['rocm-smi'], capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                return {
                    'type': 'AMD',
                    'available': True,
                    'rocm': True
                }
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass
        
        # Check /opt/rocm/ directory
        if Path('/opt/rocm').exists():
            return {'type': 'AMD', 'available': True, 'rocm': True}
        
        return {'type': 'AMD', 'available': False}
    
    @staticmethod
    def detect_apple_metal():
        """Detect Apple GPU (Metal) - macOS only"""
        if platform.system() == 'Darwin':
            # Check for Apple Silicon or Intel Mac with Metal support
            try:
                result = subprocess.run(['sysctl', '-n', 'hw.machine'], 
                                      capture_output=True, text=True, timeout=5)
                machine = result.stdout.strip()
                if 'arm64' in machine or 'apple' in machine.lower():
                    return {'type': 'Apple', 'available': True, 'metal': True}
            except (FileNotFoundError, subprocess.TimeoutExpired):
                pass
        
        return {'type': 'Apple', 'available': False}
    
    @staticmethod
    def detect_all():
        """Detect all available GPUs"""
        gpus = {
            'nvidia': GPUDetector.detect_nvidia_cuda(),
            'amd': GPUDetector.detect_amd_rocm(),
            'apple': GPUDetector.detect_apple_metal()
        }
        
        available = [g for g in gpus.values() if g.get('available')]
        return {
            'available_gpus': available,
            'detected': gpus,
            'primary': available[0] if available else None
        }
    
    @staticmethod
    def get_env_vars(gpu_info):
        """Get environment variables to set based on GPU type"""
        env = {}
        
        if not gpu_info.get('primary'):
            return env
        
        gpu_type = gpu_info['primary'].get('type')
        
        if gpu_type == 'NVIDIA':
            # NVIDIA CUDA environment
            env['CUDA_VISIBLE_DEVICES'] = '0'
            env['OLLAMA_CUDA'] = '1'
            env['OLLAMA_GPU_DEVICE'] = '0'
        elif gpu_type == 'AMD':
            # AMD ROCm environment
            env['ROCM_HOME'] = '/opt/rocm'
            env['LD_LIBRARY_PATH'] = '/opt/rocm/lib:' + env.get('LD_LIBRARY_PATH', '')
            env['HSA_OVERRIDE_GFX_VERSION'] = '1'
        elif gpu_type == 'Apple':
            # Apple Metal - Ollama handles automatically
            pass
        
        return env


def install_gpu_dependencies():
    """Install CUDA/GPU dependencies based on detected hardware"""
    system = platform.system()
    gpu_info = GPUDetector.detect_all()
    
    print("🔍 Detecting GPU hardware...")
    
    if gpu_info['primary']:
        gpu_type = gpu_info['primary'].get('type')
        print(f"✅ Detected: {gpu_type} GPU")
        
        if gpu_type == 'NVIDIA':
            driver = gpu_info['primary'].get('driver', 'unknown')
            print(f"   Driver: {driver}")
            print(f"   Compute Capability: {gpu_info['primary'].get('compute_capability', 'unknown')}")
            
            if system == 'Linux':
                print("\n📦 Installing NVIDIA CUDA support...")
                # Ubuntu/Debian
                subprocess.run(['apt-get', 'update'], capture_output=True)
                subprocess.run(['apt-get', 'install', '-y', 'nvidia-cuda-toolkit', 'nvidia-compute-utils'], 
                             capture_output=True)
                print("✅ CUDA support installed")
            elif system == 'Windows':
                print("\n⚠️  CUDA on Windows uses NVIDIA driver")
                print("   Ensure NVIDIA driver is updated from: https://nvidia.com/Download/driverDetails.aspx")
            elif system == 'Darwin':
                print("\n⚠️  macOS uses Metal GPU support (built-in)")
        
        elif gpu_type == 'AMD':
            if system == 'Linux':
                print("\n📦 Installing AMD ROCm support...")
                print("   ROCm requires manual installation from: https://rocmdocs.amd.com/")
                print("   Quick: wget -qO- http://repo.radeon.com/rocm/rocm.gpg.key | apt-key add -")
            else:
                print(f"\n⚠️  ROCm only supported on Linux (detected: {system})")
        
        elif gpu_type == 'Apple':
            print("✅ Metal GPU support (built-in to macOS)")
    else:
        print("⚠️  No GPU detected - will use CPU")
        print("   For NVIDIA: Install CUDA from https://developer.nvidia.com/cuda-downloads")
        print("   For AMD: Install ROCm from https://rocmdocs.amd.com/")
        print("   For Apple: Update to latest macOS for Metal support")
    
    return gpu_info


def get_venv_path():
    """Get the virtual environment path"""
    return Path.home() / '.sircode' / 'venv'


def get_node_path():
    """Get Node executable path"""
    return Path.home() / '.sircode' / 'node'


def check_node():
    """Check if Node.js is installed"""
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        return result.returncode == 0
    except FileNotFoundError:
        return False


def check_npm():
    """Check if npm is installed"""
    try:
        result = subprocess.run(['npm', '--version'], capture_output=True, text=True)
        return result.returncode == 0
    except FileNotFoundError:
        return False


def ensure_dependencies():
    """Ensure Node.js and npm are available"""
    if not check_node():
        print("❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/")
        sys.exit(1)
    
    if not check_npm():
        print("❌ npm is not installed. Please install npm with Node.js.")
        sys.exit(1)
    
    print("✅ Node.js and npm found")


def setup_sircode():
    """Setup Sircode in ~/.sircode/"""
    sircode_dir = Path.home() / '.sircode'
    sircode_dir.mkdir(exist_ok=True, parents=True)
    
    # Copy build files if this is a fresh install
    sircode_repo = Path(__file__).parent
    if (sircode_repo / 'dist').exists():
        print("📦 Setting up Sircode...")
        subprocess.run(['npm', 'install'], cwd=sircode_repo, check=False)
        subprocess.run(['npm', 'run', 'build'], cwd=sircode_repo, check=False)


def start_server(port=8093, host='0.0.0.0', verbose=False):
    """Start the Sircode server"""
    sircode_repo = Path(__file__).parent
    
    # Install GPU dependencies first
    gpu_info = install_gpu_dependencies()
    
    # Set GPU environment variables
    env_vars = GPUDetector.get_env_vars(gpu_info)
    env = os.environ.copy()
    env.update(env_vars)
    
    # Build the command
    cmd = [
        'node',
        str(sircode_repo / 'dist' / 'cli.js'),
        'server',
        '--port', str(port),
        '--host', host,
    ]
    
    if verbose:
        cmd.append('--verbose')
    
    gpu_desc = gpu_info['primary'].get('type', 'CPU') if gpu_info['primary'] else 'CPU'
    print(f"\n🚀 Starting Sircode Server on {host}:{port}")
    print(f"🧠 GPU: {gpu_desc}")
    print(f"📡 Network access: http://{host}:{port}\n")
    
    try:
        subprocess.run(cmd, env=env, check=True)
    except KeyboardInterrupt:
        print("\n⏹️  Server stopped")
    except subprocess.CalledProcessError as e:
        print(f"❌ Server error: {e}")
        sys.exit(1)


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Sircode Server Launcher')
    parser.add_argument('--port', type=int, default=8093, help='Server port (default: 8093)')
    parser.add_argument('--host', default='0.0.0.0', help='Server host (default: 0.0.0.0)')
    parser.add_argument('-v', '--verbose', action='store_true', help='Verbose output')
    
    args = parser.parse_args()
    
    # Check platform
    system = platform.system()
    print(f"🖥️  Platform: {system} ({platform.machine()})\n")
    
    # Ensure dependencies
    ensure_dependencies()
    
    # Setup Sircode
    setup_sircode()
    
    # Start server
    start_server(port=args.port, host=args.host, verbose=args.verbose)


if __name__ == '__main__':
    main()
