/**
 * Bridge Orchestrator - Main coordination class for cross-chain atomic swaps
 * Manages the complete lifecycle of Ethereum ↔ Near swaps
 */

import { CrossChainBridge } from './bridge';
import { EthereumBridgeClient } from './ethereum';
import { NearBridgeClient } from './near';
import { 
  SwapConfig, 
  CrossChainTransaction, 
  TimelockStage, 
  MerkleProof,
  ChainId
} from '../types/cross-chain';

export interface BridgeConfig {
  ethereum: {
    provider: any;
    signer: any;
    factoryAddress: string;
  };
  near: {
    near: any;
    wallet: any;
    account: any;
    factoryContractId: string;
  };
}

export class BridgeOrchestrator {
  private bridge: CrossChainBridge;
  private ethereumClient: EthereumBridgeClient;
  private nearClient: NearBridgeClient;
  private isMonitoring: boolean = false;

  constructor(config: BridgeConfig) {
    this.bridge = new CrossChainBridge();
    
    this.ethereumClient = new EthereumBridgeClient(
      config.ethereum.provider,
      config.ethereum.signer,
      config.ethereum.factoryAddress
    );
    
    this.nearClient = new NearBridgeClient(
      config.near.near,
      config.near.wallet,
      config.near.account,
      config.near.factoryContractId
    );

    this.setupEventHandlers();
  }

  /**
   * Execute complete cross-chain atomic swap
   */
  async executeSwap(config: SwapConfig): Promise<string> {
    try {
      // 1. Initialize swap in bridge state
      const swapId = await this.bridge.initializeSwap(config);
      console.log(`Initialized swap ${swapId}`);

      // 2. Deploy source escrow (where user deposits tokens)
      const srcEscrowAddress = await this.deploySrcEscrow(swapId, config);
      console.log(`Deployed source escrow at ${srcEscrowAddress}`);

      // 3. Deploy destination escrow (where resolver deposits tokens)
      const dstEscrowAddress = await this.deployDstEscrow(swapId, config);
      console.log(`Deployed destination escrow at ${dstEscrowAddress}`);

      // 4. Start monitoring both escrows
      this.startMonitoring(swapId, srcEscrowAddress, dstEscrowAddress);

      return swapId;
    } catch (error) {
      throw new Error(`Failed to execute swap: ${error}`);
    }
  }

  /**
   * Get swap status and details
   */
  getSwapStatus(swapId: string): CrossChainTransaction | undefined {
    return this.bridge.getTransactionStatus(swapId);
  }

  /**
   * Complete withdrawal on destination chain
   */
  async completeWithdrawal(swapId: string, secret: string): Promise<string> {
    const transaction = this.bridge.getTransactionStatus(swapId);
    if (!transaction?.dstEscrow?.contractAddress) {
      throw new Error('Destination escrow not found');
    }

    const chainId = transaction.dstEscrow.chainId;
    const escrowAddress = transaction.dstEscrow.contractAddress;

    let txHash: string;
    
    if (chainId === 'ethereum') {
      txHash = await this.ethereumClient.withdraw(escrowAddress, secret);
    } else {
      txHash = await this.nearClient.withdraw(escrowAddress, secret);
    }

    // Update bridge state
    this.bridge.revealSecret(swapId, secret, chainId);
    
    return txHash;
  }

  /**
   * Execute partial withdrawal with proof
   */
  async executePartialWithdrawal(
    swapId: string, 
    secret: string, 
    proof: MerkleProof
  ): Promise<string> {
    const transaction = this.bridge.getTransactionStatus(swapId);
    if (!transaction?.dstEscrow?.contractAddress) {
      throw new Error('Destination escrow not found');
    }

    const chainId = transaction.dstEscrow.chainId;
    const escrowAddress = transaction.dstEscrow.contractAddress;

    let txHash: string;
    
    if (chainId === 'near') {
      txHash = await this.nearClient.withdrawPartial(escrowAddress, secret, proof);
    } else {
      // Ethereum partial withdrawal would be implemented similarly
      throw new Error('Ethereum partial withdrawal not implemented yet');
    }

    // Update bridge state
    this.bridge.handlePartialFill(swapId, chainId, proof, '0'); // Amount to be calculated
    this.bridge.revealSecret(swapId, secret, chainId);
    
    return txHash;
  }

