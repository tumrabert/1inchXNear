import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// Mock window.ethereum for testing
global.window = {
  ...global.window,
  ethereum: {
    request: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
  },
}

// Mock crypto.getRandomValues for testing
global.crypto = {
  ...global.crypto,
  getRandomValues: jest.fn((arr) => {
    // Fill with mock random values
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256)
    }
    return arr
  }),
}

// Add TextEncoder/TextDecoder for Node.js environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock