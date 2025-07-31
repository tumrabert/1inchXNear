# Real Testnet Deployment Guide

This guide explains how to deploy and test the 1inch Unite Cross-Chain Bridge on real testnets.

## 🚀 Quick Start

### 1. Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/tumrabert/1inchXNear.git
cd 1inchXNear

# Create environment file
cp .env.example .env
# Edit .env with your keys (see below)

# Deploy with Docker
docker-compose up --build
```

### 2. Manual Setup

```bash
# Install dependencies
npm install
cd demo && npm install && cd ..
cd shared && npm install && cd ..

# Build contracts
cd ethereum && forge build && cd ..
cd near/contracts && cargo build --target wasm32-unknown-unknown --release && cd ../..

# Deploy to testnets
node scripts/deploy-testnet-real.js

# Start demo
cd demo && npm run dev
```

## 🔧 Environment Configuration

Create a `.env` file with your testnet credentials:

```bash
# Ethereum Sepolia
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
ETHEREUM_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_WITH_SEPOLIA_ETH

# Near Testnet
NEAR_RPC_URL=https://rpc.testnet.near.org
NEAR_ACCOUNT_ID=your-account.testnet
NEAR_PRIVATE_KEY=YOUR_NEAR_PRIVATE_KEY

# Optional: Custom RPC endpoints
NEXT_PUBLIC_ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
NEXT_PUBLIC_NEAR_RPC_URL=https://rpc.testnet.near.org
```

## 💰 Getting Testnet Tokens

### Ethereum Sepolia
1. Get Sepolia ETH from faucets:
   - https://sepoliafaucet.com/
   - https://faucet.sepolia.dev/
   - https://www.alchemy.com/faucets/ethereum-sepolia

### Near Testnet
1. Create Near testnet account: https://wallet.testnet.near.org/
2. Get test NEAR tokens (automatically provided)

## 🔗 Real Bridge Operations

### Step 1: Connect Wallets
1. Open http://localhost:3000
2. Go to "Wallets" tab
3. Connect MetaMask (Sepolia) and Near Wallet (testnet)

### Step 2: Execute Real Swap
1. Go to "🚀 Real Testnet" tab
2. Enter swap amount (start with small amounts like 0.01 ETH)
3. Click "Execute Real Atomic Swap"
4. Confirm transactions in both wallets
5. Monitor progress in real-time

### Step 3: Verify Transactions
- Check Ethereum transactions: https://sepolia.etherscan.io/
- Check Near transactions: https://explorer.testnet.near.org/

## 📊 Monitoring

### Docker Logs
```bash
# View application logs
docker-compose logs bridge-app

# View deployment logs
docker-compose --profile deploy logs deployer
```

### Health Checks
```bash
# Check contract deployment
curl http://localhost:3000/api/health

# Check wallet connections
curl http://localhost:3000/api/wallets/status
```

## 🔍 Troubleshooting

### Common Issues

1. **MetaMask Connection Failed**
   - Ensure you're on Sepolia testnet (Chain ID: 11155111)
   - Clear MetaMask cache and reconnect

2. **Insufficient Balance**
   - Get more testnet tokens from faucets
   - Check minimum balance requirements (0.1 ETH recommended)

3. **Transaction Failed**
   - Check gas settings in MetaMask
   - Verify contract addresses are correct
   - Try smaller amounts first

4. **Near Wallet Issues**
   - Ensure you're using testnet wallet
   - Check account has sufficient NEAR balance
   - Verify contract permissions

### Debug Mode

Enable debug mode for detailed logs:

```bash
# Set debug environment
DEBUG=1inch:* npm run dev

# Or with Docker
docker-compose up -e DEBUG=1inch:*
```

## 🔐 Security Notes

### Testnet Only
- **NEVER use mainnet private keys**
- **NEVER send real funds to test contracts**
- Only use testnet tokens and accounts

### Private Key Safety
- Store private keys securely
- Use environment variables, never commit keys
- Consider using hardware wallets for production

## 📈 Performance Testing

### Load Testing
```bash
# Test multiple concurrent swaps
npm run test:load

# Monitor resource usage
docker stats
```

### Metrics Collection
```bash
# Start monitoring stack
docker-compose --profile monitoring up

# View metrics at http://localhost:9090
```

## 🎯 Success Criteria

A successful testnet deployment should demonstrate:

1. ✅ **Wallet Connectivity**: Both Ethereum and Near wallets connected
2. ✅ **Contract Deployment**: All contracts deployed and verified
3. ✅ **Atomic Swaps**: End-to-end swap execution with real transactions
4. ✅ **Security**: Proper hashlock/timelock validation
5. ✅ **UI Integration**: Real-time status updates and transaction tracking

## 🚀 Production Deployment

Once testnet testing is complete:

1. Update contracts for mainnet deployment
2. Configure mainnet RPC endpoints
3. Implement additional security measures
4. Set up monitoring and alerting
5. Conduct security audit

## 📞 Support

For issues or questions:
- GitHub Issues: https://github.com/tumrabert/1inchXNear/issues
- Documentation: See ARCHITECTURE.md for technical details
- Demo Video: Record your successful testnet swaps!