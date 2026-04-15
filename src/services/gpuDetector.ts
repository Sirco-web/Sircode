/**
 * GPU Detector Service
 * Detects available GPUs and CUDA versions
 * Works across Windows, macOS, Linux with NVIDIA/AMD support
 */

import { execSync } from 'child_process'
import * as os from 'os'

export interface GPUInfo {
  type: 'cuda' | 'rocm' | 'cpu' | 'metal' // Metal for Apple
  available: boolean
  version?: string
  devices?: string[]
  error?: string
}

export class GPUDetector {
  private static cache: GPUInfo | null = null

  /**
   * Detect available GPU and CUDA info
   */
  static detect(): GPUInfo {
    // Return cached result
    if (this.cache) return this.cache

    const platform = os.platform()
    let gpu: GPUInfo

    // Try CUDA first (NVIDIA)
    try {
      gpu = this.detectCUDA()
      if (gpu.available) {
        this.cache = gpu
        return gpu
      }
    } catch (e) {
      // CUDA not available
    }

    // Try ROCm (AMD)
    try {
      gpu = this.detectROCm()
      if (gpu.available) {
        this.cache = gpu
        return gpu
      }
    } catch (e) {
      // ROCm not available
    }

    // Try Metal (Apple)
    if (platform === 'darwin') {
      try {
        gpu = this.detectMetal()
        if (gpu.available) {
          this.cache = gpu
          return gpu
        }
      } catch (e) {
        // Metal not available
      }
    }

    // Fall back to CPU
    this.cache = { type: 'cpu', available: true, version: 'CPU-only mode' }
    return this.cache
  }

  /**
   * Detect NVIDIA CUDA
   */
  private static detectCUDA(): GPUInfo {
    try {
      const output = execSync('nvidia-smi --query-gpu=name,driver_version --format=csv,noheader', {
        encoding: 'utf8',
        timeout: 5000,
      }).trim()

      if (!output) {
        return { type: 'cuda', available: false }
      }

      const [name, driver] = output.split(',').map((s) => s.trim())

      // Try to get CUDA version
      let cudaVersion = 'unknown'
      try {
        const versionOutput = execSync('nvidia-smi --query-gpu=compute_cap --format=csv,noheader', {
          encoding: 'utf8',
          timeout: 5000,
        }).trim()
        cudaVersion = versionOutput
      } catch (e) {
        // Ignore version detection failure
      }

      // Get device count
      let devices: string[] = []
      try {
        const deviceOutput = execSync('nvidia-smi --list-gpus', {
          encoding: 'utf8',
          timeout: 5000,
        }).trim()
        devices = deviceOutput.split('\n')
      } catch (e) {
        devices = [name]
      }

      return {
        type: 'cuda',
        available: true,
        version: `Driver: ${driver}, Compute: ${cudaVersion}`,
        devices,
      }
    } catch (e) {
      return { type: 'cuda', available: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  /**
   * Detect AMD ROCm
   */
  private static detectROCm(): GPUInfo {
    try {
      const output = execSync('rocm-smi --showproductname --showdriverver', {
        encoding: 'utf8',
        timeout: 5000,
      }).trim()

      if (!output) {
        return { type: 'rocm', available: false }
      }

      // Get device count
      let devices: string[] = []
      try {
        const deviceOutput = execSync('rocm-smi --showid', {
          encoding: 'utf8',
          timeout: 5000,
        }).trim()
        devices = deviceOutput
          .split('\n')
          .filter((line) => line.includes('GPU'))
          .slice(0, -1) // Remove summary line
      } catch (e) {
        devices = ['AMD GPU']
      }

      return {
        type: 'rocm',
        available: true,
        version: 'AMD ROCm',
        devices,
      }
    } catch (e) {
      return { type: 'rocm', available: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  /**
   * Detect Apple Metal
   */
  private static detectMetal(): GPUInfo {
    try {
      const output = execSync("system_profiler SPDisplaysDataType | grep 'Chipset Model'", {
        encoding: 'utf8',
        timeout: 5000,
      }).trim()

      if (!output) {
        return { type: 'metal', available: false }
      }

      // Try to get GPU name
      let gpuName = 'Apple GPU'
      try {
        const nameOutput = execSync("system_profiler SPDisplaysDataType | grep 'Model Identifier' | head -1", {
          encoding: 'utf8',
          timeout: 5000,
        }).trim()
        if (nameOutput) {
          gpuName = nameOutput.split(':')[1]?.trim() || gpuName
        }
      } catch (e) {
        // Ignore name detection failure
      }

      return {
        type: 'metal',
        available: true,
        version: 'Apple Metal',
        devices: [gpuName],
      }
    } catch (e) {
      return { type: 'metal', available: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  /**
   * Get Ollama environment variables for detected GPU
   */
  static getOllamaEnv(): Record<string, string> {
    const gpu = this.detect()
    const env: Record<string, string> = {}

    switch (gpu.type) {
      case 'cuda':
        env.CUDA_VISIBLE_DEVICES = '0' // Use first GPU
        break
      case 'rocm':
        env.HSA_OVERRIDE_GFX_VERSION = '0' // Auto-detect
        env.ROCR_VISIBLE_DEVICES = '0'
        break
      case 'metal':
        // Metal is automatically used on macOS
        break
      case 'cpu':
        // Disable GPU explicitly
        env.GPU_DEVICE_ORDINAL = 'CPU'
        break
    }

    return env
  }

  /**
   * Format GPU info for display
   */
  static format(gpu: GPUInfo = this.detect()): string {
    if (!gpu.available) {
      return `GPU: ${gpu.type.toUpperCase()} (not available)`
    }

    let result = `GPU: ${gpu.type.toUpperCase()}`

    if (gpu.version) {
      result += ` - ${gpu.version}`
    }

    if (gpu.devices && gpu.devices.length > 0) {
      result += `\n  Devices: ${gpu.devices.join(', ')}`
    }

    return result
  }
}
