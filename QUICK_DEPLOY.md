# Quick Contract Deployment Guide

Let's get your contracts deployed quickly! Here's the simplest approach:

## Prerequisites Check ✅

1. **MetaMask Setup:**
   - Switch to Sepolia testnet
   - Get some Sepolia ETH from https://sepoliafaucet.com/
   - You need ~0.01 ETH for deployment

2. **Near Setup:**
   - Install Near CLI: `npm install -g near-cli-rs`
   - Create testnet account if needed

## Step 1: Deploy Ethereum Contract (Remix - 5 minutes)

### Upload Files to Remix:
1. Go to https://remix.ethereum.org/
2. Create new workspace called "1inch-bridge"
3. Upload these files by copying and pasting:

**File: contracts/EscrowFactory.sol**
```solidity
// Copy the entire contents of ethereum/src/EscrowFactory.sol
```

**File: contracts/EscrowSrc.sol** 
```solidity
// Copy the entire contents of ethereum/src/EscrowSrc.sol
```

**File: contracts/IEscrowFactory.sol**
```solidity
// Copy the entire contents of ethereum/src/IEscrowFactory.sol
```

**File: contracts/IEscrowSrc.sol**
```solidity
// Copy the entire contents of ethereum/src/IEscrowSrc.sol
```

**File: contracts/TimelocksLib.sol**
```solidity
// Copy the entire contents of ethereum/src/TimelocksLib.sol
```

### Deploy in Remix:
1. Compile tab → Select Solidity 0.8.19+ → Compile all
2. Deploy tab → Select "Injected Provider - MetaMask"
3. Make sure MetaMask is on Sepolia testnet
4. Select `EscrowFactory` contract
5. In constructor field, enter your MetaMask address (the one that will own the factory)
6. Set value to 1 wei (required for reference implementation)
7. Click Deploy
8. **COPY THE CONTRACT ADDRESS** from the deployment result

## Step 2: Deploy Near Contract (Command Line - 2 minutes)

```bash
# Navigate to Near contracts
cd /Users/tumrabert/local-workspace/sandbox/1inch/near/contracts

# Build the contract
cargo build --target wasm32-unknown-unknown --release

# Deploy (replace YOUR-ACCOUNT with your Near testnet account)
near-cli-rs contract deploy YOUR-ACCOUNT.testnet use-file target/wasm32-unknown-unknown/release/fusion_near_escrow.wasm without-init-call network-config testnet sign-with-keychain send
```

## Step 3: Update Contract Addresses (1 minute)

Edit the file: `demo/lib/realBlockchainService.ts`

Find this section and update the addresses:

```typescript
export const BLOCKCHAIN_CONFIG = {
  ethereum: {
    chainId: '0xaa36a7', // Sepolia
    chainName: 'Sepolia Test Network',
    rpcUrl: 'https://sepolia.infura.io/v3/',
    explorerUrl: 'https://sepolia.etherscan.io',
    escrowFactoryAddress: 'PASTE_YOUR_ETHEREUM_ADDRESS_HERE' // <-- UPDATE THIS
  },
  near: {
    networkId: 'testnet',
    rpcUrl: 'https://rpc.testnet.near.org',
    explorerUrl: 'https://testnet.nearblocks.io',
    walletUrl: 'https://testnet.mynearwallet.com',
    escrowContractId: 'YOUR-ACCOUNT.testnet' // <-- UPDATE THIS
  }
}
```

## Step 4: Test It! 🚀

1. Start the demo: `npm run dev`
2. Open http://localhost:3001
3. Connect both MetaMask (Sepolia) and Near wallets
4. The warning should disappear!
5. Try a small test swap (0.001 ETH ↔ equivalent NEAR)

## Troubleshooting

### Common Issues:
- **"Insufficient funds"**: Get more Sepolia ETH from faucet
- **"Transaction reverted"**: Make sure you're on Sepolia testnet
- **"Contract not found"**: Double-check the contract address in config

### Success Indicators:
- ✅ No "Contracts Not Deployed" warning
- ✅ Exchange rates loading properly  
- ✅ Equivalent amounts calculating correctly
- ✅ Swap button enabled when both wallets connected

---

**Need help?** Let me know which step you're on and I'll guide you through it! 🤝