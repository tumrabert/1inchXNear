# 🤝 Contributing to 1inch Unite Cross-Chain Bridge

Welcome to the 1inch Unite Hackathon project! We appreciate your interest in contributing to this revolutionary Ethereum ↔ Near atomic swap implementation.

## 🚀 Quick Start

### Prerequisites
- **Node.js**: 20.0.0 or higher
- **Rust**: 1.88.0 or higher with `wasm32-unknown-unknown` target
- **Docker**: Latest version (optional but recommended)
- **Git**: For version control

### Development Setup

```bash
# Clone the repository
git clone https://github.com/tumrabert/1inchXNear.git
cd 1inchXNear

# Install dependencies
npm install
cd demo && npm install && cd ..
cd shared && npm install && cd ..

# Install Rust target for Near contracts
rustup target add wasm32-unknown-unknown

# Install Foundry for Ethereum development
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your testnet credentials
# See TESTNET_DEPLOYMENT.md for detailed setup
```

## 🏗️ Project Structure

```
├── ethereum/           # Ethereum smart contracts (Solidity)
│   ├── src/           # Contract source files
│   ├── test/          # Foundry tests
│   └── scripts/       # Deployment scripts
├── near/              # Near Protocol contracts (Rust)
│   ├── contracts/     # Contract source files
│   └── tests/         # Contract tests
├── shared/            # TypeScript bridge infrastructure
│   ├── types/         # Type definitions
│   ├── utils/         # Bridge utilities
│   └── tests/         # Integration tests
├── demo/              # React/Next.js demo interface
│   ├── app/           # Next.js app router
│   ├── components/    # React components
│   └── lib/           # Utility libraries
└── scripts/           # Deployment and automation scripts
```

## 🛠️ Development Workflow

### 1. Smart Contract Development

#### Ethereum Contracts
```bash
# Navigate to ethereum directory
cd ethereum

# Compile contracts
forge build

# Run tests
forge test

# Deploy to testnet
forge script script/Deploy.s.sol --rpc-url $ETHEREUM_RPC_URL --broadcast
```

#### Near Contracts
```bash
# Navigate to near contracts
cd near/contracts

# Build contracts
cargo near build

# Run tests
cargo test

# Deploy to testnet
cargo near deploy --account-id your-account.testnet
```

### 2. Bridge Infrastructure Development

```bash
# Navigate to shared directory
cd shared

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Run integration tests
npm run test:integration
```

### 3. Demo Interface Development

```bash
# Navigate to demo directory
cd demo

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
```

## 🧪 Testing Guidelines

### Testing Standards
- **Unit Tests**: Every function should have unit tests
- **Integration Tests**: Cross-chain scenarios must be tested
- **Contract Tests**: All smart contract functions require tests
- **UI Tests**: Critical user flows should be tested

### Running Tests

```bash
# Run all Ethereum tests
cd ethereum && forge test

# Run all Near tests
cd near/contracts && cargo test

# Run TypeScript/JavaScript tests
cd shared && npm test
cd demo && npm test

# Run integration tests
cd shared && npm run test:integration
```

### Test Coverage Requirements
- **Minimum Coverage**: 80% for all new code
- **Critical Functions**: 100% coverage required
- **Edge Cases**: Must include failure scenario tests
- **Cross-Chain**: Integration tests for all swap scenarios

## 📝 Code Style Guidelines

### Solidity Style
- Follow [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html)
- Use explicit function visibility
- Include comprehensive NatSpec documentation
- Gas optimization is important but not at the expense of readability

```solidity
// Good example
/**
 * @notice Withdraws tokens using the provided secret
 * @param secret The preimage of the hashlock
 * @dev Only callable during appropriate timelock stage
 */
function withdraw(bytes32 secret) external onlyTaker notWithdrawn {
    require(keccek256(abi.encode(secret)) == hashlock, "Invalid secret");
    // Implementation...
}
```

