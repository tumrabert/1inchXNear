/**
 * Ethereum-specific utilities for 1inch Unite cross-chain bridge
 * Handles interaction with EscrowSrc and EscrowFactory contracts
 */

import { CrossChainEscrowState, MerkleProof, TimelockStage } from '../types/cross-chain';

// Contract ABIs (simplified for demo - in production use full ABIs)
export const ESCROW_SRC_ABI = [
  'function withdraw(bytes32 secret) external',
  'function cancel() external',
  'function rescueFunds(address token, uint256 amount) external',
  'function getImmutables() external view returns (tuple)',
  'function isWithdrawn() external view returns (bool)',
  'function isCancelled() external view returns (bool)',
  'function getRevealedSecret() external view returns (bytes32)',
  'event Withdrawn(address indexed maker, bytes32 secret)',
  'event Cancelled(address indexed taker)',
  'event SecretRevealed(bytes32 indexed secret)'
];

export const ESCROW_FACTORY_ABI = [
  'function createEscrow(tuple escrowParams) external payable returns (address)',
  'function createEscrowBatch(tuple[] escrowParams) external payable returns (address[])',
  'function predictEscrowAddress(tuple escrowParams) external view returns (address)',
  'event EscrowCreated(address indexed escrow, address indexed maker, address indexed taker)'
];

export interface EscrowParams {
  hashlock: string;
  token: string;
  amount: string;
  maker: string;
  taker: string;
  safetyDeposit: string;
  timelocks: number;
}

export class EthereumBridgeClient {
  private provider: any; // ethers.Provider
  private signer: any; // ethers.Signer
  private factoryContract: any;
  private factoryAddress: string;

  constructor(provider: any, signer: any, factoryAddress: string) {
    this.provider = provider;
    this.signer = signer;
    this.factoryAddress = factoryAddress;
    // In production: this.factoryContract = new ethers.Contract(factoryAddress, ESCROW_FACTORY_ABI, signer);
  }

  /**
   * Deploy new escrow contract on Ethereum
   */
  async deployEscrow(params: EscrowParams): Promise<string> {
    try {
      // Predict escrow address for deterministic deployment
      const predictedAddress = await this.predictEscrowAddress(params);
      
      // Deploy escrow contract
      const tx = await this.factoryContract.createEscrow(params, {
        value: params.safetyDeposit
      });
      
      const receipt = await tx.wait();
      
      // Find EscrowCreated event
      const escrowCreatedEvent = receipt.events?.find(
        (e: any) => e.event === 'EscrowCreated'
      );
      
      const escrowAddress = escrowCreatedEvent?.args?.escrow || predictedAddress;
      
      return escrowAddress;
    } catch (error) {
      throw new Error(`Failed to deploy escrow: ${error}`);
    }
  }

  /**
   * Predict escrow contract address
   */
  async predictEscrowAddress(params: EscrowParams): Promise<string> {
    try {
      return await this.factoryContract.predictEscrowAddress(params);
    } catch (error) {
      throw new Error(`Failed to predict escrow address: ${error}`);
    }
  }

  /**
   * Withdraw from escrow by revealing secret
   */
  async withdraw(escrowAddress: string, secret: string): Promise<string> {
    try {
      const escrowContract = this.getEscrowContract(escrowAddress);
      const secretBytes = this.stringToBytes32(secret);
      
      const tx = await escrowContract.withdraw(secretBytes);
      const receipt = await tx.wait();
      
      return receipt.transactionHash;
    } catch (error) {
      throw new Error(`Failed to withdraw: ${error}`);
    }
  }

  /**
   * Cancel escrow contract
   */
  async cancel(escrowAddress: string): Promise<string> {
    try {
      const escrowContract = this.getEscrowContract(escrowAddress);
      
      const tx = await escrowContract.cancel();
      const receipt = await tx.wait();
      
      return receipt.transactionHash;
    } catch (error) {
      throw new Error(`Failed to cancel: ${error}`);
    }
  }

  /**
   * Get escrow state from contract
   */
  async getEscrowState(escrowAddress: string): Promise<Partial<CrossChainEscrowState>> {
    try {
      const escrowContract = this.getEscrowContract(escrowAddress);
      
      const [immutables, withdrawn, cancelled, revealedSecret] = await Promise.all([
        escrowContract.getImmutables(),
        escrowContract.isWithdrawn(),
        escrowContract.isCancelled(),
        escrowContract.getRevealedSecret()
      ]);
      
      return {
        chainId: 'ethereum',
        contractAddress: escrowAddress,
        hashlock: immutables.hashlock,
        amount: immutables.amount.toString(),
        token: immutables.token,
        maker: immutables.maker,
        taker: immutables.taker,
        safetyDeposit: immutables.safetyDeposit.toString(),
        timelocks: immutables.timelocks,
        deployedAt: immutables.deployedAt,
        withdrawn,
        cancelled,
        revealedSecret: revealedSecret !== '0x0000000000000000000000000000000000000000000000000000000000000000' 
          ? this.bytes32ToString(revealedSecret) : undefined
      };
    } catch (error) {
      throw new Error(`Failed to get escrow state: ${error}`);
    }
  }

