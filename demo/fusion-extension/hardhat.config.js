require('@nomicfoundation/hardhat-chai-matchers');
require('hardhat-deploy');
require('hardhat-gas-reporter');
require('dotenv').config();
require('@nomicfoundation/hardhat-verify');

// Sepolia testnet configuration
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/52031d0c150b41f98cbf3ac82d5eefe9';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '0x4ad4380b0f16629b0ea62e793b2712f7ac74c0c98f0c20daa39c6ed44740c704';
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || 'AH9STSW5ADXV68ZUQ66HCQAJ9MUGADJGPU';

module.exports = {
    solidity: {
        version: '0.8.23',
        settings: {
            optimizer: {
                enabled: true,
                runs: 1000000,
            },
            evmVersion: 'shanghai',
            viaIR: true,
        },
    },
    networks: {
        sepolia: {
            url: SEPOLIA_RPC_URL,
            accounts: [PRIVATE_KEY],
            chainId: 11155111,
        },
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
    },
    etherscan: {
        apiKey: {
            sepolia: ETHERSCAN_API_KEY,
        },
    },
    gasReporter: {
        enabled: true,
        currency: 'USD',
    },
};