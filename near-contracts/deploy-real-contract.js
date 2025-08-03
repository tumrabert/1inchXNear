#!/usr/bin/env node

/**
 * 🚀 DEPLOY REAL NEAR ESCROW CONTRACT
 * 
 * Deploys the fusion escrow contract with real credentials for trustless transfers
 */

const { connect, keyStores, KeyPair, Contract } = require('near-api-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env' });

class NearContractDeployer {
  async deployContract() {
    console.log('🚀 === DEPLOYING REAL NEAR ESCROW CONTRACT ===\\n');
    
    try {
      // Setup Near connection with real credentials
      const nearConfig = {
        networkId: 'testnet',
        keyStore: new keyStores.InMemoryKeyStore(),
        nodeUrl: 'https://rpc.testnet.near.org',
        walletUrl: 'https://testnet.mynearwallet.com',
        helperUrl: 'https://helper.testnet.near.org',
      };

      // Use resolver account to deploy (has funds)
      const deployerKeyPair = KeyPair.fromString(process.env.NEAR_RESOLVER_PRIVATE_KEY);
      await nearConfig.keyStore.setKey('testnet', process.env.NEAR_RESOLVER_ACCOUNT_ID, deployerKeyPair);

      const nearConnection = await connect(nearConfig);
      const deployerAccount = await nearConnection.account(process.env.NEAR_RESOLVER_ACCOUNT_ID);

      console.log('📋 Deployment Details:');
      console.log('  Deployer:', process.env.NEAR_RESOLVER_ACCOUNT_ID);
      console.log('  Network: Near Testnet');
      
      // Check deployer balance
      const deployerState = await deployerAccount.state();
      const deployerBalance = parseFloat(deployerState.amount) / 1e24;
      console.log('  Deployer Balance:', deployerBalance.toFixed(4), 'NEAR');
      
      if (deployerBalance < 5) {
        throw new Error('Insufficient balance for deployment (need at least 5 NEAR)');
      }

      // Create contract account name
      const contractAccountId = `fusion-escrow-${Date.now()}.${process.env.NEAR_RESOLVER_ACCOUNT_ID}`;
      console.log('  Contract Account:', contractAccountId);

      // Read WASM file
      const wasmPath = path.join(__dirname, 'fusion-escrow/target/wasm32-unknown-unknown/release/fusion_escrow.wasm');
      
      if (!fs.existsSync(wasmPath)) {
        throw new Error('WASM file not found. Run: cargo build --target wasm32-unknown-unknown --release');
      }
      
      const wasmFile = fs.readFileSync(wasmPath);
      console.log('  Contract Size:', wasmFile.length, 'bytes');

      console.log('\\n🏗️ Creating contract account...');
      
      // Create contract account
      const createResult = await deployerAccount.createAccount(
        contractAccountId,
        deployerKeyPair.getPublicKey(),
        '5000000000000000000000000' // 5 NEAR initial balance
      );
      
      console.log('✅ Contract account created:', createResult.transaction.hash);

      // Get contract account instance
      const contractAccount = await nearConnection.account(contractAccountId);

      console.log('\\n📦 Deploying contract code...');
      
      // Deploy contract
      const deployResult = await contractAccount.deployContract(wasmFile);
      console.log('✅ Contract deployed:', deployResult.transaction.hash);

      console.log('\\n🎬 Initializing contract...');
      
      // Initialize contract
      const contract = new Contract(contractAccount, contractAccountId, {
        viewMethods: ['get_order', 'is_authorized_resolver', 'get_contract_balance'],
        changeMethods: ['new', 'authorize_resolver', 'create_eth_to_near_order', 'create_near_to_eth_order', 'claim_with_secret'],
      });

      const initResult = await contract.new();
      console.log('✅ Contract initialized:', initResult.transaction.hash);

      console.log('\\n🔐 Authorizing resolvers...');
      
      // Authorize both resolver accounts
      await contract.authorize_resolver({ resolver: process.env.NEAR_RESOLVER_ACCOUNT_ID });
      await contract.authorize_resolver({ resolver: process.env.NEAR_USER_ACCOUNT_ID });
      
      console.log('✅ Resolvers authorized');

      console.log('\\n💰 Funding contract with liquidity...');
      
      // Send NEAR to contract for liquidity
      const fundResult = await deployerAccount.sendMoney(
        contractAccountId,
        '10000000000000000000000000' // 10 NEAR for liquidity
      );
      
      console.log('✅ Contract funded with 10 NEAR:', fundResult.transaction.hash);

      // Check final contract balance
      const contractState = await contractAccount.state();
      const contractBalance = parseFloat(contractState.amount) / 1e24;
      
      console.log('\\n🎉 === DEPLOYMENT COMPLETE ===');
      console.log('✅ Contract Address:', contractAccountId);
      console.log('✅ Contract Balance:', contractBalance.toFixed(4), 'NEAR');
      console.log('✅ Status: Ready for real atomic swaps');
      console.log('\\n🔗 Explorer:', `https://testnet.nearblocks.io/account/${contractAccountId}`);
      
      console.log('\\n📋 Contract Methods Available:');
      console.log('  - create_eth_to_near_order()');
      console.log('  - create_near_to_eth_order()');
      console.log('  - claim_with_secret()');
      console.log('  - get_order()');
      
      // Update .env with new contract address
      const envPath = path.join(__dirname, '../.env');
      let envContent = fs.readFileSync(envPath, 'utf8');
      envContent = envContent.replace(
        /NEAR_CONTRACT_ID=.*/,
        `NEAR_CONTRACT_ID=${contractAccountId}`
      );
      fs.writeFileSync(envPath, envContent);
      
      console.log('\\n✅ Updated .env with new contract address');
      
      return {
        success: true,
        contractId: contractAccountId,
        balance: contractBalance,
        methods: [
          'create_eth_to_near_order',
          'create_near_to_eth_order',
          'claim_with_secret',
          'get_order'
        ]
      };
      
    } catch (error) {
      console.error('❌ Deployment failed:', error.message);
      if (error.message.includes('CreateAccountNotAllowed')) {
        console.log('\\n💡 Try using a different contract name or account structure');
      }
      return { success: false, error: error.message };
    }
  }

  async run() {
    const result = await this.deployContract();
    
    if (result.success) {
      console.log('\\n🎯 === READY FOR TRUSTLESS TRANSFERS ===');
      console.log('🔒 Smart contract now controls fund releases');
      console.log('⚡ Atomic swaps enabled with hashlock/timelock');
      console.log('💰 Contract has liquidity for real transfers');
      console.log('\\n🚀 Next: Run atomic swap tests with contract!');
    } else {
      console.log('\\n❌ Deployment failed:', result.error);
    }
    
    return result;
  }
}

// Deploy the contract
const deployer = new NearContractDeployer();
deployer.run().catch(console.error);