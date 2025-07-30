/**
 * Near Protocol utilities for 1inch Unite cross-chain bridge
 * Handles interaction with EscrowDst contracts
 */

import { CrossChainEscrowState, MerkleProof, TimelockStage, PartialFillInfo } from '../types/cross-chain';

export interface NearEscrowParams {
  hashlock: number[]; // 32-byte array
  tokenId: string;
  amount: string;
  maker: string;
  taker: string;
  safetyDeposit: string;
  timelocks: number;
}

export interface NearPartialEscrowParams extends NearEscrowParams {
  merkleRoot: number[]; // 32-byte array
  totalParts: number;
}

export class NearBridgeClient {
  private near: any; // near-api-js
  private wallet: any; // near-api-js wallet
  private account: any; // near-api-js account
  private factoryContractId: string;

  constructor(near: any, wallet: any, account: any, factoryContractId: string) {
    this.near = near;
    this.wallet = wallet;
    this.account = account;
    this.factoryContractId = factoryContractId;
  }

  /**
   * Deploy new escrow contract on Near
   */
  async deployEscrow(params: NearEscrowParams): Promise<string> {
    try {
      const result = await this.account.functionCall({
        contractId: this.factoryContractId,
        methodName: 'create_escrow',
        args: {
          hashlock: Array.from(this.hexToBytes(params.hashlock)),
          token_id: params.tokenId,
          amount: params.amount,
          maker: params.maker,
          taker: params.taker,
          safety_deposit: params.safetyDeposit,
          timelocks: params.timelocks
        },
        gas: '300000000000000', // 300 TGas
        attachedDeposit: params.safetyDeposit
      });

      // Extract contract address from result
      const contractAddress = this.extractContractAddress(result);
      return contractAddress;
    } catch (error) {
      throw new Error(`Failed to deploy Near escrow: ${error}`);
    }
  }

  /**
   * Deploy escrow with partial fill support
   */
  async deployPartialEscrow(params: NearPartialEscrowParams): Promise<string> {
    try {
      const result = await this.account.functionCall({
        contractId: this.factoryContractId,
        methodName: 'create_escrow_with_partial_fills',
        args: {
          merkle_root: Array.from(this.hexToBytes(params.merkleRoot)),
          token_id: params.tokenId,
          amount: params.amount,
          maker: params.maker,
          taker: params.taker,
          safety_deposit: params.safetyDeposit,
          timelocks: params.timelocks,
          total_parts: params.totalParts
        },
        gas: '300000000000000', // 300 TGas
        attachedDeposit: params.safetyDeposit
      });

      const contractAddress = this.extractContractAddress(result);
      return contractAddress;
    } catch (error) {
      throw new Error(`Failed to deploy Near partial escrow: ${error}`);
    }
  }

  /**
   * Withdraw from escrow by revealing secret
   */
  async withdraw(escrowAddress: string, secret: string): Promise<string> {
    try {
      const result = await this.account.functionCall({
        contractId: escrowAddress,
        methodName: 'withdraw',
        args: {
          secret: Array.from(Buffer.from(secret, 'utf8'))
        },
        gas: '100000000000000', // 100 TGas
        attachedDeposit: '1' // 1 yoctoNEAR for security
      });

      return result.transaction.hash;
    } catch (error) {
      throw new Error(`Failed to withdraw from Near escrow: ${error}`);
    }
  }

  /**
   * Withdraw partial fill with Merkle proof
   */
  async withdrawPartial(
    escrowAddress: string, 
    secret: string, 
    proof: MerkleProof
  ): Promise<string> {
    try {
      const nearProof = {
        index: proof.index,
        secret_hash: Array.from(this.hexToBytes(proof.secretHash)),
        proof: proof.proof.map(p => Array.from(this.hexToBytes(p)))
      };

      const result = await this.account.functionCall({
        contractId: escrowAddress,
        methodName: 'withdraw_partial',
        args: {
          secret: Array.from(Buffer.from(secret, 'utf8')),
          proof: nearProof
        },
        gas: '150000000000000', // 150 TGas
        attachedDeposit: '1'
      });

      return result.transaction.hash;
    } catch (error) {
      throw new Error(`Failed to partial withdraw: ${error}`);
    }
  }

  /**
   * Public withdrawal (after timeout)
   */
  async publicWithdraw(escrowAddress: string, secret: string): Promise<string> {
    try {
      const result = await this.account.functionCall({
        contractId: escrowAddress,
        methodName: 'public_withdraw',
        args: {
          secret: Array.from(Buffer.from(secret, 'utf8'))
        },
        gas: '100000000000000',
        attachedDeposit: '1'
      });

      return result.transaction.hash;
    } catch (error) {
      throw new Error(`Failed to public withdraw: ${error}`);
    }
  }

  /**
   * Cancel escrow contract
   */
  async cancel(escrowAddress: string): Promise<string> {
    try {
      const result = await this.account.functionCall({
        contractId: escrowAddress,
        methodName: 'cancel',
        args: {},
        gas: '100000000000000',
        attachedDeposit: '1'
      });

      return result.transaction.hash;
    } catch (error) {
      throw new Error(`Failed to cancel Near escrow: ${error}`);
    }
  }