  /**
   * Cancel swap on both chains
   */
  async cancelSwap(swapId: string): Promise<{ srcTxHash?: string, dstTxHash?: string }> {
    const transaction = this.bridge.getTransactionStatus(swapId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    const results: { srcTxHash?: string, dstTxHash?: string } = {};

    // Cancel source escrow
    if (transaction.srcEscrow?.contractAddress) {
      const srcChainId = transaction.srcEscrow.chainId;
      const srcAddress = transaction.srcEscrow.contractAddress;
      
      try {
        if (srcChainId === 'ethereum') {
          results.srcTxHash = await this.ethereumClient.cancel(srcAddress);
        } else {
          results.srcTxHash = await this.nearClient.cancel(srcAddress);
        }
      } catch (error) {
        console.error('Failed to cancel source escrow:', error);
      }
    }

    // Cancel destination escrow
    if (transaction.dstEscrow?.contractAddress) {
      const dstChainId = transaction.dstEscrow.chainId;
      const dstAddress = transaction.dstEscrow.contractAddress;
      
      try {
        if (dstChainId === 'ethereum') {
          results.dstTxHash = await this.ethereumClient.cancel(dstAddress);
        } else {
          results.dstTxHash = await this.nearClient.cancel(dstAddress);
        }
      } catch (error) {
        console.error('Failed to cancel destination escrow:', error);
      }
    }

    return results;
  }

  /**
   * Get all active swaps
   */
  getActiveSwaps(): CrossChainTransaction[] {
    return this.bridge.getActiveTransactions();
  }

  /**
   * Check if swap state is synchronized across chains
   */
  isSwapSynchronized(swapId: string): boolean {
    return this.bridge.isStateSynchronized(swapId);
  }

  /**
   * Private: Deploy source escrow
   */
  private async deploySrcEscrow(swapId: string, config: SwapConfig): Promise<string> {
    const hashlock = this.generateHashlock(config.secret);
    
    const params = {
      hashlock,
      token: config.srcToken,
      amount: config.srcAmount,
      maker: config.maker,
      taker: config.taker,
      safetyDeposit: config.safetyDeposit,
      timelocks: config.timelockDuration
    };

    let escrowAddress: string;
    
    if (config.srcChain === 'ethereum') {
      escrowAddress = await this.ethereumClient.deployEscrow(params);
    } else {
      const nearParams = {
        ...params,
        hashlock: this.hexToByteArray(hashlock),
        tokenId: params.token
      };
      escrowAddress = await this.nearClient.deployEscrow(nearParams);
    }

    // Update bridge state
    this.bridge.updateEscrowState(swapId, config.srcChain, {
      contractAddress: escrowAddress
    });

    return escrowAddress;
  }

  /**
   * Private: Deploy destination escrow
   */
  private async deployDstEscrow(swapId: string, config: SwapConfig): Promise<string> {
    const hashlock = this.generateHashlock(config.secret);
    
    const params = {
      hashlock,
      token: config.dstToken,
      amount: config.dstAmount,
      maker: config.taker, // Reversed
      taker: config.maker, // Reversed
      safetyDeposit: config.safetyDeposit,
      timelocks: config.timelockDuration
    };

    let escrowAddress: string;
    
    if (config.dstChain === 'ethereum') {
      escrowAddress = await this.ethereumClient.deployEscrow(params);
    } else {
      if (config.enablePartialFills && config.totalParts) {
        // Deploy with partial fill support
        const nearParams = {
          hashlock: this.hexToByteArray(hashlock),
          tokenId: params.token,
          amount: params.amount,
          maker: params.maker,
          taker: params.taker,
          safetyDeposit: params.safetyDeposit,
          timelocks: params.timelocks,
          merkleRoot: this.hexToByteArray(hashlock), // Use hashlock as merkle root for single fills
          totalParts: config.totalParts!
        };
        escrowAddress = await this.nearClient.deployPartialEscrow(nearParams);
      } else {
        const nearParams = {
          hashlock: this.hexToByteArray(hashlock),
          tokenId: params.token,
          amount: params.amount,
          maker: params.maker,
          taker: params.taker,
          safetyDeposit: params.safetyDeposit,
          timelocks: params.timelocks
        };
        escrowAddress = await this.nearClient.deployEscrow(nearParams);
      }
    }

    // Update bridge state
    this.bridge.updateEscrowState(swapId, config.dstChain, {
      contractAddress: escrowAddress
    });

    return escrowAddress;
  }

  /**
   * Private: Start monitoring escrow events
   */
  private startMonitoring(swapId: string, srcAddress: string, dstAddress: string): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    const transaction = this.bridge.getTransactionStatus(swapId);
    if (!transaction) return;

    // Monitor source escrow
    if (transaction.srcEscrow) {
      const srcChainId = transaction.srcEscrow.chainId;
      
      if (srcChainId === 'ethereum') {
        this.ethereumClient.monitorEscrowEvents(srcAddress, (event) => {
          this.handleChainEvent(swapId, srcChainId, event);
        });
      } else {
        this.nearClient.monitorEscrowEvents(srcAddress, (event) => {
          this.handleChainEvent(swapId, srcChainId, event);
        });
      }
    }

    // Monitor destination escrow
    if (transaction.dstEscrow) {
      const dstChainId = transaction.dstEscrow.chainId;
      
      if (dstChainId === 'ethereum') {
        this.ethereumClient.monitorEscrowEvents(dstAddress, (event) => {
          this.handleChainEvent(swapId, dstChainId, event);
        });
      } else {
        this.nearClient.monitorEscrowEvents(dstAddress, (event) => {
          this.handleChainEvent(swapId, dstChainId, event);
        });
      }
    }
  }

