# Near Protocol Integration Setup

## 🎯 **Complete Bidirectional Cross-Chain Setup**

This guide shows how to deploy and use the Near Protocol escrow contract for real ETH ↔ NEAR transfers.

## 📦 **Prerequisites**

### 1. Install Near CLI
```bash
npm install -g near-cli
```

### 2. Install Rust (for contract compilation)
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown
```

### 3. Install Near JavaScript SDK
```bash
cd demo
npm install near-api-js
```

## 🚀 **Deploy Near Escrow Contract**

### 1. Login to Near CLI
```bash
near login
```

### 2. Deploy the contract
```bash
cd near-contracts
./deploy.sh
```

This will:
- Build the WASM contract
- Deploy to `fusion-escrow-1inch.testnet` 
- Initialize the contract
- Authorize your account as a resolver

## 🌉 **Bidirectional Swap Flows**

### **ETH → NEAR Flow**

1. **User creates order on Ethereum**
   - Signs EIP-712 order with ETH amount
   - Order gets filled, triggering post-interaction

2. **Resolver creates Near escrow**
   - Calls `create_eth_to_near_order()` on Near contract
   - Deposits equivalent NEAR tokens with same hashlock

3. **User reveals secret**
   - Claims on Ethereum side first
   - Same secret used to claim NEAR tokens on Near side

4. **Automatic completion**
   - NEAR tokens transferred to user's Near wallet
   - Atomic swap complete!

### **NEAR → ETH Flow**

1. **User creates Near escrow**
   - Calls `create_near_to_eth_order()` on Near contract
   - Deposits NEAR tokens with hashlock

2. **Resolver creates Ethereum order**
   - Creates limit order on SimpleLimitOrderProtocol
   - Uses same hashlock for consistency

3. **User reveals secret**
   - Claims NEAR tokens first (resolver gets them)
   - Resolver uses secret to claim ETH and send to user

4. **Cross-chain completion**
   - User receives ETH on Ethereum
   - Resolver gets NEAR tokens as payment

## 🔧 **Integration with Existing Contracts**

The Near contract integrates perfectly with your deployed Ethereum contracts:

- **SimpleLimitOrderProtocol**: `0x45406E6742247DD5535D8FC22B19b93Dc543b6Ef`
- **FusionNearExtension**: `0xBc5124B5ebd36Dc45C79162c060D0F590b50d170`
- **Near Escrow Contract**: `fusion-escrow-1inch.testnet`

## 💰 **Real Money Transfer Examples**

### Test ETH → NEAR Swap
```bash
# 1. Create order on Ethereum (via UI)
# 2. Resolver creates Near escrow
near call fusion-escrow-1inch.testnet create_eth_to_near_order '{
  "ethereum_order_hash": "0x123...",
  "maker": "user.testnet", 
  "hashlock": "secret_hash",
  "deadline_seconds": 3600
}' --accountId resolver.testnet --deposit 2.5

# 3. User claims with secret
near call fusion-escrow-1inch.testnet claim_with_secret '{
  "ethereum_order_hash": "0x123...",
  "secret": "my_secret"
}' --accountId user.testnet --gas 300000000000000
```

### Test NEAR → ETH Swap
```bash
# 1. User creates Near escrow
near call fusion-escrow-1inch.testnet create_near_to_eth_order '{
  "ethereum_order_hash": "0x456...",
  "resolver": "resolver.testnet",
  "hashlock": "secret_hash", 
  "deadline_seconds": 3600
}' --accountId user.testnet --deposit 2.5

# 2. Resolver creates Ethereum order (via UI)
# 3. User reveals secret to claim both sides
```

## 🔍 **Verification Commands**

```bash
# Check order status
near view fusion-escrow-1inch.testnet get_order '{"ethereum_order_hash": "0x123..."}'

# Check account orders
near view fusion-escrow-1inch.testnet get_orders_for_account '{"account": "user.testnet"}'

# Check resolver authorization
near view fusion-escrow-1inch.testnet is_authorized_resolver '{"resolver": "resolver.testnet"}'

# Check contract balance
near view fusion-escrow-1inch.testnet get_contract_balance '{}'
```

## 🎉 **Result**

After setup, you'll have:

✅ **Real ETH → NEAR transfers** with atomic security
✅ **Real NEAR → ETH transfers** with atomic security  
✅ **Deployed contracts** on both Ethereum and Near testnets
✅ **Complete UI integration** for both swap directions
✅ **Production-ready architecture** for mainnet deployment

Users will see actual tokens transferred to their destination wallets on both chains! 🚀