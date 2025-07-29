# Contributing to 1inch Fusion+ Near Extension

## Branch Management Strategy

### Main Branches
- **`main`**: Production-ready code, stable releases
- **`develop`**: Integration branch for features, pre-release testing

### Feature Branches
- **`feature/ethereum-contracts`**: Ethereum EscrowSrc and Factory implementation
- **`feature/near-contracts`**: Near EscrowDst and Factory implementation  
- **`feature/cross-chain-bridge`**: Cross-chain communication layer
- **`feature/partial-fills`**: Merkle tree implementation for partial fills
- **`feature/testing`**: Integration tests and test scenarios
- **`feature/ui`**: Frontend interface (stretch goal)
- **`feature/relayer`**: Relayer and resolver implementation (stretch goal)

### Release Branches
- **`release/v0.1.0`**: Hackathon demo release
- **`release/v0.2.0`**: Post-hackathon improvements

### Hotfix Branches
- **`hotfix/*`**: Critical fixes for deployed contracts

## Workflow

### 1. Feature Development
```bash
# Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/ethereum-contracts

# Work on feature
git add .
git commit -m "feat: implement EscrowSrc contract with hashlock mechanism"

# Push feature branch
git push origin feature/ethereum-contracts
```

### 2. Pull Request Process
1. Create PR from feature branch to `develop`
2. Ensure all tests pass
3. Code review by team members
4. Merge to `develop` after approval

### 3. Release Process
```bash
# Create release branch
git checkout develop
git checkout -b release/v0.1.0

# Final testing and bug fixes
git commit -m "fix: adjust timelock calculations for testnet"

# Merge to main
git checkout main
git merge release/v0.1.0
git tag v0.1.0

# Merge back to develop
git checkout develop
git merge main
```

## Commit Message Convention

### Format
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

### Examples
```bash
feat(ethereum): implement EscrowSrc withdrawal mechanism
fix(near): correct timelock stage calculation
docs(architecture): update cross-chain flow diagrams
test(integration): add atomic swap test scenarios
```

## Development Guidelines

### Ethereum Contracts
- Follow Solidity style guide
- Use OpenZeppelin standards where applicable
- Comprehensive test coverage with Foundry
- Gas optimization considerations

### Near Contracts
- Follow Rust conventions
- Use near-sdk best practices
- Include inline unit tests
- Handle errors gracefully

### Testing
- Unit tests for individual contracts
- Integration tests for cross-chain flows
- Gas usage optimization
- Security audit preparation

## Code Review Checklist

### General
- [ ] Code follows style guidelines
- [ ] Comprehensive test coverage
- [ ] Documentation updated
- [ ] No security vulnerabilities

### Smart Contracts
- [ ] Proper access controls
- [ ] Safe math operations
- [ ] Reentrancy protection
- [ ] Gas efficiency optimized

### Cross-Chain
- [ ] Hashlock compatibility preserved
- [ ] Timelock mechanisms correct
- [ ] Atomic properties maintained
- [ ] Failure recovery tested

## Deployment Strategy

### Testnets
1. **Ethereum Sepolia**: Test EscrowSrc contracts
2. **Near Testnet**: Test EscrowDst contracts
3. **Cross-chain**: Integration testing

### Mainnet (Post-Hackathon)
1. Security audit completion
2. Community review period
3. Gradual rollout with monitoring
4. Documentation and tutorials

## Emergency Procedures

### Critical Bug Discovery
1. Create hotfix branch immediately
2. Fix and test thoroughly
3. Emergency deployment process
4. Post-mortem analysis

### Security Issues
1. Private disclosure to team
2. Coordinate fix development
3. Responsible disclosure timeline
4. User communication plan