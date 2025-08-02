#!/bin/bash

# Deploy 1inch Fusion+ Near Escrow Contract to Near Testnet

echo "🌿 Deploying 1inch Fusion+ Near Escrow Contract..."

# Build the contract
echo "📦 Building WASM contract..."
cd fusion-escrow
cargo build --target wasm32-unknown-unknown --release

# Check if build succeeded
if [ ! -f "target/wasm32-unknown-unknown/release/fusion_escrow.wasm" ]; then
    echo "❌ Build failed - WASM file not found"
    exit 1
fi

echo "✅ WASM contract built successfully"

# Deploy to Near testnet
echo "🚀 Deploying to Near testnet..."

# Set contract account (replace with your actual account)
CONTRACT_ACCOUNT="fusion-escrow-1inch.testnet"

# Login to Near (if not already logged in)
echo "🔐 Ensure you're logged in to Near CLI..."
near login

# Create subaccount for contract (if it doesn't exist)
echo "🏗️ Creating contract subaccount..."
near create-account $CONTRACT_ACCOUNT --masterAccount $NEAR_ACCOUNT_ID --initialBalance 10

# Deploy the contract
echo "📤 Deploying contract..."
near deploy --accountId $CONTRACT_ACCOUNT --wasmFile target/wasm32-unknown-unknown/release/fusion_escrow.wasm

# Initialize the contract
echo "🎬 Initializing contract..."
near call $CONTRACT_ACCOUNT new '{}' --accountId $CONTRACT_ACCOUNT

# Show contract info
echo "✅ Contract deployed successfully!"
echo "📍 Contract Account: $CONTRACT_ACCOUNT"
echo "🌐 Explorer: https://testnet.nearblocks.io/account/$CONTRACT_ACCOUNT"

# Test the contract
echo "🧪 Testing contract functions..."

# Test authorization
echo "Testing resolver authorization..."
near call $CONTRACT_ACCOUNT authorize_resolver '{"resolver": "'$NEAR_ACCOUNT_ID'"}' --accountId $CONTRACT_ACCOUNT

# Check authorization
near view $CONTRACT_ACCOUNT is_authorized_resolver '{"resolver": "'$NEAR_ACCOUNT_ID'"}'

echo "🎉 Deployment and testing complete!"
echo ""
echo "📋 Contract Functions:"
echo "  - create_eth_to_near_order(ethereum_order_hash, maker, hashlock, deadline_seconds)"
echo "  - create_near_to_eth_order(ethereum_order_hash, resolver, hashlock, deadline_seconds)"
echo "  - claim_with_secret(ethereum_order_hash, secret)"
echo "  - cancel_order(ethereum_order_hash)"
echo "  - get_order(ethereum_order_hash)"
echo ""
echo "🔗 Integration with Ethereum contracts:"
echo "  - SimpleLimitOrderProtocol: 0x45406E6742247DD5535D8FC22B19b93Dc543b6Ef"
echo "  - FusionNearExtension: 0xBc5124B5ebd36Dc45C79162c060D0F590b50d170"