/**
 * Ethereum Sepolia Deployment Script
 * 1inch Unite Hackathon - Cross-Chain Bridge
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface DeploymentResult {
  escrowFactory: string;
  timelocksLib: string;
  deploymentBlock: number;
  transactionHash: string;
  gasUsed: string;
  timestamp: number;
}

async function deployToSepolia(): Promise<DeploymentResult> {
  console.log('🚀 Deploying 1inch Unite Bridge to Ethereum Sepolia...');
  
  // Validate environment variables
  const requiredEnvVars = [
    'ETHEREUM_RPC_URL',
    'ETHEREUM_PRIVATE_KEY'
  ];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
  const wallet = new ethers.Wallet(process.env.ETHEREUM_PRIVATE_KEY!, provider);
  
  console.log(`📱 Deploying from account: ${wallet.address}`);
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Account balance: ${ethers.formatEther(balance)} ETH`);
  
  if (balance < ethers.parseEther('0.01')) {
    throw new Error('Insufficient ETH balance for deployment. Need at least 0.01 ETH.');
  }

  // Load contract artifacts (assuming they exist from compilation)
  const timelocksLibArtifact = loadArtifact('TimelocksLib.sol/TimelocksLib.json');
  const escrowFactoryArtifact = loadArtifact('EscrowFactory.sol/EscrowFactory.json');

  console.log('\n📚 Deploying TimelocksLib library...');
  
  // Deploy TimelocksLib first
  const TimelocksLib = new ethers.ContractFactory(
    timelocksLibArtifact.abi,
    timelocksLibArtifact.bytecode,
    wallet
  );
  
  const timelocksLib = await TimelocksLib.deploy({
    gasLimit: parseInt(process.env.ETHEREUM_GAS_LIMIT || '500000')
  });
  
  await timelocksLib.waitForDeployment();
  const timelocksLibAddress = await timelocksLib.getAddress();
  console.log(`✅ TimelocksLib deployed at: ${timelocksLibAddress}`);

  console.log('\n🏭 Deploying EscrowFactory contract...');
  
  // Link library and deploy EscrowFactory
  const linkedBytecode = linkLibrary(
    escrowFactoryArtifact.bytecode,
    'TimelocksLib',
    timelocksLibAddress
  );
  
  const EscrowFactory = new ethers.ContractFactory(
    escrowFactoryArtifact.abi,
    linkedBytecode,
    wallet
  );
  
  const escrowFactory = await EscrowFactory.deploy(wallet.address, {
    gasLimit: parseInt(process.env.ETHEREUM_GAS_LIMIT || '500000')
  });
  
  const deploymentTx = await escrowFactory.waitForDeployment();
  const escrowFactoryAddress = await escrowFactory.getAddress();
  
  console.log(`✅ EscrowFactory deployed at: ${escrowFactoryAddress}`);
  
  // Get deployment details
  const receipt = await provider.getTransactionReceipt(deploymentTx.deploymentTransaction()!.hash);
  const block = await provider.getBlock(receipt!.blockNumber);
  
  const result: DeploymentResult = {
    escrowFactory: escrowFactoryAddress,
    timelocksLib: timelocksLibAddress,
    deploymentBlock: receipt!.blockNumber,
    transactionHash: receipt!.hash,
    gasUsed: receipt!.gasUsed.toString(),
    timestamp: block!.timestamp
  };

  // Save deployment info
  await saveDeploymentInfo(result);
  
  // Verify contracts if Etherscan API key is provided
  if (process.env.ETHERSCAN_API_KEY) {
    console.log('\n🔍 Verifying contracts on Etherscan...');
    await verifyContracts(result);
  }

  console.log('\n🎉 Deployment completed successfully!');
  console.log('📋 Summary:');
  console.log(`   EscrowFactory: ${result.escrowFactory}`);
  console.log(`   TimelocksLib: ${result.timelocksLib}`);
  console.log(`   Gas Used: ${result.gasUsed}`);
  console.log(`   Block: ${result.deploymentBlock}`);
  
  return result;
}

function loadArtifact(relativePath: string): { abi: any[], bytecode: string } {
  const artifactPath = path.join(__dirname, '../out', relativePath);
  
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Contract artifact not found: ${artifactPath}`);
  }
  
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return {
    abi: artifact.abi,
    bytecode: artifact.bytecode
  };
}

function linkLibrary(bytecode: string, libraryName: string, libraryAddress: string): string {
  // Remove 0x prefix from address
  const cleanAddress = libraryAddress.replace('0x', '');
  
  // Create library placeholder (Solidity uses specific format)
  const placeholder = `__$${ethers.keccak256(ethers.toUtf8Bytes(libraryName)).slice(2, 36)}__`;
  
  return bytecode.replace(new RegExp(placeholder, 'g'), cleanAddress);
}

async function saveDeploymentInfo(result: DeploymentResult): Promise<void> {
  const deploymentInfo = {
    network: 'sepolia',
    chainId: 11155111,
    ...result,
    contracts: {
      EscrowFactory: {
        address: result.escrowFactory,
        verified: false
      },
      TimelocksLib: {
        address: result.timelocksLib,
        verified: false
      }
    }
  };
  
  const outputPath = path.join(__dirname, '../deployments/sepolia.json');
  
  // Ensure deployments directory exists
  const deploymentDir = path.dirname(outputPath);
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`📄 Deployment info saved to: ${outputPath}`);
}

async function verifyContracts(result: DeploymentResult): Promise<void> {
  // This would implement Etherscan verification
  // For now, just log the verification commands
  
  console.log('🔍 To verify contracts manually, run:');
  console.log(`npx hardhat verify --network sepolia ${result.timelocksLib}`);
  console.log(`npx hardhat verify --network sepolia ${result.escrowFactory} "${process.env.ETHEREUM_PRIVATE_KEY}"`);
  
  // TODO: Implement automatic verification using Etherscan API
}

// Main execution
if (require.main === module) {
  deployToSepolia()
    .then((result) => {
      console.log('\n✅ Deployment successful!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Deployment failed:', error);
      process.exit(1);
    });
}

export { deployToSepolia, DeploymentResult };