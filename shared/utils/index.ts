/**
 * Cross-chain bridge utilities index
 * 1inch Unite DeFi Hackathon - Ethereum ↔ Near atomic swaps
 */

export * from './bridge';
export * from './ethereum';
export * from './near';
export * from '../types/cross-chain';

// Main orchestrator class
export { BridgeOrchestrator } from './orchestrator';