### Rust Style
- Follow [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- Use `cargo fmt` for formatting
- Include comprehensive documentation comments
- Optimize for WASM binary size

```rust
/// Withdraws tokens using the provided secret
/// 
/// # Arguments
/// * `secret` - The preimage of the hashlock as hex string
/// 
/// # Returns
/// Promise that resolves when withdrawal is complete
pub fn withdraw(&mut self, secret: String) -> Promise {
    require!(self.validate_secret(&secret), "Invalid secret");
    // Implementation...
}
```

### TypeScript Style
- Use Prettier for formatting
- Follow ESLint configuration
- Prefer explicit types over `any`
- Use meaningful variable names

```typescript
// Good example
interface SwapConfiguration {
    readonly srcChain: ChainId;
    readonly dstChain: ChainId;
    readonly amount: BigNumber;
    readonly secret: string;
}

async function executeAtomicSwap(config: SwapConfiguration): Promise<SwapResult> {
    // Implementation...
}
```

### React/Next.js Style
- Use functional components with hooks
- Follow React best practices
- Implement proper error boundaries
- Use TypeScript for all components

```tsx
// Good example
interface SwapInterfaceProps {
    onSwapComplete: (result: SwapResult) => void;
    initialConfig?: SwapConfiguration;
}

export function SwapInterface({ onSwapComplete, initialConfig }: SwapInterfaceProps) {
    // Implementation...
}
```

## 🔧 Tools and Commands

### Useful Development Commands

```bash
# Format all code
npm run format

# Lint all code
npm run lint

# Type check TypeScript
npm run type-check

# Build all components
npm run build

# Run full test suite
npm run test:all

# Deploy to testnet
npm run deploy:testnet

# Start demo in development mode
npm run dev

# Build and start with Docker
docker-compose up --build
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add your feature description"

# Push to origin
git push origin feature/your-feature-name

# Create pull request
```

## 📋 Pull Request Process

### Before Submitting
1. **Test Everything**: Run the full test suite
2. **Update Documentation**: Update relevant docs if needed
3. **Check Code Style**: Ensure all linting passes
4. **Build Successfully**: Verify clean builds
5. **Test Deployment**: Test on local/testnet if applicable

### PR Requirements
- **Clear Description**: Explain what changes were made and why
- **Test Coverage**: Include tests for new functionality
- **Documentation**: Update docs for API changes
- **No Breaking Changes**: Unless explicitly discussed
- **Small Focused Changes**: Prefer smaller, focused PRs

### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

## 🐛 Issue Reporting

### Bug Reports
Include:
- **Environment**: OS, Node version, browser, etc.
- **Steps to Reproduce**: Clear, numbered steps
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Screenshots**: If applicable
- **Error Logs**: Console errors or stack traces

### Feature Requests
Include:
- **Use Case**: Why is this feature needed
- **Proposed Solution**: How you envision it working
- **Alternative Solutions**: Other approaches considered
- **Implementation Ideas**: Technical suggestions if any

## 🔐 Security Guidelines

### Security Best Practices
- **Never commit private keys** or sensitive data
- **Use environment variables** for configuration
- **Validate all inputs** thoroughly
- **Follow principle of least privilege**
- **Keep dependencies updated**

### Testnet Safety
- **Only use testnet tokens** for development
- **Never use mainnet private keys** in development
- **Mark testnet clearly** in all interfaces
- **Provide faucet links** for testnet tokens

## 📚 Learning Resources

### Technical Documentation
- **Ethereum Development**: [Foundry Book](https://book.getfoundry.sh/)
- **Near Protocol**: [Near Docs](https://docs.near.org/)
- **Cross-Chain**: [1inch Fusion+ Docs](https://docs.1inch.io/)
- **React/Next.js**: [Next.js Docs](https://nextjs.org/docs)

### Project Specific
- **ARCHITECTURE.md**: Technical implementation details
- **TESTNET_DEPLOYMENT.md**: Deployment and testing guide
- **README.md**: Project overview and quick start

## 🎯 Hackathon Context

This project was built for the **1inch Unite Hackathon** with a **$32,000 bounty**. Key goals:
- Extend 1inch Fusion+ to Near Protocol
- Preserve hashlock/timelock functionality
- Enable bidirectional atomic swaps
- Provide real onchain execution demo

## 📞 Getting Help

### Community Support
- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For general questions
- **Code Review**: Submit PRs for feedback

### Development Support
- **Architecture Questions**: See ARCHITECTURE.md
- **Deployment Issues**: See TESTNET_DEPLOYMENT.md
- **Setup Problems**: Check environment configuration

## 🏆 Recognition

Contributors will be recognized in:
- **README.md**: Contributor acknowledgments
- **Git History**: Permanent commit record
- **Hackathon Submission**: Team member attribution

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

**Thank You for Contributing! 🚀**

Your contributions help advance cross-chain DeFi and make atomic swaps between Ethereum and Near Protocol a reality.