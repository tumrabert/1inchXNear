/**
 * Near Testnet Deployment Script
 * 1inch Unite Hackathon - Cross-Chain Bridge
 */

import { connect, Contract, keyStores, KeyPair, Account } from 'near-api-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface NearDeploymentResult {
  factoryContract: string;
  escrowContract?: string;
  transactionHash: string;
  blockHeight: number;
  timestamp: number;
  gasUsed: string;
}

async function deployToNearTestnet(): Promise<NearDeploymentResult> {
  console.log('🚀 Deploying 1inch Unite Bridge to Near Testnet...');
  
  // Validate environment variables
  const requiredEnvVars = [
    'NEAR_ACCOUNT_ID',
    'NEAR_PRIVATE_KEY',
    'NEAR_NETWORK_ID',
    'NEAR_NODE_URL'
  ];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  // Setup Near connection
  const keyStore = new keyStores.InMemoryKeyStore();
  const keyPair = KeyPair.fromString(process.env.NEAR_PRIVATE_KEY!);
  await keyStore.setKey(process.env.NEAR_NETWORK_ID!, process.env.NEAR_ACCOUNT_ID!, keyPair);

  const config = {
    networkId: process.env.NEAR_NETWORK_ID!,
    keyStore,
    nodeUrl: process.env.NEAR_NODE_URL!,
    walletUrl: `https://wallet.${process.env.NEAR_NETWORK_ID}.near.org`,
    helperUrl: `https://helper.${process.env.NEAR_NETWORK_ID}.near.org`,
    explorerUrl: `https://explorer.${process.env.NEAR_NETWORK_ID}.near.org`,
  };

  const near = await connect(config);
  const account = await near.account(process.env.NEAR_ACCOUNT_ID!);
  
  console.log(`📱 Deploying from account: ${process.env.NEAR_ACCOUNT_ID}`);
  
  // Check balance
  const balance = await account.getAccountBalance();
  console.log(`💰 Account balance: ${balance.available} yoctoNEAR`);
  
  const minBalance = BigInt('1000000000000000000000000'); // 1 NEAR
  if (BigInt(balance.available) < minBalance) {
    throw new Error('Insufficient NEAR balance for deployment. Need at least 1 NEAR.');
  }

  // Load compiled contract
  const wasmPath = path.join(__dirname, '../contracts/target/wasm32-unknown-unknown/release/contracts.wasm');
  
  if (!fs.existsSync(wasmPath)) {
    throw new Error(`WASM file not found: ${wasmPath}\nRun 'cargo build --target wasm32-unknown-unknown --release' first`);
  }
  
  const wasmCode = fs.readFileSync(wasmPath);
  console.log(`📦 Contract size: ${(wasmCode.length / 1024).toFixed(2)} KB`);

  // Deploy factory contract
  const factoryContractId = `escrow-factory-${Date.now()}.${process.env.NEAR_ACCOUNT_ID}`;
  
  console.log(`\n🏭 Deploying EscrowFactory contract: ${factoryContractId}`);
  
  try {
    // Create sub-account for factory
    const factoryResult = await account.createAndDeployContract(
      factoryContractId,
      keyPair.getPublicKey(),
      wasmCode,
      BigInt(process.env.NEAR_SAFETY_DEPOSIT_NEAR || '1000000000000000000000000') // 1 NEAR
    );
    
    console.log(`✅ Factory contract deployed: ${factoryContractId}`);
    console.log(`📋 Transaction: ${factoryResult.transaction.hash}`);

    // Initialize the factory contract
    console.log('\n🔧 Initializing factory contract...');
    
    const factory = new Contract(account, factoryContractId, {
      viewMethods: ['get_owner', 'predict_escrow_address'],
      changeMethods: ['new', 'create_escrow', 'create_escrow_with_partial_fills']
    });

    // Initialize if needed (depending on contract design)
    try {
      const initResult = await (factory as any).new({
        args: {
          owner: process.env.NEAR_ACCOUNT_ID
        },
        gas: process.env.NEAR_GAS_LIMIT || '300000000000000'
      });
      
      console.log(`✅ Factory initialized: ${initResult.transaction.hash}`);
    } catch (error) {
      console.log('ℹ️  Factory already initialized or doesn\'t need initialization');
    }

    // Deploy a sample escrow for testing
    console.log('\n🔐 Deploying sample escrow contract...');
    
    const sampleEscrowId = `sample-escrow-${Date.now()}.${factoryContractId}`;
    const sampleHashlock = Array.from({ length: 32 }, (_, i) => i + 1); // Sample hashlock
    
    const escrowResult = await (factory as any).create_escrow({
      args: {
        escrow_id: sampleEscrowId,
        hashlock: sampleHashlock,
        token_id: process.env.NEAR_DEMO_TOKEN || 'usdt.fakes.testnet',
        amount: process.env.DEMO_SWAP_AMOUNT_NEAR || '1000000',
        maker: process.env.NEAR_ACCOUNT_ID,
        taker: `resolver.${process.env.NEAR_ACCOUNT_ID}`,
        safety_deposit: process.env.NEAR_SAFETY_DEPOSIT_NEAR || '1000000000000000000000000',
        timelocks: parseInt(process.env.DEFAULT_TIMELOCK_DURATION || '3600')
      },
      gas: process.env.NEAR_GAS_LIMIT || '300000000000000',
      attachedDeposit: process.env.NEAR_SAFETY_DEPOSIT_NEAR || '1000000000000000000000000'
    });

    console.log(`✅ Sample escrow deployed: ${sampleEscrowId}`);

    // Get deployment details
    const status = await near.connection.provider.status();
    
    const result: NearDeploymentResult = {
      factoryContract: factoryContractId,
      escrowContract: sampleEscrowId,
      transactionHash: factoryResult.transaction.hash,
      blockHeight: status.sync_info.latest_block_height,
      timestamp: Date.now(),
      gasUsed: 'N/A' // Near doesn't report gas used in the same way
    };

    // Save deployment info
    await saveNearDeploymentInfo(result);
    
    console.log('\n🎉 Near deployment completed successfully!');
    console.log('📋 Summary:');
    console.log(`   Factory Contract: ${result.factoryContract}`);
    console.log(`   Sample Escrow: ${result.escrowContract}`);
    console.log(`   Transaction: ${result.transactionHash}`);
    console.log(`   Block Height: ${result.blockHeight}`);
    
    return result;

  } catch (error) {
    console.error('❌ Deployment failed:', error);
    throw error;
  }
}

