/**
 * Cross-chain bridge utilities for 1inch Unite Hackathon
 * Handles state synchronization between Ethereum and Near Protocol
 */

import { 
  ChainId, 
  CrossChainEscrowState, 
  CrossChainTransaction, 
  CrossChainEvent, 
  BridgeState,
  SwapConfig,
  TimelockStage,
  MerkleProof,
  PartialFillState
} from '../types/cross-chain';
import { createHash } from 'crypto';

export class CrossChainBridge {
  private state: BridgeState;
  private eventHandlers: Map<string, Function[]> = new Map();

  constructor() {
    this.state = {
      transactions: new Map(),
      pendingSecrets: new Map(),
      eventLog: [],
      lastSyncBlock: {
        ethereum: 0,
        near: 0
      }
    };
  }

  /**
   * Initialize a cross-chain atomic swap
   */
  async initializeSwap(config: SwapConfig): Promise<string> {
    const swapId = this.generateSwapId(config);
    const hashlock = this.generateHashlock(config.secret);
    
    const transaction: CrossChainTransaction = {
      id: swapId,
      status: 'pending',
      stage: TimelockStage.SrcWithdrawal,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      srcEscrow: {
        chainId: config.srcChain,
        contractAddress: '', // Will be set after deployment
        hashlock,
        amount: config.srcAmount,
        token: config.srcToken,
        maker: config.maker,
        taker: config.taker,
        safetyDeposit: config.safetyDeposit,
        timelocks: config.timelockDuration,
        deployedAt: 0,
        withdrawn: false,
        cancelled: false
      },
      dstEscrow: {
        chainId: config.dstChain,
        contractAddress: '', // Will be set after deployment
        hashlock,
        amount: config.dstAmount,
        token: config.dstToken,
        maker: config.taker, // Reversed for destination
        taker: config.maker, // Reversed for destination
        safetyDeposit: config.safetyDeposit,
        timelocks: config.timelockDuration,
        deployedAt: 0,
        withdrawn: false,
        cancelled: false
      }
    };

    this.state.transactions.set(swapId, transaction);
    this.state.pendingSecrets.set(hashlock, config.secret);
    
    this.emit('SwapInitialized', { swapId, config });
    return swapId;
  }

  /**
   * Update escrow state from chain events
   */
  updateEscrowState(
    swapId: string, 
    chainId: ChainId, 
    updates: Partial<CrossChainEscrowState>
  ): void {
    const transaction = this.state.transactions.get(swapId);
    if (!transaction) {
      throw new Error(`Transaction ${swapId} not found`);
    }

    const escrowKey = chainId === transaction.srcEscrow?.chainId ? 'srcEscrow' : 'dstEscrow';
    if (transaction[escrowKey]) {
      Object.assign(transaction[escrowKey]!, updates);
      transaction.updatedAt = Date.now();
      
      // Update transaction status based on state changes
      this.updateTransactionStatus(transaction);
      
      this.emit('EscrowStateUpdated', { swapId, chainId, updates });
    }
  }

  /**
   * Handle secret revelation (critical for cross-chain sync)
   */
  revealSecret(swapId: string, secret: string, chainId: ChainId): void {
    const transaction = this.state.transactions.get(swapId);
    if (!transaction) {
      throw new Error(`Transaction ${swapId} not found`);
    }

    const hashlock = this.generateHashlock(secret);
    
    // Verify secret matches expected hashlock
    const expectedHashlock = transaction.srcEscrow?.hashlock || transaction.dstEscrow?.hashlock;
    if (hashlock !== expectedHashlock) {
      throw new Error('Secret does not match expected hashlock');
    }

    // Update both escrows with revealed secret
    if (transaction.srcEscrow) {
      transaction.srcEscrow.revealedSecret = secret;
    }
    if (transaction.dstEscrow) {
      transaction.dstEscrow.revealedSecret = secret;
    }

    // Remove from pending secrets
    this.state.pendingSecrets.delete(hashlock);
    
    this.emit('SecretRevealed', { swapId, secret, chainId });
  }

  /**
   * Handle partial fill operations
   */
  handlePartialFill(
    swapId: string,
    chainId: ChainId,
    proof: MerkleProof,
    filledAmount: string
  ): void {
    const transaction = this.state.transactions.get(swapId);
    if (!transaction) {
      throw new Error(`Transaction ${swapId} not found`);
    }

    const escrow = chainId === transaction.srcEscrow?.chainId ? 
      transaction.srcEscrow : transaction.dstEscrow;
    
    if (!escrow) {
      throw new Error(`Escrow not found for chain ${chainId}`);
    }

    // Validate Merkle proof structure
    if (!this.validateMerkleProofStructure(proof)) {
      throw new Error('Invalid Merkle proof structure');
    }

    this.emit('PartialFillExecuted', { swapId, chainId, proof, filledAmount });
  }

