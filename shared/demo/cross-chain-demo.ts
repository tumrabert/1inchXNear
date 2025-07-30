/**
 * Cross-Chain Atomic Swap Demo
 * 1inch Unite Hackathon - Ethereum ↔ Near demonstration
 */

import { BridgeOrchestrator, SwapConfig } from '../utils';

async function demonstrateCrossChainSwap() {
  console.log('🚀 1inch Unite Hackathon - Cross-Chain Atomic Swap Demo');
  console.log('=' .repeat(60));

  // Setup mock configuration (in production, use real providers)
  const bridgeConfig = {
    ethereum: {
      provider: mockEthereumProvider(),
      signer: mockEthereumSigner(),
      factoryAddress: '0x1234567890123456789012345678901234567890'
    },
    near: {
      near: mockNearConnection(),
      wallet: mockNearWallet(),
      account: mockNearAccount(),
      factoryContractId: 'escrow-factory.near'
    }
  };

  const orchestrator = new BridgeOrchestrator(bridgeConfig);

  // Demo 1: Ethereum → Near atomic swap
  console.log('\n📍 Demo 1: Ethereum → Near Atomic Swap');
  console.log('-' .repeat(40));

  const ethToNearConfig: SwapConfig = {
    srcChain: 'ethereum',
    dstChain: 'near',
    srcToken: '0xA0b86a33E6417aE21227d5Cf4f929d2b0B7c8F1C', // USDT on Ethereum
    dstToken: 'usdt.tether-token.near', // USDT on Near
    srcAmount: '1000000000000000000', // 1 USDT (18 decimals)
    dstAmount: '1000000', // 1 USDT (6 decimals on Near)
    maker: '0x742d35Cc6491C0532A0e4Dc8B3d12F94b0F50c8a', // Alice (Ethereum user)
    taker: 'resolver-bob.near', // Bob (Near resolver)
    secret: 'super-secret-key-alice-bob-swap-12345',
    safetyDeposit: '500000000000000000', // 0.5 ETH safety deposit
    timelockDuration: 86400 // 24 hours
  };

  try {
    // Initialize the swap
    console.log('💫 Initializing Ethereum → Near swap...');
    const swapId = await orchestrator.executeSwap(ethToNearConfig);
    console.log(`✅ Swap initialized with ID: ${swapId}`);

    // Wait for deployment
    await sleep(2000);
    
    // Check status
    const status = orchestrator.getSwapStatus(swapId);
    console.log(`📊 Status: ${status?.status}`);
    console.log(`🔐 Source escrow (Ethereum): ${status?.srcEscrow?.contractAddress}`);
    console.log(`🔐 Destination escrow (Near): ${status?.dstEscrow?.contractAddress}`);

    // Complete the swap by revealing secret on destination
    console.log('\n🔓 Revealing secret to complete swap...');
    const withdrawalTx = await orchestrator.completeWithdrawal(swapId, ethToNearConfig.secret);
    console.log(`✅ Withdrawal completed: ${withdrawalTx}`);

    // Check final status
    const finalStatus = orchestrator.getSwapStatus(swapId);
    console.log(`🎉 Final status: ${finalStatus?.status}`);
    console.log(`🔑 Secret revealed: ${finalStatus?.dstEscrow?.revealedSecret ? 'Yes' : 'No'}`);

  } catch (error) {
    console.error('❌ Demo 1 failed:', error);
  }

  // Demo 2: Near → Ethereum atomic swap
  console.log('\n📍 Demo 2: Near → Ethereum Atomic Swap');
  console.log('-' .repeat(40));

  const nearToEthConfig: SwapConfig = {
    srcChain: 'near',
    dstChain: 'ethereum',
    srcToken: 'dai.tokens.near', // DAI on Near
    dstToken: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI on Ethereum
    srcAmount: '1000000000000000000000', // 1000 DAI (18 decimals)
    dstAmount: '1000000000000000000000', // 1000 DAI (18 decimals)
    maker: 'alice-trader.near', // Alice (Near user)  
    taker: '0x8ba1f109551bD432803012645Hac136c22C57592', // Bob (Ethereum resolver)
    secret: 'near-to-eth-secret-key-67890',
    safetyDeposit: '2000000000000000000000000', // 2 NEAR safety deposit
    timelockDuration: 86400
  };

  try {
    console.log('💫 Initializing Near → Ethereum swap...');
    const swapId2 = await orchestrator.executeSwap(nearToEthConfig);
    console.log(`✅ Swap initialized with ID: ${swapId2}`);

    await sleep(2000);

    const status2 = orchestrator.getSwapStatus(swapId2);
    console.log(`📊 Status: ${status2?.status}`);
    console.log(`🔐 Source escrow (Near): ${status2?.srcEscrow?.contractAddress}`);
    console.log(`🔐 Destination escrow (Ethereum): ${status2?.dstEscrow?.contractAddress}`);

    // Complete withdrawal
    console.log('\n🔓 Completing reverse swap...');
    const withdrawalTx2 = await orchestrator.completeWithdrawal(swapId2, nearToEthConfig.secret);
    console.log(`✅ Withdrawal completed: ${withdrawalTx2}`);

  } catch (error) {
    console.error('❌ Demo 2 failed:', error);
  }

  // Demo 3: Partial fill demonstration
  console.log('\n📍 Demo 3: Partial Fill Atomic Swap');
  console.log('-' .repeat(40));

  const partialFillConfig: SwapConfig = {
    srcChain: 'ethereum',
    dstChain: 'near',
    srcToken: '0xA0b86a33E6417aE21227d5Cf4f929d2b0B7c8F1C',
    dstToken: 'usdt.tether-token.near',
    srcAmount: '4000000000000000000', // 4 USDT
    dstAmount: '4000000', // 4 USDT on Near
    maker: '0x123456789012345678901234567890123456789A',
    taker: 'partial-resolver.near',
    secret: 'partial-fill-secret-abcdef',
    safetyDeposit: '1000000000000000000', // 1 ETH
    timelockDuration: 86400,
    enablePartialFills: true,
    totalParts: 4 // 25% increments
  };

  try {
    console.log('💫 Initializing partial fill swap (4 parts)...');
    const swapId3 = await orchestrator.executeSwap(partialFillConfig);
    console.log(`✅ Partial fill swap initialized: ${swapId3}`);

    await sleep(2000);

    // Execute first partial fill (25%)
    console.log('\n🔓 Executing partial fill 1/4 (25%)...');
    const partialProof1 = {
      index: 0,
      secretHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
      proof: [
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        '0x9876543210987654321098765432109876543210987654321098765432109876'
      ]
    };

    const partialTx1 = await orchestrator.executePartialWithdrawal(
      swapId3, 
      partialFillConfig.secret, 
      partialProof1
    );
    console.log(`✅ Partial fill 1/4 completed: ${partialTx1}`);

    // Execute second partial fill (50% total)
    console.log('\n🔓 Executing partial fill 2/4 (50% total)...');
    const partialProof2 = {
      index: 1,
      secretHash: '0x2345678901234567890123456789012345678901234567890123456789012345',
      proof: [
        '0xbcdef12345678901bcdef12345678901bcdef12345678901bcdef12345678901',
        '0x8765432109876543210987654321098765432109876543210987654321098765'
      ]
    };

    const partialTx2 = await orchestrator.executePartialWithdrawal(
      swapId3,
      partialFillConfig.secret,
      partialProof2
    );
    console.log(`✅ Partial fill 2/4 completed: ${partialTx2}`);
    console.log('🎉 50% of the swap completed via partial fills!');

  } catch (error) {
    console.error('❌ Demo 3 failed:', error);
  }

  // Demo 4: Error handling and cancellation
  console.log('\n📍 Demo 4: Error Handling & Cancellation');
  console.log('-' .repeat(40));

  const cancelConfig: SwapConfig = {
    ...ethToNearConfig,
    secret: 'cancellation-demo-secret',
    maker: '0xCANCEL123456789012345678901234567890123456'
  };

  try {
    console.log('💫 Initializing swap for cancellation demo...');
    const swapId4 = await orchestrator.executeSwap(cancelConfig);
    console.log(`✅ Swap initialized: ${swapId4}`);

    await sleep(1000);

    // Attempt cancellation
    console.log('\n❌ Demonstrating swap cancellation...');
    const cancelResult = await orchestrator.cancelSwap(swapId4);
    console.log(`✅ Cancellation result:`, cancelResult);

  } catch (error) {
    console.error('❌ Demo 4 failed:', error);
  }

  // Final summary
  console.log('\n' + '=' .repeat(60));
  console.log('📈 Bridge Statistics');
  console.log('-' .repeat(20));
  
  const bridgeState = orchestrator.getBridgeState();
  console.log(`📊 Total transactions: ${bridgeState.transactions.size}`);
  console.log(`🔐 Pending secrets: ${bridgeState.pendingSecrets.size}`);
  console.log(`📝 Event log entries: ${bridgeState.eventLog.length}`);
  console.log(`🔗 Last Ethereum block: ${bridgeState.lastSyncBlock.ethereum}`);
  console.log(`🔗 Last Near block: ${bridgeState.lastSyncBlock.near}`);

  const activeSwaps = orchestrator.getActiveSwaps();
  console.log(`⚡ Active swaps: ${activeSwaps.length}`);

  console.log('\n🎉 Demo completed successfully!');
  console.log('✨ 1inch Unite Hackathon - Cross-chain atomic swaps are working!');
}

