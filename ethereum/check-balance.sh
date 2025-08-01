#!/bin/bash

# Load environment variables
source .env

# Check if private key is set
if [ "$PRIVATE_KEY" = "0x1234567890123456789012345678901234567890123456789012345678901234" ]; then
    echo "❌ Please update your PRIVATE_KEY in .env file first!"
    echo "1. Open MetaMask → Account Details → Export Private Key"
    echo "2. Copy your private key"
    echo "3. Replace PRIVATE_KEY=... in .env file"
    exit 1
fi

# Get wallet address from private key
WALLET_ADDRESS=$(~/.foundry/bin/cast wallet address --private-key $PRIVATE_KEY)

echo "🔍 Checking deployment readiness..."
echo "Wallet Address: $WALLET_ADDRESS"

# Check balance
BALANCE=$(~/.foundry/bin/cast balance $WALLET_ADDRESS --rpc-url https://ethereum-sepolia.publicnode.com)
BALANCE_ETH=$(~/.foundry/bin/cast to-ether $BALANCE)

echo "Sepolia ETH Balance: $BALANCE_ETH ETH"

# Check if we have enough (need ~0.01 ETH for deployment)
if (( $(echo "$BALANCE_ETH < 0.005" | bc -l) )); then
    echo "⚠️  Low balance! You need at least 0.005 ETH for deployment."
    echo "Get Sepolia ETH from: https://sepoliafaucet.com/"
    echo "Your address: $WALLET_ADDRESS"
else
    echo "✅ Balance sufficient for deployment!"
fi

echo ""
echo "🚀 Ready to deploy? Run:"
echo "source .env && ~/.foundry/bin/forge script script/DeployEscrow.s.sol --rpc-url \$SEPOLIA_RPC_URL --private-key \$PRIVATE_KEY --broadcast --verify"