  /**
   * Private: Handle events from either chain
   */
  private handleChainEvent(swapId: string, chainId: ChainId, event: any): void {
    console.log(`Received ${event.type} event from ${chainId} for swap ${swapId}`);
    
    switch (event.type) {
      case 'Withdrawn':
        this.bridge.updateEscrowState(swapId, chainId, { withdrawn: true });
        if (event.secret) {
          this.bridge.revealSecret(swapId, event.secret, chainId);
        }
        break;
        
      case 'Cancelled':
        this.bridge.updateEscrowState(swapId, chainId, { cancelled: true });
        break;
        
      case 'SecretRevealed':
        if (event.secret) {
          this.bridge.revealSecret(swapId, event.secret, chainId);
        }
        break;
    }
  }

  /**
   * Private: Setup event handlers for bridge events
   */
  private setupEventHandlers(): void {
    this.bridge.on('SwapInitialized', (data: any) => {
      console.log('Swap initialized:', data.swapId);
    });

    this.bridge.on('SecretRevealed', (data: any) => {
      console.log('Secret revealed for swap:', data.swapId);
    });

    this.bridge.on('EscrowStateUpdated', (data: any) => {
      console.log(`Escrow state updated for ${data.swapId} on ${data.chainId}`);
    });
  }

  /**
   * Helper: Generate hashlock from secret
   */
  private generateHashlock(secret: string): string {
    // In production, use keccak256
    const crypto = require('crypto');
    return '0x' + crypto.createHash('sha256').update(secret).digest('hex');
  }

  /**
   * Helper: Convert hex to byte array for Near
   */
  private hexToByteArray(hex: string): number[] {
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    const bytes = [];
    
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes.push(parseInt(cleanHex.substr(i, 2), 16));
    }
    
    return bytes;
  }

  /**
   * Get bridge state for debugging
   */
  getBridgeState() {
    return this.bridge.getState();
  }
}