/**
 * Simple Ethereum Deployment Script (JavaScript)
 * 1inch Unite Hackathon - Cross-Chain Bridge
 */

const { ethers } = require('ethers');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function deployEthereumContracts() {
  console.log('🚀 Deploying 1inch Unite Bridge to Ethereum Sepolia...');
  
  // Validate environment variables
  if (!process.env.ETHEREUM_RPC_URL || !process.env.ETHEREUM_PRIVATE_KEY) {
    throw new Error('Missing required environment variables: ETHEREUM_RPC_URL, ETHEREUM_PRIVATE_KEY');
  }

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
  const wallet = new ethers.Wallet(process.env.ETHEREUM_PRIVATE_KEY, provider);
  
  console.log(`📱 Deploying from account: ${wallet.address}`);
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Account balance: ${ethers.formatEther(balance)} ETH`);
  
  if (balance < ethers.parseEther('0.005')) {
    throw new Error('Insufficient ETH balance for deployment. Need at least 0.005 ETH.');
  }

  // Load contract artifacts
  const timelocksLibPath = path.join(__dirname, '../ethereum/out/TimelocksLib.sol/TimelocksLib.json');
  const escrowFactoryPath = path.join(__dirname, '../ethereum/out/EscrowFactory.sol/EscrowFactory.json');
  
  if (!fs.existsSync(timelocksLibPath) || !fs.existsSync(escrowFactoryPath)) {
    throw new Error('Contract artifacts not found. Run: cd ethereum && forge build');
  }
  
  const timelocksLibArtifact = JSON.parse(fs.readFileSync(timelocksLibPath, 'utf8'));
  const escrowFactoryArtifact = JSON.parse(fs.readFileSync(escrowFactoryPath, 'utf8'));

  console.log('\n📚 Deploying TimelocksLib library...');
  
  // Deploy TimelocksLib first
  const TimelocksLib = new ethers.ContractFactory(
    timelocksLibArtifact.abi,
    timelocksLibArtifact.bytecode.object,
    wallet
  );
  
  const timelocksLib = await TimelocksLib.deploy({
    gasLimit: 500000
  });
  
  await timelocksLib.waitForDeployment();
  const timelocksLibAddress = await timelocksLib.getAddress();
  console.log(`✅ TimelocksLib deployed at: ${timelocksLibAddress}`);

  console.log('\n🏭 Deploying EscrowFactory contract...');
  
  // Link library in bytecode
  let linkedBytecode = escrowFactoryArtifact.bytecode.object;
  
  // Simple linking - replace library placeholder with address
  const libraryPlaceholder = '__$TimelocksLib$__';
  const cleanAddress = timelocksLibAddress.replace('0x', '');
  linkedBytecode = linkedBytecode.replace(new RegExp(libraryPlaceholder, 'g'), cleanAddress);
  
  const EscrowFactory = new ethers.ContractFactory(
    escrowFactoryArtifact.abi,
    linkedBytecode,
    wallet
  );
  
  const escrowFactory = await EscrowFactory.deploy(wallet.address, {
    gasLimit: 2000000
  });
  
  await escrowFactory.waitForDeployment();
  const escrowFactoryAddress = await escrowFactory.getAddress();
  
  console.log(`✅ EscrowFactory deployed at: ${escrowFactoryAddress}`);
  
  // Get deployment details
  const deploymentTx = await escrowFactory.deploymentTransaction();
  const receipt = await provider.getTransactionReceipt(deploymentTx.hash);
  
  const result = {
    escrowFactory: escrowFactoryAddress,
    timelocksLib: timelocksLibAddress,
    deploymentBlock: receipt.blockNumber,
    transactionHash: receipt.hash,
    gasUsed: receipt.gasUsed.toString(),
    timestamp: Date.now()
  };

  // Save deployment info
  const deploymentsDir = path.join(__dirname, '../ethereum/deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
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
  
  const outputPath = path.join(deploymentsDir, 'sepolia.json');
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log('\n🎉 Ethereum deployment completed successfully!');
  console.log('📋 Summary:');
  console.log(`   EscrowFactory: ${result.escrowFactory}`);
  console.log(`   TimelocksLib: ${result.timelocksLib}`);
  console.log(`   Gas Used: ${result.gasUsed}`);
  console.log(`   Block: ${result.deploymentBlock}`);
  console.log(`   Explorer: https://sepolia.etherscan.io/address/${result.escrowFactory}`);
  
  return result;
}

// Main execution
if (require.main === module) {
  deployEthereumContracts()
    .then((result) => {
      console.log('\n✅ Ethereum deployment successful!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Ethereum deployment failed:', error);
      process.exit(1);
    });
}

module.exports = { deployEthereumContracts };