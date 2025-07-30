/**
 * Cross-chain type definitions for 1inch Unite Hackathon
 * Ethereum ↔ Near atomic swap bridge utilities
 */

export type ChainId = 'ethereum' | 'near';

// Cross-chain escrow state
export interface CrossChainEscrowState {
  chainId: ChainId;
  contractAddress: string;
  hashlock: string; // hex string
  amount: string;
  token: string;
  maker: string;
  taker: string;
  safetyDeposit: string;
  timelocks: number;
  deployedAt: number;
  withdrawn: boolean;
  cancelled: boolean;
  revealedSecret?: string;
}

// Partial fill specific types
export interface MerkleProof {
  index: number;
  secretHash: string; // hex string
  proof: string[]; // array of hex strings
}

export interface PartialFillInfo {
  merkleRoot: string; // hex string
  totalParts: number;
  usedIndices: number[];
  lastValidated: number;
}

export interface PartialFillState extends CrossChainEscrowState {
  partialFillInfo: PartialFillInfo;
  filledAmount: string;
}

// Cross-chain swap configuration
export interface SwapConfig {
  srcChain: ChainId;
  dstChain: ChainId;
  srcToken: string;
  dstToken: string;
  srcAmount: string;
  dstAmount: string;
  maker: string;
  taker: string;
  secret: string;
  safetyDeposit: string;
  timelockDuration: number;
  enablePartialFills?: boolean;
  totalParts?: number;
}

// Timelock stages (matching both chains)
export enum TimelockStage {
  SrcWithdrawal = 0,
  SrcPublicWithdrawal = 1,
  SrcCancellation = 2,
  SrcPublicCancellation = 3,
  DstWithdrawal = 4,
  DstPublicWithdrawal = 5,
  DstCancellation = 6
}

// Cross-chain transaction status
export interface CrossChainTransaction {
  id: string;
  srcTxHash?: string;
  dstTxHash?: string;
  srcEscrow?: CrossChainEscrowState;
  dstEscrow?: CrossChainEscrowState;
  status: 'pending' | 'deployed' | 'active' | 'completed' | 'cancelled' | 'failed';
  stage: TimelockStage;
  createdAt: number;
  updatedAt: number;
}

// Event types for cross-chain synchronization
export interface CrossChainEvent {
  chainId: ChainId;
  contractAddress: string;
  eventType: 'EscrowDeployed' | 'Withdrawn' | 'Cancelled' | 'SecretRevealed' | 'PartialFill';
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
  data: any;
}

// Bridge state synchronization
export interface BridgeState {
  transactions: Map<string, CrossChainTransaction>;
  pendingSecrets: Map<string, string>; // hashlock -> secret
  eventLog: CrossChainEvent[];
  lastSyncBlock: {
    ethereum: number;
    near: number;
  };
}