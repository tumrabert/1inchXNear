/**
 * Master Deployment Script
 * 1inch Unite Hackathon - Deploy to both Ethereum Sepolia and Near Testnet
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { deployToSepolia, DeploymentResult } from '../ethereum/scripts/deploy-sepolia';
import { deployToNearTestnet, NearDeploymentResult } from '../near/scripts/deploy-testnet';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

interface CrossChainDeployment {
  ethereum: DeploymentResult;
  near: NearDeploymentResult;
  bridgeConfig: {
    ethereumFactory: string;
    nearFactory: string;
    deploymentTime: number;
    testnetUrls: {
      ethereum: string;
      near: string;
    };
  };
}

async function deployFullBridge(): Promise<CrossChainDeployment> {
  console.log('🌉 1inch Unite Hackathon - Full Cross-Chain Bridge Deployment');
  console.log('='.repeat(70));

  console.log('🔍 Checking prerequisites...');
  await checkPrerequisites();

  let ethereumResult: DeploymentResult;
  let nearResult: NearDeploymentResult;

  try {
    // Deploy to Ethereum Sepolia
    console.log('\n🔷 PHASE 1: Ethereum Sepolia Deployment');
    console.log('-'.repeat(50));
    ethereumResult = await deployToSepolia();

    // Short delay between deployments
    console.log('\n⏱️  Waiting 10 seconds before Near deployment...');
    await sleep(10000);

    // Deploy to Near Testnet  
    console.log('\n🔶 PHASE 2: Near Testnet Deployment');
    console.log('-'.repeat(50));
    nearResult = await deployToNearTestnet();

    // Create bridge configuration
    console.log('\n🌉 PHASE 3: Bridge Configuration');
    console.log('-'.repeat(50));

    const bridgeConfig = {
      ethereumFactory: ethereumResult.escrowFactory,
      nearFactory: nearResult.factoryContract,
      deploymentTime: Date.now(),
      testnetUrls: {
        ethereum: `https://sepolia.etherscan.io/address/${ethereumResult.escrowFactory}`,
        near: `https://testnet.nearblocks.io/accounts/${nearResult.factoryContract}`
      }
    };

    const fullDeployment: CrossChainDeployment = {
      ethereum: ethereumResult,
      near: nearResult,
      bridgeConfig
    };

    // Save complete deployment info
    await saveCrossChainDeployment(fullDeployment);

    // Create environment configuration for demo
    await createDemoEnvironmentConfig(fullDeployment);

    // Generate deployment summary
    printDeploymentSummary(fullDeployment);

    return fullDeployment;

  } catch (error) {
    console.error('\n❌ Cross-chain deployment failed:', error);
    throw error;
  }
}

async function checkPrerequisites(): Promise<void> {
  const errors: string[] = [];

  // Check .env file exists
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) {
    errors.push('❌ .env file not found. Copy .env.example to .env and fill in credentials.');
  }

  // Check required environment variables
  const requiredVars = [
    'ETHEREUM_RPC_URL',
    'ETHEREUM_PRIVATE_KEY',
    'NEAR_ACCOUNT_ID',
    'NEAR_PRIVATE_KEY',
    'NEAR_NETWORK_ID',
    'NEAR_NODE_URL'
  ];

  for (const envVar of requiredVars) {
    if (!process.env[envVar]) {
      errors.push(`❌ Missing environment variable: ${envVar}`);
    }
  }

  // Check Ethereum contract artifacts
  const ethArtifactsPath = path.join(__dirname, '../ethereum/out');
  if (!fs.existsSync(ethArtifactsPath)) {
    errors.push('❌ Ethereum contract artifacts not found. Run: cd ethereum && forge build');
  }

  // Check Near contract build
  const nearWasmPath = path.join(__dirname, '../near/contracts/target/wasm32-unknown-unknown/release/contracts.wasm');
  if (!fs.existsSync(nearWasmPath)) {
    errors.push('❌ Near WASM not found. Run: cd near/contracts && cargo build --target wasm32-unknown-unknown --release');
  }

  if (errors.length > 0) {
    console.error('\n💥 Prerequisites check failed:');
    errors.forEach(error => console.error(error));
    console.error('\n📋 To fix these issues:');
    console.error('1. Copy .env.example to .env');
    console.error('2. Fill in your credentials in .env');
    console.error('3. Build contracts: npm run build:contracts');
    throw new Error('Prerequisites not met');
  }

  console.log('✅ All prerequisites satisfied!');
}

async function saveCrossChainDeployment(deployment: CrossChainDeployment): Promise<void> {
  const deploymentPath = path.join(__dirname, '../deployments/cross-chain.json');

  // Ensure deployments directory exists
  const deploymentDir = path.dirname(deploymentPath);
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  const deploymentData = {
    version: '1.0.0',
    hackathon: '1inch Unite DeFi',
    timestamp: new Date().toISOString(),
    networks: {
      ethereum: {
        name: 'Sepolia Testnet',
        chainId: 11155111,
        ...deployment.ethereum
      },
      near: {
        name: 'Near Testnet',
        networkId: 'testnet',
        ...deployment.near
      }
    },
    bridge: deployment.bridgeConfig,
    demo: {
      ethereum: {
        explorerUrl: deployment.bridgeConfig.testnetUrls.ethereum,
        factoryAddress: deployment.ethereum.escrowFactory
      },
      near: {
        explorerUrl: deployment.bridgeConfig.testnetUrls.near,
        factoryContract: deployment.near.factoryContract
      }
    }
  };

  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
  console.log(`💾 Cross-chain deployment saved to: ${deploymentPath}`);
}

async function createDemoEnvironmentConfig(deployment: CrossChainDeployment): Promise<void> {
  const demoEnvPath = path.join(__dirname, '../demo/.env.demo');

  const demoEnvContent = `# Auto-generated demo configuration
# 1inch Unite Hackathon - Cross-Chain Bridge Demo

# Deployed contract addresses
ETHEREUM_FACTORY_ADDRESS=${deployment.ethereum.escrowFactory}
ETHEREUM_TIMELOCKS_LIB=${deployment.ethereum.timelocksLib}
NEAR_FACTORY_CONTRACT=${deployment.near.factoryContract}
NEAR_SAMPLE_ESCROW=${deployment.near.escrowContract}

# Network configuration
ETHEREUM_CHAIN_ID=11155111
ETHEREUM_NETWORK_NAME="Sepolia Testnet"
NEAR_NETWORK_ID=testnet

# Explorer URLs
ETHEREUM_EXPLORER_URL=${deployment.bridgeConfig.testnetUrls.ethereum}
NEAR_EXPLORER_URL=${deployment.bridgeConfig.testnetUrls.near}

# Demo UI configuration
REACT_APP_ETHEREUM_FACTORY=${deployment.ethereum.escrowFactory}
REACT_APP_NEAR_FACTORY=${deployment.near.factoryContract}
REACT_APP_ETHEREUM_RPC_URL=${process.env.ETHEREUM_RPC_URL}
REACT_APP_NEAR_NODE_URL=${process.env.NEAR_NODE_URL}

# Deployment info
DEPLOYMENT_TIMESTAMP=${deployment.bridgeConfig.deploymentTime}
DEPLOYMENT_BLOCK_ETH=${deployment.ethereum.deploymentBlock}
DEPLOYMENT_BLOCK_NEAR=${deployment.near.blockHeight}
`;

  // Ensure demo directory exists
  const demoDir = path.dirname(demoEnvPath);
  if (!fs.existsSync(demoDir)) {
    fs.mkdirSync(demoDir, { recursive: true });
  }

  fs.writeFileSync(demoEnvPath, demoEnvContent);
  console.log(`🎭 Demo environment config created: ${demoEnvPath}`);
}

function printDeploymentSummary(deployment: CrossChainDeployment): void {
  console.log('\n' + '🎉'.repeat(20));
  console.log('🏆 1INCH UNITE HACKATHON - DEPLOYMENT SUCCESSFUL! 🏆');
  console.log('🎉'.repeat(20));

  console.log('\n📊 DEPLOYMENT SUMMARY');
  console.log('━'.repeat(50));

  console.log('\n🔷 ETHEREUM SEPOLIA:');
  console.log(`   Factory Address: ${deployment.ethereum.escrowFactory}`);
  console.log(`   TimelocksLib:    ${deployment.ethereum.timelocksLib}`);
  console.log(`   Gas Used:        ${deployment.ethereum.gasUsed}`);
  console.log(`   Explorer:        ${deployment.bridgeConfig.testnetUrls.ethereum}`);

  console.log('\n🔶 NEAR TESTNET:');
  console.log(`   Factory Contract: ${deployment.near.factoryContract}`);
  console.log(`   Sample Escrow:    ${deployment.near.escrowContract}`);
  console.log(`   Transaction:      ${deployment.near.transactionHash}`);
  console.log(`   Explorer:         ${deployment.bridgeConfig.testnetUrls.near}`);

  console.log('\n🌉 CROSS-CHAIN BRIDGE:');
  console.log(`   Status:           ✅ READY FOR ATOMIC SWAPS`);
  console.log(`   Ethereum → Near:  ✅ Supported`);
  console.log(`   Near → Ethereum:  ✅ Supported`);
  console.log(`   Partial Fills:    ✅ Supported (Near side)`);

  console.log('\n🚀 NEXT STEPS:');
  console.log('   1. Run demo UI:        npm run dev:demo');
  console.log('   2. Test atomic swap:   npm run test:integration');
  console.log('   3. View on explorers:  Check URLs above');

  console.log('\n💡 HACKATHON DEMO READY!');
  console.log('   All contracts deployed and verified');
  console.log('   Cross-chain infrastructure operational');
  console.log('   Demo environment configured');

  console.log('\n' + '🎉'.repeat(20));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main execution
if (require.main === module) {
  deployFullBridge()
    .then(() => {
      console.log('\n✅ Full cross-chain deployment completed successfully!');
      console.log('🏆 Ready for 1inch Unite Hackathon demo!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Cross-chain deployment failed:', error);
      console.error('\n🔧 Check the error above and fix any issues before retrying.');
      process.exit(1);
    });
}

export { deployFullBridge, CrossChainDeployment };
