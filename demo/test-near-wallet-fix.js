#!/usr/bin/env node

/**
 * Test script to verify Near wallet address fix
 */

const { demonstrateNearCompletion } = require('./lib/nearIntegrationService');

async function testNearWalletFix() {
  console.log('🧪 Testing Near wallet address fix...\n');
  
  // Test with connected wallet address
  const connectedWallet = 'usernear666.testnet';
  const orderHash = '0x123456789abcdef';
  const secret = 'test-secret-123';
  
  console.log('📋 Test Parameters:');
  console.log('  Connected Near Wallet:', connectedWallet);
  console.log('  Order Hash:', orderHash);
  console.log('  Secret:', secret);
  console.log('');
  
  try {
    // Test the function with connected wallet
    const result = await demonstrateNearCompletion(orderHash, secret, connectedWallet);
    
    console.log('✅ Test Results:');
    console.log('  Success:', result.success);
    console.log('  Amount Claimed:', result.amountClaimed);
    console.log('  Recipient:', result.recipient);
    console.log('');
    
    // Verify the fix
    if (result.recipient === connectedWallet) {
      console.log('🎉 ✅ WALLET FIX SUCCESSFUL!');
      console.log('   Near tokens will be claimed by the connected wallet:', connectedWallet);
    } else {
      console.log('❌ WALLET FIX FAILED!');
      console.log('   Expected:', connectedWallet);
      console.log('   Got:', result.recipient);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testNearWalletFix();