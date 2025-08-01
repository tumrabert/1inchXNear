# Smart Contract Deployment Guide

This guide will help you deploy the necessary smart contracts to make the real atomic swaps work.

## Prerequisites

1. **Ethereum Sepolia Testnet Setup:**
   - MetaMask wallet with Sepolia ETH
   - Get Sepolia ETH from: https://sepoliafaucet.com/
   - Infura or Alchemy API key (optional)

2. **Near Testnet Setup:**
   - Near CLI installed: `npm install -g near-cli-rs`
   - Near testnet account created
   - Some NEAR tokens for deployment

## Step 1: Deploy Ethereum Contracts

### Option A: Using Foundry (Recommended)

1. Navigate to the ethereum directory:
   ```bash
   cd ethereum
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env and add your private key and RPC URL
   ```

3. Deploy the contracts:
   ```bash
   forge script script/DeployEscrow.s.sol --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY --broadcast --verify
   ```

4. Note the deployed EscrowFactory address from the output.

### Option B: Using Remix IDE

1. Open https://remix.ethereum.org/
2. Upload the contracts from `ethereum/src/`:
   - `EscrowSrc.sol`
   - `EscrowFactory.sol`
   - `IEscrowSrc.sol`
   - `IEscrowFactory.sol`
   - `TimelocksLib.sol`
3. Compile with Solidity 0.8.19
4. Deploy EscrowFactory with your address as owner
5. Note the deployed contract address

## Step 2: Deploy Near Contracts

1. Build the contract:
   ```bash
   cd near/contracts
   cargo build --target wasm32-unknown-unknown --release
   ```

2. Deploy to Near testnet:
   ```bash
   near-cli-rs contract deploy fusion-escrow.testnet use-file target/wasm32-unknown-unknown/release/fusion_near_escrow.wasm without-init-call network-config testnet sign-with-keychain send
   ```

3. Initialize the contract:
   ```bash
   near-cli-rs contract call-function as-transaction fusion-escrow.testnet new json-args {} prepaid-gas '100.000 TeraGas' attached-deposit '0 NEAR' sign-as your-account.testnet network-config testnet sign-with-keychain send
   ```

## Step 3: Update Configuration

After deploying both contracts, update the addresses in the configuration:

1. Edit `demo/lib/realBlockchainService.ts`
2. Update `BLOCKCHAIN_CONFIG`:
   ```typescript
   ethereum: {
     // ... other config
     escrowFactoryAddress: 'YOUR_DEPLOYED_ETHEREUM_ADDRESS'
   },
   near: {
     // ... other config  
     escrowContractId: 'YOUR_DEPLOYED_NEAR_CONTRACT_ID'
   }
   ```

## Step 4: Test the Application

1. Start the demo application:
   ```bash
   cd demo
   npm run dev
   ```

2. Connect both MetaMask (Sepolia) and Near wallets
3. Try executing a real atomic swap!

## Troubleshooting

### Common Issues:

1. **Gas estimation failed**: Make sure you have enough ETH for gas fees
2. **Contract not found**: Verify the contract addresses are correct
3. **Transaction reverted**: Check if wallets are connected to correct networks
4. **Near transaction failed**: Ensure Near account has sufficient balance

### Getting Help:

- Check transaction hashes on block explorers:
  - Ethereum: https://sepolia.etherscan.io/
  - Near: https://testnet.nearblocks.io/
- Review console logs for detailed error messages

## Security Notice

⚠️ **Never commit private keys to version control!**

The deployed contracts on testnets are for development and testing only. Do not use mainnet private keys or send mainnet tokens to test contracts.

## Next Steps

Once contracts are deployed and working:

1. Test various swap scenarios (ETH → NEAR, NEAR → ETH)
2. Verify atomic properties (both sides complete or both fail)
3. Test edge cases (timeouts, cancellations)
4. Optimize gas usage and transaction flow

Happy swapping! 🚀