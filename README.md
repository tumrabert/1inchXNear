# 1inch Fusion+ to Near Protocol Extension

Cross-chain atomic swap implementation enabling bidirectional token swaps between Ethereum and Near Protocol.

## 🏗️ Project Structure

```
├── ethereum/           # Ethereum smart contracts (Solidity)
│   ├── src/           # Contract source files
│   ├── test/          # Foundry tests
│   └── script/        # Deployment scripts
├── near/              # Near Protocol contracts (Rust)
│   ├── contracts/     # Contract source files
│   └── tests/         # Near contract tests
├── shared/            # Shared utilities and types
│   ├── types/         # Common type definitions
│   └── utils/         # Cross-chain utilities
└── docs/              # Documentation
    └── ARCHITECTURE.md # Technical architecture details
```

## 🎯 Hackathon Goal

**Extend 1inch Fusion+ to Near Protocol** - Build a novel extension for 1inch Cross-chain Swap (Fusion+) that enables swaps between Ethereum and Near.

### Requirements ✅
- [x] Preserve hashlock and timelock functionality for non-EVM implementation
- [x] Bidirectional swaps (Ethereum ↔ Near)
- [ ] Onchain execution demo (mainnet or testnet)

### Stretch Goals 🎯
- [ ] User Interface
- [ ] Enable partial fills
- [ ] Relayer and resolver implementation

## 🛠️ Development Setup

### Prerequisites
- Rust 1.88.0+ with wasm32-unknown-unknown target
- Node.js 20+ with npm
- Foundry (forge, cast, anvil)
- NEAR CLI-RS

### Installation
```bash
# Clone repository
git clone <repo-url>
cd 1inch-fusion-near

# Install Ethereum dependencies
cd ethereum && npm install

# Install Near dependencies  
cd ../near/contracts && cargo build --target wasm32-unknown-unknown --release

# Install shared dependencies
cd ../../shared && npm install
```

## 🚀 Quick Start

### Ethereum Side
```bash
cd ethereum
forge build
forge test
```

### Near Side
```bash
cd near/contracts
cargo test
cargo build --target wasm32-unknown-unknown --release
```

## 📖 Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed technical specifications including:
- Cross-chain atomic swap mechanism
- Hashlock/timelock adaptations for Near
- Safety deposit economics
- Partial fill implementation with Merkle trees

## 🔗 Resources

- **1inch Documentation**: https://portal.1inch.dev/documentation/overview
- **Near Protocol Docs**: https://docs.near.org/
- **Hackathon Details**: https://ethglobal.com/events/unite/prizes/1inch

## 🏆 Bounty Information

**Prize**: $32,000 for extending Fusion+ to Near Protocol
**Event**: 1inch Unite DeFi Hackathon via ETHGlobal

## 📝 License

MIT License - see LICENSE file for details