import js from '@eslint/js'
import astro from 'eslint-plugin-astro'

export default [
  // Base JavaScript rules
  js.configs.recommended,
  
  // Astro configuration
  ...astro.configs.recommended,
  
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        indexedDB: 'readonly',
        fetch: 'readonly',
        performance: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        alert: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        FileReader: 'readonly',
        ResizeObserver: 'readonly',
        MutationObserver: 'readonly',
        Node: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        gc: 'readonly'
      }
    },
    rules: {
      // Code Quality Rules
      'no-console': 'warn', // Flag console statements for production cleanup
      'no-debugger': 'error', // No debugger statements in production
      'no-unused-vars': 'error', // Catch unused variables
      'prefer-const': 'error', // Enforce const for non-reassigned variables
      'no-var': 'error', // No var declarations, use let/const
      
      // Best Practices
      'eqeqeq': ['error', 'always'], // Require === and !==
      'no-eval': 'error', // No eval() usage
      'no-implied-eval': 'error', // No implied eval
      'no-new-func': 'error', // No Function constructor
      'no-alert': 'warn', // Flag alert/confirm/prompt usage
      
      // ES6+ Rules
      'arrow-spacing': 'error', // Consistent arrow function spacing
      'no-duplicate-imports': 'error', // No duplicate module imports
      'prefer-arrow-callback': 'warn', // Prefer arrow functions for callbacks
      'prefer-template': 'warn', // Prefer template literals over concatenation
      
      // Error Prevention
      'no-unreachable': 'error', // No unreachable code
      'no-unreachable-loop': 'error', // No unreachable loop iterations
      'no-useless-catch': 'error', // No useless catch clauses
      'no-useless-return': 'error', // No useless return statements
      
      // Style Consistency
      'semi': ['error', 'always'], // Require semicolons
      'quotes': ['warn', 'single', { 'allowTemplateLiterals': true }], // Prefer single quotes
      'indent': ['warn', 2, { 'SwitchCase': 1 }], // 2-space indentation
      'comma-dangle': ['warn', 'never'], // No trailing commas
      
      // Modern JavaScript
      'no-promise-executor-return': 'error', // No return in Promise executor
      'prefer-promise-reject-errors': 'error', // Consistent Promise rejections
      'no-async-promise-executor': 'error' // No async Promise executors
    }
  },
  
  {
    files: ['**/*.astro'],
    rules: {
      // Astro-specific rules
      'astro/no-conflict-set-directives': 'error',
      'astro/no-unused-define-vars-in-style': 'error'
    }
  },
  
  {
    files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly'
      }
    },
    rules: {
      // Relax some rules for test files
      'no-console': 'off', // Allow console in tests for debugging
      'prefer-arrow-callback': 'off' // Allow function expressions in tests
    }
  },
  
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.astro/**',
      'coverage/**',
      '**/*.min.js',
      'public/**'
    ]
  }
]
