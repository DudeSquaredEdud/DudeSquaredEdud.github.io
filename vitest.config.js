import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Use jsdom environment for DOM testing
    environment: 'jsdom',
    
    // Setup file to run before tests
    setupFiles: ['./tests/setup.js'],
    
    // Include patterns for test files
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}'],
    
    // Coverage configuration
    coverage: {
      reporter: ['text', 'html', 'json'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        '.astro/',
        'coverage/',
        '**/*.config.{js,ts,mjs}'
      ]
    },
    
    // Global test configuration
    globals: true,
    
    // Test timeout (useful for async operations like IndexedDB)
    testTimeout: 10000,
    
    // Mock IndexedDB and other browser APIs
    pool: 'forks'
  },
  
  // Resolve configuration for proper module imports
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
      '@lib': new URL('./src/lib', import.meta.url).pathname,
      '@utils': new URL('./src/lib/equation-builder/utils', import.meta.url).pathname
    }
  }
})