  /**
   * Get current transaction status
   */
  getTransactionStatus(swapId: string): CrossChainTransaction | undefined {
    return this.state.transactions.get(swapId);
  }

  /**
   * Get all active transactions
   */
  getActiveTransactions(): CrossChainTransaction[] {
    return Array.from(this.state.transactions.values())
      .filter(tx => tx.status === 'active' || tx.status === 'deployed');
  }

  /**
   * Get pending secrets for monitoring
   */
  getPendingSecrets(): Map<string, string> {
    return new Map(this.state.pendingSecrets);
  }

  /**
   * Add event to synchronization log
   */
  addEvent(event: CrossChainEvent): void {
    this.state.eventLog.push(event);
    this.updateLastSyncBlock(event.chainId, event.blockNumber);
    
    this.emit('EventAdded', event);
  }

  /**
   * Get events for a specific transaction
   */
  getTransactionEvents(swapId: string): CrossChainEvent[] {
    return this.state.eventLog.filter(event => 
      event.data?.swapId === swapId || 
      event.data?.transactionId === swapId
    );
  }

  /**
   * Check if cross-chain state is synchronized
   */
  isStateSynchronized(swapId: string): boolean {
    const transaction = this.state.transactions.get(swapId);
    if (!transaction || !transaction.srcEscrow || !transaction.dstEscrow) {
      return false;
    }

    // Both escrows should have consistent revealed secrets
    const srcSecret = transaction.srcEscrow.revealedSecret;
    const dstSecret = transaction.dstEscrow.revealedSecret;
    
    if (srcSecret || dstSecret) {
      return srcSecret === dstSecret;
    }

    return true; // No secrets revealed yet, considered synchronized
  }

  /**
   * Generate deterministic swap ID
   */
  private generateSwapId(config: SwapConfig): string {
    const data = JSON.stringify({
      srcChain: config.srcChain,
      dstChain: config.dstChain,
      maker: config.maker,
      taker: config.taker,
      timestamp: Date.now()
    });
    
    return createHash('sha256').update(data).digest('hex').slice(0, 16);
  }

  /**
   * Generate keccak256 hashlock (compatible with both chains)
   */
  private generateHashlock(secret: string): string {
    // Note: In production, use keccak256 from ethereum/crypto libraries
    // This is a simplified version for development
    return createHash('sha256').update(secret).digest('hex');
  }

  /**
   * Update transaction status based on escrow states
   */
  private updateTransactionStatus(transaction: CrossChainTransaction): void {
    const src = transaction.srcEscrow;
    const dst = transaction.dstEscrow;

    if (!src || !dst) return;

    if (src.withdrawn && dst.withdrawn) {
      transaction.status = 'completed';
    } else if (src.cancelled || dst.cancelled) {
      transaction.status = 'cancelled';
    } else if (src.contractAddress && dst.contractAddress) {
      transaction.status = 'active';
    } else if (src.contractAddress || dst.contractAddress) {
      transaction.status = 'deployed';
    }
  }

  /**
   * Validate Merkle proof structure
   */
  private validateMerkleProofStructure(proof: MerkleProof): boolean {
    return (
      typeof proof.index === 'number' &&
      proof.index >= 0 &&
      typeof proof.secretHash === 'string' &&
      proof.secretHash.length === 64 && // 32 bytes hex
      Array.isArray(proof.proof) &&
      proof.proof.every(p => typeof p === 'string' && p.length === 64)
    );
  }

  /**
   * Update last synchronized block
   */
  private updateLastSyncBlock(chainId: ChainId, blockNumber: number): void {
    if (blockNumber > this.state.lastSyncBlock[chainId]) {
      this.state.lastSyncBlock[chainId] = blockNumber;
    }
  }

  /**
   * Event emitter functionality
   */
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => handler(data));
  }

  /**
   * Get bridge state for debugging/monitoring
   */
  getState(): BridgeState {
    return {
      transactions: new Map(this.state.transactions),
      pendingSecrets: new Map(this.state.pendingSecrets),
      eventLog: [...this.state.eventLog],
      lastSyncBlock: { ...this.state.lastSyncBlock }
    };
  }
}