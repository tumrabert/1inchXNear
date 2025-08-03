#!/bin/bash

# 🚀 DEPLOY NEAR ESCROW CONTRACT USING NEAR CLI
# This bypasses RPC rate limits by using Near CLI directly

echo "🚀 === DEPLOYING NEAR ESCROW CONTRACT WITH CLI ==="
echo ""

# Load environment variables
source ../.env

# Check if we're logged in
echo "🔐 Checking Near CLI login status..."
if ! near account state $NEAR_RESOLVER_ACCOUNT_ID --network testnet > /dev/null 2>&1; then
    echo "❌ Not logged in to Near CLI!"
    echo "💡 Please run: near login"
    echo "   Then select your resolver account: $NEAR_RESOLVER_ACCOUNT_ID"
    exit 1
fi

echo "✅ Logged in as: $NEAR_RESOLVER_ACCOUNT_ID"

# Check deployer balance
echo ""
echo "💰 Checking deployer balance..."
near account state $NEAR_RESOLVER_ACCOUNT_ID --network testnet

# Create contract account name
TIMESTAMP=$(date +%s)
CONTRACT_ACCOUNT="fusion-escrow-$TIMESTAMP.$NEAR_RESOLVER_ACCOUNT_ID"

echo ""
echo "📋 Deployment Details:"
echo "  Deployer: $NEAR_RESOLVER_ACCOUNT_ID"
echo "  Contract: $CONTRACT_ACCOUNT"
echo "  Network: testnet"

# Check if WASM file exists
WASM_FILE="fusion-escrow/target/wasm32-unknown-unknown/release/fusion_escrow.wasm"
if [ ! -f "$WASM_FILE" ]; then
    echo "❌ WASM file not found: $WASM_FILE"
    echo "💡 Building contract..."
    cd fusion-escrow
    cargo build --target wasm32-unknown-unknown --release
    cd ..
    
    if [ ! -f "$WASM_FILE" ]; then
        echo "❌ Build failed!"
        exit 1
    fi
fi

echo "✅ WASM file found: $(du -h $WASM_FILE | cut -f1)"

echo ""
echo "🏗️ Creating contract account..."
near account create-account $CONTRACT_ACCOUNT \
    --usePreconfiguredGuidedHelper \
    --initialBalance 5 \
    --network testnet \
    --signWithKey $NEAR_RESOLVER_ACCOUNT_ID

if [ $? -ne 0 ]; then
    echo "❌ Failed to create contract account"
    exit 1
fi

echo "✅ Contract account created: $CONTRACT_ACCOUNT"

echo ""
echo "📦 Deploying contract code..."
near contract deploy $CONTRACT_ACCOUNT \
    --wasmFile $WASM_FILE \
    --network testnet

if [ $? -ne 0 ]; then
    echo "❌ Failed to deploy contract"
    exit 1
fi

echo "✅ Contract deployed successfully!"

echo ""
echo "🎬 Initializing contract..."
near contract call-function $CONTRACT_ACCOUNT new \
    --args '{}' \
    --accountId $CONTRACT_ACCOUNT \
    --gas 300000000000000 \
    --network testnet

if [ $? -ne 0 ]; then
    echo "❌ Failed to initialize contract"
    exit 1
fi

echo "✅ Contract initialized!"

echo ""
echo "🔐 Authorizing resolvers..."

# Authorize both resolver accounts
near contract call-function $CONTRACT_ACCOUNT authorize_resolver \
    --args "{\"resolver\": \"$NEAR_RESOLVER_ACCOUNT_ID\"}" \
    --accountId $CONTRACT_ACCOUNT \
    --gas 300000000000000 \
    --network testnet

near contract call-function $CONTRACT_ACCOUNT authorize_resolver \
    --args "{\"resolver\": \"$NEAR_USER_ACCOUNT_ID\"}" \
    --accountId $CONTRACT_ACCOUNT \
    --gas 300000000000000 \
    --network testnet

echo "✅ Resolvers authorized!"

echo ""
echo "💰 Funding contract with liquidity..."
near tokens $NEAR_RESOLVER_ACCOUNT_ID send-near $CONTRACT_ACCOUNT 10 \
    --network testnet

if [ $? -ne 0 ]; then
    echo "⚠️ Failed to fund contract, but deployment successful"
else
    echo "✅ Contract funded with 10 NEAR!"
fi

echo ""
echo "📊 Checking final contract state..."
near account state $CONTRACT_ACCOUNT --network testnet

echo ""
echo "🎉 === DEPLOYMENT COMPLETE ==="
echo "✅ Contract Address: $CONTRACT_ACCOUNT"
echo "✅ Network: Near Testnet"
echo "✅ Status: Ready for real atomic swaps"
echo ""
echo "🔗 Explorer: https://testnet.nearblocks.io/account/$CONTRACT_ACCOUNT"
echo ""
echo "📋 Available Methods:"
echo "  - create_eth_to_near_order"
echo "  - create_near_to_eth_order"
echo "  - claim_with_secret"
echo "  - get_order"
echo ""
echo "💡 Update your .env file:"
echo "NEAR_CONTRACT_ID=$CONTRACT_ACCOUNT"
echo ""
echo "🚀 Ready for trustless cross-chain transfers!"