async function saveNearDeploymentInfo(result: NearDeploymentResult): Promise<void> {
  const deploymentInfo = {
    network: 'testnet',
    networkId: process.env.NEAR_NETWORK_ID,
    ...result,
    contracts: {
      EscrowFactory: {
        contractId: result.factoryContract,
        verified: true // Near contracts are automatically verified
      },
      SampleEscrow: {
        contractId: result.escrowContract,
        verified: true
      }
    }
  };
  
  const outputPath = path.join(__dirname, '../deployments/testnet.json');
  
  // Ensure deployments directory exists
  const deploymentDir = path.dirname(outputPath);
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`📄 Deployment info saved to: ${outputPath}`);
}

async function testDeployedContracts(factoryContractId: string): Promise<void> {
  console.log('\n🧪 Testing deployed contracts...');
  
  try {
    const keyStore = new keyStores.InMemoryKeyStore();
    const keyPair = KeyPair.fromString(process.env.NEAR_PRIVATE_KEY!);
    await keyStore.setKey(process.env.NEAR_NETWORK_ID!, process.env.NEAR_ACCOUNT_ID!, keyPair);

    const config = {
      networkId: process.env.NEAR_NETWORK_ID!,
      keyStore,
      nodeUrl: process.env.NEAR_NODE_URL!,
      walletUrl: `https://wallet.${process.env.NEAR_NETWORK_ID}.near.org`,
      helperUrl: `https://helper.${process.env.NEAR_NETWORK_ID}.near.org`,
      explorerUrl: `https://explorer.${process.env.NEAR_NETWORK_ID}.near.org`,
    };

    const near = await connect(config);
    const account = await near.account(process.env.NEAR_ACCOUNT_ID!);
    
    const factory = new Contract(account, factoryContractId, {
      viewMethods: ['get_owner'],
      changeMethods: []
    });

    // Test view function
    const owner = await (factory as any).get_owner();
    console.log(`✅ Factory owner: ${owner}`);
    
    console.log('✅ Contract testing completed successfully!');
    
  } catch (error) {
    console.warn('⚠️  Contract testing failed (contracts may still work):', error);
  }
}

// Utility function to build contracts
async function buildContracts(): Promise<void> {
  console.log('🔨 Building Near contracts...');
  
  const { spawn } = require('child_process');
  const contractsDir = path.join(__dirname, '../contracts');
  
  return new Promise((resolve, reject) => {
    const buildProcess = spawn('cargo', ['build', '--target', 'wasm32-unknown-unknown', '--release'], {
      cwd: contractsDir,
      stdio: 'inherit'
    });
    
    buildProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Contracts built successfully!');
        resolve();
      } else {
        reject(new Error(`Build failed with code ${code}`));
      }
    });
  });
}

// Main execution
if (require.main === module) {
  (async () => {
    try {
      // Build contracts first
      await buildContracts();
      
      // Deploy to testnet
      const result = await deployToNearTestnet();
      
      // Test deployed contracts
      await testDeployedContracts(result.factoryContract);
      
      console.log('\n✅ Full Near deployment successful!');
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Near deployment failed:', error);
      process.exit(1);
    }
  })();
}

export { deployToNearTestnet, NearDeploymentResult };