#!/usr/bin/env node

// Quick script to demonstrate REAL Near transaction
// Run with: node test-real-near-transfer.js

const { execSync } = require('child_process');

async function demonstrateRealNearTransfer() {
  console.log('🌿 === REAL NEAR TRANSACTION DEMO ===');
  console.log('Making ACTUAL transaction on Near testnet...');
  
  try {
    // Step 1: Check account balance
    console.log('\n📋 Step 1: Checking current balance...');
    const balanceResult = execSync('near view rarebat823.testnet account_balance "{}"', { encoding: 'utf8' });
    console.log('💰 Current balance:', balanceResult);
    
    // Step 2: Make a real transfer (small amount)
    console.log('\n📋 Step 2: Making real NEAR transfer...');
    const transferAmount = '0.1'; // 0.1 NEAR
    const recipientAccount = 'rarebat823.testnet'; // Transfer to same account (demo)
    
    const transferCommand = `near send rarebat823.testnet rarebat823.testnet ${transferAmount}`;
    console.log('🔄 Executing:', transferCommand);
    
    const transferResult = execSync(transferCommand, { encoding: 'utf8' });
    console.log('✅ Transfer result:', transferResult);
    
    // Step 3: Extract transaction hash from result
    const txHashMatch = transferResult.match(/Transaction Id: ([A-Za-z0-9]+)/);
    if (txHashMatch) {
      const txHash = txHashMatch[1];
      console.log('\n🎉 REAL TRANSACTION COMPLETED!');
      console.log('📄 Transaction Hash:', txHash);
      console.log('🔍 Explorer:', `https://testnet.nearblocks.io/txns/${txHash}`);
      console.log('✅ This is a REAL transaction on Near testnet!');
      
      return {
        success: true,
        txHash: txHash,
        explorerUrl: `https://testnet.nearblocks.io/txns/${txHash}`,
        amount: transferAmount + ' NEAR'
      };
    }
    
  } catch (error) {
    console.error('❌ Real Near transaction failed:', error.message);
    console.log('💡 Make sure you are logged in with: near login');
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the demo
if (require.main === module) {
  demonstrateRealNearTransfer()
    .then(result => {
      if (result.success) {
        console.log('\n🏆 SUCCESS: Real Near transaction completed!');
      } else {
        console.log('\n❌ FAILED: Could not complete real transaction');
      }
    })
    .catch(console.error);
}

module.exports = { demonstrateRealNearTransfer };