  /**
   * Get escrow state from contract
   */
  async getEscrowState(escrowAddress: string): Promise<Partial<CrossChainEscrowState>> {
    try {
      const [immutables, withdrawn, cancelled, revealedSecret, partialState] = await Promise.all([
        this.account.viewFunction({
          contractId: escrowAddress,
          methodName: 'get_immutables'
        }),
        this.account.viewFunction({
          contractId: escrowAddress,
          methodName: 'is_withdrawn'
        }),
        this.account.viewFunction({
          contractId: escrowAddress,
          methodName: 'is_cancelled'
        }),
        this.account.viewFunction({
          contractId: escrowAddress,
          methodName: 'get_revealed_secret'
        }),
        this.account.viewFunction({
          contractId: escrowAddress,
          methodName: 'get_partial_fill_state'
        })
      ]);

      return {
        chainId: 'near',
        contractAddress: escrowAddress,
        hashlock: this.bytesToHex(immutables.hashlock),
        amount: immutables.amount,
        token: immutables.token_id,
        maker: immutables.maker,
        taker: immutables.taker,
        safetyDeposit: immutables.safety_deposit,
        timelocks: immutables.timelocks,
        deployedAt: immutables.deployed_at,
        withdrawn,
        cancelled,
        revealedSecret: revealedSecret ? Buffer.from(revealedSecret).toString('utf8') : undefined
      };
    } catch (error) {
      throw new Error(`Failed to get Near escrow state: ${error}`);
    }
  }

  /**
   * Get partial fill state
   */
  async getPartialFillState(escrowAddress: string): Promise<PartialFillInfo | null> {
    try {
      const partialState = await this.account.viewFunction({
        contractId: escrowAddress,
        methodName: 'get_partial_fill_state'
      });

      if (!partialState) return null;

      return {
        merkleRoot: this.bytesToHex(partialState.merkle_root),
        totalParts: partialState.total_parts,
        usedIndices: partialState.used_indices,
        lastValidated: partialState.last_validated
      };
    } catch (error) {
      throw new Error(`Failed to get partial fill state: ${error}`);
    }
  }

  /**
   * Monitor Near blockchain for escrow events
   */
  async monitorEscrowEvents(
    escrowAddress: string,
    callback: (event: any) => void,
    fromBlock?: number
  ): Promise<void> {
    try {
      // Near doesn't have traditional events, so we poll for state changes
      let lastKnownState: any = null;
      
      const pollInterval = setInterval(async () => {
        try {
          const currentState = await this.getEscrowState(escrowAddress);
          
          if (lastKnownState) {
            // Check for state changes
            if (currentState.withdrawn && !lastKnownState.withdrawn) {
              callback({
                type: 'Withdrawn',
                contractAddress: escrowAddress,
                state: currentState,
                timestamp: Date.now()
              });
            }
            
            if (currentState.cancelled && !lastKnownState.cancelled) {
              callback({
                type: 'Cancelled',
                contractAddress: escrowAddress,
                state: currentState,
                timestamp: Date.now()
              });
            }
            
            if (currentState.revealedSecret && !lastKnownState.revealedSecret) {
              callback({
                type: 'SecretRevealed',
                contractAddress: escrowAddress,
                secret: currentState.revealedSecret,
                timestamp: Date.now()
              });
            }
          }
          
          lastKnownState = currentState;
        } catch (error) {
          console.error('Error polling Near escrow state:', error);
        }
      }, 5000); // Poll every 5 seconds

      // Store cleanup function for potential use
      const cleanup = () => clearInterval(pollInterval);
      cleanup; // Reference to avoid unused variable warning
    } catch (error) {
      throw new Error(`Failed to monitor Near escrow events: ${error}`);
    }
  }

  /**
   * Calculate current timelock stage
   */
  async getCurrentStage(escrowAddress: string): Promise<TimelockStage> {
    try {
      const immutables = await this.account.viewFunction({
        contractId: escrowAddress,
        methodName: 'get_immutables'
      });

      const currentBlock = await this.getCurrentBlockHeight();
      const blocksPassed = currentBlock - immutables.deployed_at;

      // Simplified timelock decoding (in production, decode packed timelocks)
      if (blocksPassed < 100) {
        return TimelockStage.DstWithdrawal;
      } else if (blocksPassed < 200) {
        return TimelockStage.DstPublicWithdrawal;
      } else {
        return TimelockStage.DstCancellation;
      }
    } catch (error) {
      throw new Error(`Failed to get current stage: ${error}`);
    }
  }

  /**
   * Get current Near block height
   */
  async getCurrentBlockHeight(): Promise<number> {
    try {
      const status = await this.near.connection.provider.status();
      return status.sync_info.latest_block_height;
    } catch (error) {
      throw new Error(`Failed to get block height: ${error}`);
    }
  }

  /**
   * Helper: Convert hex string to byte array
   */
  private hexToBytes(hex: string | number[]): Uint8Array {
    if (Array.isArray(hex)) {
      return new Uint8Array(hex);
    }
    
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    const bytes = new Uint8Array(cleanHex.length / 2);
    
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
    }
    
    return bytes;
  }

  /**
   * Helper: Convert byte array to hex string
   */
  private bytesToHex(bytes: number[] | Uint8Array): string {
    return '0x' + Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Helper: Extract contract address from Near transaction result
   */
  private extractContractAddress(result: any): string {
    // This would extract the actual contract address from Near transaction result
    // For now, return a mock address
    return `escrow-${Date.now()}.near`;
  }

  /**
   * Rescue stuck funds (emergency function)
   */
  async rescueFunds(
    escrowAddress: string, 
    tokenId: string, 
    amount: string
  ): Promise<string> {
    try {
      const result = await this.account.functionCall({
        contractId: escrowAddress,
        methodName: 'rescue_funds',
        args: {
          token_id: tokenId,
          amount: amount
        },
        gas: '100000000000000',
        attachedDeposit: '1'
      });

      return result.transaction.hash;
    } catch (error) {
      throw new Error(`Failed to rescue funds: ${error}`);
    }
  }
}