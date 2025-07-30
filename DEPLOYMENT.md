# 🚀 Deployment Guide - 1inch Unite Cross-Chain Bridge

## Quick Start

1. **Copy environment file**:
   ```bash
   cp .env.example .env
   ```

2. **Fill in your credentials** in `.env` (see sections below)

3. **Install dependencies**:
   ```bash
   npm run setup:deps
   ```

4. **Build all contracts**:
   ```bash
   npm run build
   ```

5. **Deploy to both testnets**:
   ```bash
   npm run deploy
   ```

6. **Verify deployment**:
   ```bash
   npm run verify
   ```

7. **Run demo**:
   ```bash
   npm run demo
   ```

## 📋 Required Credentials & Setup

### 🔷 Ethereum Sepolia Testnet

1. **Get Sepolia ETH**:
   - Visit [Sepolia Faucet](https://sepoliafaucet.com/)
   - Or [Alchemy Faucet](https://sepoliafaucet.com/)
   - Need at least 0.01 ETH for deployment

2. **RPC URL**:
   - **Infura**: `https://sepolia.infura.io/v3/YOUR_PROJECT_ID`
   - **Alchemy**: `https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY`
   - **QuickNode**: Get from [QuickNode](https://www.quicknode.com/)

3. **Private Key**:
   - Export from MetaMask: Settings → Security & Privacy → Export Private Key
   - **⚠️ NEVER share your mainnet private key! Use a testnet-only wallet**

4. **Etherscan API Key** (optional):
   - Get from [Etherscan](https://etherscan.io/apis)
   - Used for contract verification

### 🔶 Near Testnet

1. **Create Near Testnet Account**:
   - Visit [Near Wallet Testnet](https://wallet.testnet.near.org)
   - Create account (e.g., `your-name.testnet`)
   - Get free testnet NEAR tokens

2. **Export Private Key**:
   ```bash
   # Install Near CLI
   npm install -g near-cli
   
   # Login and export
   near login
   near export-account your-account.testnet
   ```

3. **Account Requirements**:
   - Need at least 2 NEAR for contract deployment
   - Account must be funded and active

### 📝 Environment Variables

Fill these in your `.env` file:

```bash
# Ethereum Sepolia
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
ETHEREUM_PRIVATE_KEY=0x1234...  # Your wallet private key
ETHERSCAN_API_KEY=ABC123...     # Optional, for verification

# Near Testnet  
NEAR_ACCOUNT_ID=your-account.testnet
NEAR_PRIVATE_KEY=ed25519:1234...  # From near export-account
NEAR_NETWORK_ID=testnet
NEAR_NODE_URL=https://rpc.testnet.near.org

# Optional: Adjust these for testing
ETHEREUM_SAFETY_DEPOSIT_ETH=0.001  # Smaller for testing
NEAR_SAFETY_DEPOSIT_NEAR=0.1       # Smaller for testing
DEFAULT_TIMELOCK_DURATION=1800     # 30 minutes for testing
```

## 🛠️ Step-by-Step Deployment

### 1. Build Contracts

```bash
# Build all contracts
npm run build

# Or build individually:
npm run build:ethereum  # Solidity contracts
npm run build:near      # Rust/WASM contracts  
npm run build:shared    # TypeScript bridge
```

### 2. Deploy Ethereum Contracts

```bash
# Deploy to Sepolia
npm run deploy:ethereum
```

This will:
- Deploy `TimelocksLib` library
- Deploy `EscrowFactory` contract
- Link library to factory
- Save deployment info to `ethereum/deployments/sepolia.json`

### 3. Deploy Near Contracts

```bash
# Deploy to Near testnet
npm run deploy:near
```

This will:
- Build WASM contract
- Deploy factory contract
- Create sample escrow for testing
- Save deployment info to `near/deployments/testnet.json`

### 4. Full Cross-Chain Deployment

```bash
# Deploy to both networks
npm run deploy:all
```

This will:
- Deploy Ethereum contracts
- Deploy Near contracts  
- Configure cross-chain bridge
- Save complete deployment to `deployments/cross-chain.json`
- Generate demo environment config

## ✅ Verification

### Verify Deployment

```bash
npm run verify
```

This checks:
- ✅ Contracts deployed successfully
- ✅ Contracts are accessible  
- ✅ Account balances sufficient
- ✅ Cross-chain bridge configured

### Manual Verification

**Ethereum Sepolia**:
- Check contract on [Sepolia Etherscan](https://sepolia.etherscan.io)
- Verify factory contract address matches deployment

**Near Testnet**:
- Check contract on [Near Explorer](https://explorer.testnet.near.org)
- Verify factory contract ID matches deployment

## 🧪 Testing

### Run Integration Tests

```bash
# All tests
npm test

# Specific tests
npm run test:ethereum     # Forge tests
npm run test:near        # Rust tests  
npm run test:shared      # TypeScript tests
npm run test:integration # End-to-end tests
```

### Demo Script

```bash
# Interactive demo
npm run demo
```

This demonstrates:
- Ethereum → Near atomic swap
- Near → Ethereum atomic swap  
- Partial fill operations
- Error handling scenarios

## 🎭 Demo UI (Optional)

### Build Demo Interface

```bash
npm run build:demo-ui
npm run dev:demo
```

Starts React demo at `http://localhost:3000`

## 📊 Deployment Files

After successful deployment, you'll have:

```
deployments/
├── cross-chain.json      # Complete deployment info
ethereum/deployments/
├── sepolia.json         # Ethereum contract addresses
near/deployments/  
├── testnet.json         # Near contract addresses
demo/
├── .env.demo           # Auto-generated demo config
```

## 🔧 Troubleshooting

### Common Issues

**❌ "Insufficient ETH balance"**
- Get more Sepolia ETH from faucets
- Check wallet address has funds

**❌ "Near account not found"**
- Ensure account exists on testnet
- Check account ID spelling
- Verify private key format

**❌ "Contract artifacts not found"**
- Run `npm run build` first
- Check Forge/Cargo installed correctly

**❌ "RPC connection failed"**
- Check RPC URL is correct
- Try different RPC provider
- Verify network connectivity

### Reset Deployment

```bash
# Clean and rebuild everything
npm run clean
npm run build
npm run deploy
```

### Debug Mode

```bash
# Enable verbose logging
DEBUG=true npm run deploy
```

## 🏆 Hackathon Demo Ready!

Once deployed successfully:

1. ✅ **Contracts**: Deployed on both testnets
2. ✅ **Bridge**: Cross-chain infrastructure ready  
3. ✅ **Tests**: All scenarios verified
4. ✅ **Demo**: Interactive demonstration available

**Your 1inch Unite submission is ready! 🎉**

## 📞 Support

If you encounter issues:

1. Check this troubleshooting guide
2. Verify all prerequisites are met
3. Review deployment logs for specific errors
4. Ensure testnet accounts are properly funded

## 🔐 Security Notes

- ⚠️ **Never use mainnet private keys for testing**
- ⚠️ **Keep .env file secure and never commit it**
- ⚠️ **Use testnet-only wallets and accounts**
- ⚠️ **Verify all contract addresses before interacting**

## 🎯 Next Steps After Deployment

1. **Test atomic swaps** with small amounts
2. **Demo partial fills** for judges
3. **Show cross-chain compatibility** 
4. **Highlight 1inch Fusion+ integration**

**Good luck with your 1inch Unite Hackathon! 🏆**