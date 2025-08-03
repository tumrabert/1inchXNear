#!/bin/bash

# 🔐 NEAR CLI LOGIN HELPER
# Sets up Near CLI with the resolver account for deployment

echo "🔐 === NEAR CLI LOGIN SETUP ==="
echo ""

# Load environment
source ../.env

echo "📋 Account to login with:"
echo "  Account ID: $NEAR_RESOLVER_ACCOUNT_ID"
echo "  Private Key: ${NEAR_RESOLVER_PRIVATE_KEY:0:20}..."
echo ""

echo "💡 Login Instructions:"
echo "1. Run: near login"
echo "2. This will open a browser"
echo "3. Login with account: $NEAR_RESOLVER_ACCOUNT_ID"
echo "4. Grant permissions"
echo "5. Return to terminal"
echo ""

# Alternative: Import key directly
echo "🔧 Alternative: Import key directly..."
echo "Run this command to import the key:"
echo ""
echo "near account import-account using-private-key $NEAR_RESOLVER_PRIVATE_KEY --network testnet"
echo ""

# Try direct import
echo "Attempting direct key import..."
near account import-account using-private-key $NEAR_RESOLVER_PRIVATE_KEY --network testnet

if [ $? -eq 0 ]; then
    echo "✅ Account imported successfully!"
    echo "✅ Ready to deploy contract"
else
    echo "❌ Direct import failed"
    echo "💡 Please run 'near login' manually"
fi