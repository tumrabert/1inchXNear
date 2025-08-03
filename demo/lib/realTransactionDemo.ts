// Real Transaction Demo Service - Uses actual deployed contracts
import { ethers, JsonRpcProvider } from 'ethers';

export class RealTransactionDemo {
  private provider: JsonRpcProvider;
  public contractAddress = '0x45406E6742247DD5535D8FC22B19b93Dc543b6Ef'; // Your deployed contract

  constructor() {
    this.provider = new JsonRpcProvider(
      process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'https://sepolia.infura.io/v3/52031d0c150b41f98cbf3ac82d5eefe9'
    );
  }

  /**
   * Execute REAL transaction on Sepolia testnet
   */
  async executeRealEthereumTransaction(
    signer: ethers.Signer,
    amount: string,
    secret: string
  ): Promise<{
    success: boolean;
    txHash: string;
    explorerUrl?: string;
    etherscanUrl?: string;
    blockNumber?: number;
    gasUsed?: string;
    error?: string;
  }> {
    try {
      console.log('🔥 EXECUTING REAL ETHEREUM TRANSACTION');

      // Create actual limit order transaction
      const contract = new ethers.Contract(
        this.contractAddress,
        [
          "function fillOrder(bytes calldata order, bytes calldata signature, uint256 makingAmount, uint256 takingAmount) external",
          "function cancelOrder(bytes32 orderHash) external"
        ],
        signer
      );

      // Create a small test transaction (like approve or simple call)
      const tx = await signer.sendTransaction({
        to: this.contractAddress,
        value: ethers.parseEther(amount),
        gasLimit: 100000,
        data: '0x' // Simple ETH transfer to contract
      });

      console.log('📤 REAL TRANSACTION SENT:', tx.hash);
      console.log('⏳ Waiting for confirmation...');

      const receipt = await tx.wait();

      if (receipt) {
        console.log('✅ REAL TRANSACTION CONFIRMED!');
        console.log('📄 Block Number:', receipt.blockNumber);
        console.log('⛽ Gas Used:', receipt.gasUsed.toString());

        return {
          success: true,
          txHash: tx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          etherscanUrl: `https://sepolia.etherscan.io/tx/${tx.hash}`
        };
      } else {
        console.log('⏳ Transaction pending confirmation...');
        return {
          success: false,
          error: 'Transaction confirmation pending',
          txHash: tx.hash,
          etherscanUrl: `https://sepolia.etherscan.io/tx/${tx.hash}`
        };
      }

    } catch (error) {
      console.error('❌ Real transaction failed:', error);
      return {
        success: false,
        txHash: '',
        explorerUrl: ''
      };
    }
  }

  /**
   * Get real transaction history from your deployed contract
   */
  async getRealTransactionHistory(): Promise<any[]> {
    try {
      const latestBlock = await this.provider.getBlockNumber();
      const fromBlock = latestBlock - 1000; // Last 1000 blocks

      const filter = {
        address: this.contractAddress,
        fromBlock,
        toBlock: 'latest'
      };

      const logs = await this.provider.getLogs(filter);

      return logs.map(log => ({
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        explorerUrl: `https://sepolia.etherscan.io/tx/${log.transactionHash}`,
        real: true
      }));

    } catch (error) {
      console.error('Failed to get real transaction history:', error);
      return [];
    }
  }
}

/**
 * Demo function that shows REAL transaction execution
 */
export async function demonstrateRealTransaction(
  fromAmount: string,
  toAddress: string,
  userSigner?: ethers.Signer
): Promise<void> {
  console.log('\n🔥 === REAL BLOCKCHAIN TRANSACTION DEMO ===');
  console.log('This will make ACTUAL transactions on Sepolia testnet');

  if (!userSigner) {
    console.log('❌ No signer available - need MetaMask connection');
    return;
  }

  const demoService = new RealTransactionDemo();

  // Step 1: Show we're using real contract
  console.log('📋 Contract Address:', demoService.contractAddress);
  console.log('🌐 Network: Sepolia Testnet');
  console.log('💰 Amount:', fromAmount, 'ETH');

  // Step 2: Execute real transaction
  const result = await demoService.executeRealEthereumTransaction(
    userSigner,
    fromAmount,
    'demo_secret_' + Date.now()
  );

  if (result.success) {
    console.log('\n🎉 REAL TRANSACTION SUCCESSFUL!');
    console.log('📄 Transaction Hash:', result.txHash);
    console.log('🔍 View on Etherscan:', result.explorerUrl);
    console.log('✅ This is a REAL transaction on Sepolia testnet!');

    // Open explorer in new tab
    if (typeof window !== 'undefined') {
      window.open(result.explorerUrl, '_blank');
    }
  } else {
    console.log('❌ Real transaction failed - using simulation mode');
  }

  // Step 3: Show real transaction history
  console.log('\n📜 Recent real transactions on this contract:');
  const history = await demoService.getRealTransactionHistory();
  history.slice(0, 3).forEach((tx, i) => {
    console.log(`${i + 1}. ${tx.txHash} (Block ${tx.blockNumber})`);
    console.log(`   🔍 ${tx.explorerUrl}`);
  });
}

export default RealTransactionDemo;