  /**
   * Monitor escrow events
   */
  async monitorEscrowEvents(
    escrowAddress: string, 
    callback: (event: any) => void
  ): Promise<void> {
    const escrowContract = this.getEscrowContract(escrowAddress);
    
    // Listen for all escrow events
    escrowContract.on('Withdrawn', (maker: string, secret: string, event: any) => {
      callback({
        type: 'Withdrawn',
        maker,
        secret: this.bytes32ToString(secret),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      });
    });
    
    escrowContract.on('Cancelled', (taker: string, event: any) => {
      callback({
        type: 'Cancelled',
        taker,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      });
    });
    
    escrowContract.on('SecretRevealed', (secret: string, event: any) => {
      callback({
        type: 'SecretRevealed',
        secret: this.bytes32ToString(secret),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      });
    });
  }

  /**
   * Calculate current timelock stage
   */
  async getCurrentStage(escrowAddress: string): Promise<TimelockStage> {
    try {
      const escrowContract = this.getEscrowContract(escrowAddress);
      const immutables = await escrowContract.getImmutables();
      const currentBlock = await this.provider.getBlockNumber();
      
      const blocksPassed = currentBlock - immutables.deployedAt;
      
      // Decode packed timelocks (simplified version)
      // In production, implement full timelock decoding
      if (blocksPassed < 100) {
        return TimelockStage.SrcWithdrawal;
      } else if (blocksPassed < 200) {
        return TimelockStage.SrcPublicWithdrawal;
      } else if (blocksPassed < 300) {
        return TimelockStage.SrcCancellation;
      } else {
        return TimelockStage.SrcPublicCancellation;
      }
    } catch (error) {
      throw new Error(`Failed to get current stage: ${error}`);
    }
  }

  /**
   * Get transaction receipt and extract events
   */
  async getTransactionEvents(txHash: string): Promise<any[]> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      return receipt.events || [];
    } catch (error) {
      throw new Error(`Failed to get transaction events: ${error}`);
    }
  }

  /**
   * Batch deploy multiple escrows (for testing/demo)
   */
  async batchDeployEscrows(paramsArray: EscrowParams[]): Promise<string[]> {
    try {
      const totalSafetyDeposit = paramsArray.reduce(
        (sum, params) => sum + BigInt(params.safetyDeposit), 
        BigInt(0)
      );
      
      const tx = await this.factoryContract.createEscrowBatch(paramsArray, {
        value: totalSafetyDeposit.toString()
      });
      
      const receipt = await tx.wait();
      
      // Extract escrow addresses from events
      const escrowAddresses = receipt.events
        ?.filter((e: any) => e.event === 'EscrowCreated')
        .map((e: any) => e.args?.escrow) || [];
      
      return escrowAddresses;
    } catch (error) {
      throw new Error(`Failed to batch deploy escrows: ${error}`);
    }
  }

  /**
   * Helper: Get escrow contract instance
   */
  private getEscrowContract(escrowAddress: string): any {
    // In production: return new ethers.Contract(escrowAddress, ESCROW_SRC_ABI, this.signer);
    return {
      // Mock contract for development
      withdraw: async (secret: string) => ({ wait: async () => ({ transactionHash: 'mock-tx' }) }),
      cancel: async () => ({ wait: async () => ({ transactionHash: 'mock-tx' }) }),
      getImmutables: async () => ({
        hashlock: '0x1234567890123456789012345678901234567890123456789012345678901234',
        token: '0xA0b86a33E6417aE21227d5Cf4f929d2b0B7c8F1C',
        amount: '1000000000000000000',
        maker: '0x1234567890123456789012345678901234567890',
        taker: '0x0987654321098765432109876543210987654321',
        safetyDeposit: '500000000000000000',
        timelocks: 0,
        deployedAt: 1000
      }),
      isWithdrawn: async () => false,
      isCancelled: async () => false,
      getRevealedSecret: async () => '0x0000000000000000000000000000000000000000000000000000000000000000',
      on: (event: string, callback: Function) => {}
    };
  }

  /**
   * Helper: Convert string to bytes32
   */
  private stringToBytes32(str: string): string {
    // In production: use ethers.utils.formatBytes32String or similar
    return `0x${Buffer.from(str).toString('hex').padEnd(64, '0')}`;
  }

  /**
   * Helper: Convert bytes32 to string
   */
  private bytes32ToString(bytes32: string): string {
    // In production: use ethers.utils.parseBytes32String or similar
    return Buffer.from(bytes32.slice(2), 'hex').toString().replace(/\0/g, '');
  }
}