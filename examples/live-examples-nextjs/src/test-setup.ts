// Test setup for Vitest
import { vi } from 'vitest'

// Mock fetch for network tests
global.fetch = vi.fn()

// Mock performance API
global.performance = {
  now: vi.fn(() => Date.now()),
} as any

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}
