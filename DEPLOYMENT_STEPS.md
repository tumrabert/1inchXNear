# Step-by-Step Contract Deployment

Let's deploy the contracts together! Here are your options:

## Option 1: Deploy via Remix IDE (Easiest & Safest)

### Step 1: Deploy Ethereum Contract

1. **Open Remix IDE**: Go to https://remix.ethereum.org/
2. **Upload contracts**: Create a new workspace and upload these files:
   ```
   - ethereum/src/EscrowSrc.sol
   - ethereum/src/EscrowFactory.sol  
   - ethereum/src/IEscrowSrc.sol
   - ethereum/src/IEscrowFactory.sol
   - ethereum/src/TimelocksLib.sol
   ```

3. **Compile contracts**:
   - Select Solidity Compiler (0.8.19 or higher)
   - Compile all contracts
   - Check for any errors

4. **Deploy EscrowFactory**:
   - Switch to Deploy & Run tab
   - Select "Injected Provider - MetaMask" 
   - Make sure you're on Sepolia testnet in MetaMask
   - Select `EscrowFactory` contract
   - Enter your wallet address as `_owner` parameter
   - Click Deploy
   - **IMPORTANT**: Copy the deployed contract address!

### Step 2: Deploy Near Contract

1. **Install Near CLI** (if not already installed):
   ```bash
   npm install -g near-cli-rs
   ```

2. **Login to Near**:
   ```bash
   near-cli-rs account create-account sponsor-by-faucet-service my-new-account.testnet autogenerate-new-keypair save-to-keychain network-config testnet create
   ```

3. **Build the Near contract**:
   ```bash
   cd near/contracts
   cargo build --target wasm32-unknown-unknown --release
   ```

4. **Deploy to Near testnet**:
   ```bash
   near-cli-rs contract deploy my-new-account.testnet use-file target/wasm32-unknown-unknown/release/fusion_near_escrow.wasm without-init-call network-config testnet sign-with-keychain send
   ```

### Step 3: Update Configuration

Copy the deployed addresses and update them in the code:

```typescript
// In demo/lib/realBlockchainService.ts, update these lines:
export const BLOCKCHAIN_CONFIG = {
  ethereum: {
    // ... other config
    escrowFactoryAddress: 'YOUR_ETHEREUM_CONTRACT_ADDRESS_HERE' // Replace with Remix deployment address
  },
  near: {
    // ... other config  
    escrowContractId: 'YOUR_NEAR_ACCOUNT.testnet' // Replace with your Near account
  }
}
```

---

## Option 2: Deploy via Foundry (Advanced)

If you want to use command line and have Sepolia ETH:

1. **Get your private key from MetaMask**:
   - MetaMask → Account Details → Export Private Key
   - ⚠️ **NEVER share this key!**

2. **Update .env file**:
   ```bash
   cd ethereum
   # Edit .env file with your private key
   PRIVATE_KEY=your_actual_private_key_here
   ```

3. **Deploy via Foundry**:
   ```bash
   ~/.foundry/bin/forge script script/DeployEscrow.s.sol --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY --broadcast --verify
   ```

---

## What You Need:

### For Ethereum:
- MetaMask wallet connected to Sepolia testnet
- Some Sepolia ETH (get from: https://sepoliafaucet.com/)
- About 0.01 ETH should be enough for deployment

### For Near:
- Near testnet account
- Some testnet NEAR tokens (get from faucet when creating account)

---

## Next Steps After Deployment:

1. **Copy contract addresses** from deployment outputs
2. **Update blockchain config** in the demo app
3. **Test the swap interface** with real contracts
4. **Celebrate!** 🎉

Would you like me to help you with any specific step? I can guide you through the Remix deployment or help troubleshoot any issues!