// Test setup file - runs before all tests
import { beforeAll, beforeEach, afterEach, vi } from 'vitest'

// Mock IndexedDB for testing
beforeAll(() => {
  // Mock IndexedDB if not available (common in test environments)
  if (!global.indexedDB) {
    const FDBFactory = require('fake-indexeddb/lib/FDBFactory')
    const FDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange')
    
    global.indexedDB = new FDBFactory()
    global.IDBKeyRange = FDBKeyRange
  }
  
  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  }
  global.localStorage = localStorageMock
  
  // Mock console methods to reduce test noise
  global.console = {
    ...console,
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: console.error // Keep error for debugging failed tests
  }
  
  // Mock notification system for testing
  global.mockNotificationSystem = {
    show: vi.fn(),
    hide: vi.fn(),
    clear: vi.fn()
  }
})

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  vi.clearAllMocks()
  
  // Clear localStorage
  if (global.localStorage) {
    global.localStorage.clear()
  }
  
  // Clear any pending timers
  vi.clearAllTimers()
})

// Setup DOM testing utilities
beforeEach(() => {
  // Reset DOM to clean state for each test
  document.body.innerHTML = ''
  document.head.innerHTML = ''
})
