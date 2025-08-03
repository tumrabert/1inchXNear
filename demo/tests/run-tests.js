#!/usr/bin/env node

/**
 * 🚀 TEST RUNNER FOR YOUR SPECIFIED AMOUNTS
 * 
 * Runs real money tests with your requested amounts:
 * - ETH → NEAR: 0.00001 ETH
 * - NEAR → ETH: 0.01 NEAR
 */

const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config();

class RealMoneyTestRunner {
  constructor() {
    this.testFiles = [
      'trustless-bridge.test.js',
      'real-money-swaps.test.js'
    ];
    this.results = [];
  }

  async runTest(testFile) {
    console.log(`\n🧪 Running ${testFile}...`);
    console.log('='.repeat(60));
    
    return new Promise((resolve) => {
      const testPath = path.join(__dirname, testFile);
      const testProcess = spawn('node', [testPath], {
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'test' }
      });

      const startTime = Date.now();

      testProcess.on('close', (code) => {
        const duration = Date.now() - startTime;
        const result = {
          testFile,
          exitCode: code,
          duration,
          success: code === 0,
          status: code === 0 ? 'PASSED' : 'FAILED'
        };

        this.results.push(result);
        console.log(`\n${result.status}: ${testFile} (${duration}ms)`);
        resolve(result);
      });
    });
  }

  async runAllTests() {
    console.log('💰 === YOUR REAL MONEY TEST SUITE ===');
    console.log('Testing your specified amounts:');
    console.log('  ETH → NEAR: 0.00001 ETH');
    console.log('  NEAR → ETH: 0.01 NEAR');
    console.log('');

    // Verify environment
    this.verifyEnvironment();

    // Run tests
    for (const testFile of this.testFiles) {
      await this.runTest(testFile);
    }

    // Generate report
    this.generateReport();
  }

  verifyEnvironment() {
    console.log('🔧 Verifying test environment...');
    
    const requiredVars = [
      'SEPOLIA_RPC_URL',
      'ETH_USER_PRIVATE_KEY',
      'ETH_RESOLVER_PRIVATE_KEY',
      'ETH_USER_ADDRESS',
      'ETH_RESOLVER_ADDRESS',
      'NEAR_USER_ACCOUNT_ID',
      'NEAR_RESOLVER_ACCOUNT_ID'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      console.error('❌ Missing environment variables:', missing);
      process.exit(1);
    }

    console.log('✅ Environment variables verified');
  }

  generateReport() {
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;

    console.log('\n🏆 === YOUR TEST RESULTS ===');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);

    if (failed === 0) {
      console.log('\n🎉 === ALL YOUR TESTS PASSED ===');
      console.log('💰 Your requested amounts tested successfully:');
      console.log('✅ ETH → NEAR: 0.00001 ETH transferred');
      console.log('✅ NEAR → ETH: 0.01 NEAR swapped');
      console.log('🚀 Bridge ready for your amounts!');
    } else {
      console.log('\n⚠️ Some tests failed. Please check above.');
      process.exit(1);
    }
  }
}

// Run the tests
const runner = new RealMoneyTestRunner();
runner.runAllTests().catch(console.error);