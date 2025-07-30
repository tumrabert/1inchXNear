/**
 * Test setup configuration for cross-chain bridge tests
 */

// Global test timeout
jest.setTimeout(30000);

// Mock crypto for Node.js environment
if (typeof globalThis.crypto === 'undefined') {
  const crypto = require('crypto');
  (globalThis as any).crypto = {
    getRandomValues: (arr: any) => crypto.randomFillSync(arr),
    subtle: {},
    randomUUID: () => crypto.randomUUID()
  };
}

// Console suppression for cleaner test output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  // Suppress console.log in tests unless explicitly enabled
  if (process.env.VERBOSE_TESTS !== 'true') {
    console.log = jest.fn();
    console.error = jest.fn();
  }
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// Global test utilities
(global as any).sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

(global as any).mockEthereumAddress = (seed: string) => {
  return `0x${Buffer.from(seed).toString('hex').padEnd(40, '0')}`;
};

(global as any).mockNearAddress = (name: string) => {
  return `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.near`;
};