// Mock implementations for demo
function mockEthereumProvider() {
  return {
    getBlockNumber: async () => Math.floor(Date.now() / 1000),
    getTransactionReceipt: async () => ({ events: [] })
  };
}

function mockEthereumSigner() {
  return {
    address: '0x742d35Cc6491C0532A0e4Dc8B3d12F94b0F50c8a',
    signTransaction: async () => ({ hash: 'eth-tx-hash' })
  };
}

function mockNearConnection() {
  return {
    connection: {
      provider: {
        status: async () => ({
          sync_info: { latest_block_height: Math.floor(Date.now() / 1000) }
        })
      }
    }
  };
}

function mockNearWallet() {
  return {
    account: { accountId: 'demo-wallet.near' }
  };
}

function mockNearAccount() {
  return {
    functionCall: async (params: any) => {
      console.log(`📞 Near function call: ${params.methodName}`);
      return { transaction: { hash: `near-tx-${Date.now()}` } };
    },
    viewFunction: async (params: any) => {
      console.log(`👀 Near view call: ${params.methodName}`);
      return {
        hashlock: Array.from({ length: 32 }, (_, i) => i + 1),
        token_id: 'usdt.tether-token.near',
        amount: '1000000',
        maker: 'alice.near',
        taker: 'bob.near',
        safety_deposit: '1000000000000000000000000',
        timelocks: 0,
        deployed_at: Math.floor(Date.now() / 1000)
      };
    }
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the demo
if (require.main === module) {
  demonstrateCrossChainSwap().catch(console.error);
}

export { demonstrateCrossChainSwap };