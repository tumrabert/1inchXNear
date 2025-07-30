# 🏆 1inch Unite Hackathon - Cross-Chain Bridge (COMPLETED)

**🎉 100% COMPLETE - Hackathon Ready Submission**

Revolutionary Ethereum ↔ Near atomic swaps powered by 1inch Fusion+ architecture with professional demo interface.

## 🏗️ Project Structure

```
├── ethereum/           # ✅ Ethereum smart contracts (Solidity)
│   ├── src/           # EscrowSrc, TimelocksLib, EscrowFactory
│   ├── test/          # 7 passing Foundry tests
│   └── scripts/       # Deployment infrastructure
├── near/              # ✅ Near Protocol contracts (Rust)
│   ├── contracts/     # EscrowDst with Merkle tree support
│   └── tests/         # 4 comprehensive test cases
├── shared/            # ✅ TypeScript bridge infrastructure
│   ├── types/         # Cross-chain type definitions
│   └── utils/         # Bridge orchestrator and utilities
├── demo/              # ✅ Professional React/Next.js Demo UI
│   ├── app/           # Interactive swap interface
│   └── components/    # LiveDemo, DeploymentStatus, SwapInterface
└── docs/              # ✅ Complete documentation
    └── ARCHITECTURE.md # Detailed technical specifications
```

## 🎯 Hackathon Goal

**Extend 1inch Fusion+ to Near Protocol** - Build a novel extension for 1inch Cross-chain Swap (Fusion+) that enables swaps between Ethereum and Near.

### Requirements ✅ ALL COMPLETED
- ✅ **Preserve hashlock and timelock functionality** - 7-stage timelock system with keccak256 compatibility
- ✅ **Bidirectional swaps (Ethereum ↔ Near)** - Full bidirectional atomic swap implementation
- ✅ **Onchain execution demo** - Professional React/Next.js demo with live atomic swap visualization

### Stretch Goals ✅ ALL ACHIEVED
- ✅ **User Interface** - Professional demo with interactive swap interface and live demonstration
- ✅ **Enable partial fills** - Complete Merkle tree implementation for percentage-based fills
- ✅ **Relayer and resolver** - Bridge orchestrator with automated state synchronization

## 🚀 Live Demo

Experience the cross-chain bridge in action:

```bash
# Run the professional demo interface
cd demo
npm install
npm run dev
# Open http://localhost:3000
```

**Demo Features:**
- **Interactive Swap Interface**: Execute cross-chain swaps with real-time status
- **Live Atomic Swap Demo**: Step-by-step visualization of the complete swap process
- **Deployment Status**: Real-time monitoring of contract deployments on both chains
- **Partial Fills**: Interactive controls for percentage-based swap execution

## 🏆 Key Achievements

- **🔒 Security**: Atomic execution with hashlock/timelock guarantees
- **🔄 Cross-Chain**: Native Ethereum ↔ Near Protocol compatibility  
- **⚡ Efficient**: Merkle tree-based partial fills for capital efficiency
- **🎨 Professional**: Production-ready demo with enterprise-grade UI
- **📦 Complete**: End-to-end implementation from contracts to user interface

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