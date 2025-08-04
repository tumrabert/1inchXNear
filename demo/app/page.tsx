"use client";

import { useState } from "react";
import {
  ArrowLeftRight,
  Zap,
  Shield,
  Users,
  ExternalLink,
  Github,
  Play,
  CheckCircle,
} from "lucide-react";
import FusionPlusInterface from "@/components/FusionPlusInterface";
import RealSwapInterface from "@/components/RealSwapInterface";
import LiquidityManager from "@/components/LiquidityManager";
import WalletConnect from "@/components/WalletConnect";

export default function Home() {
  const [activeTab, setActiveTab] = useState<'demo' | 'real' | 'liquidity'>('real');
  const [wallets, setWallets] = useState({
    ethereum: { connected: false, address: "", balance: "0" },
    near: { connected: false, accountId: "", balance: "0" },
  });

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-1inch-500/10 to-near-500/10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-1inch-500 to-1inch-600 rounded-lg flex items-center justify-center">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <ArrowLeftRight className="h-8 w-8 text-gray-400 animate-pulse-slow" />
              <div className="w-12 h-12 bg-gradient-to-r from-near-500 to-near-600 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
              1inch Unite
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-1inch-500 to-near-500">
                Cross-Chain Bridge
              </span>
            </h1>

            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Novel extension for 1inch Cross-chain Swap (Fusion+) enabling
              Ethereum ↔ Near atomic swaps. Built with deployed Limit Order
              Protocol contracts and real cross-chain functionality.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
              <div className="ethereum-badge">
                <span className="w-2 h-2 bg-1inch-500 rounded-full mr-2"></span>
                Ethereum Sepolia
              </div>
              <ArrowLeftRight className="h-4 w-4 text-gray-400" />
              <div className="near-badge">
                <span className="w-2 h-2 bg-near-500 rounded-full mr-2"></span>
                Near Testnet
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href="https://github.com/tumrabert/1inchXNear"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Github className="h-5 w-5 mr-2" />
                View Source Code
              </a>
              <a
                href="#demo"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-1inch-500 to-near-500 text-white rounded-lg hover:shadow-lg transition-all"
              >
                <Play className="h-5 w-5 mr-2" />
                Try Live Demo
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Key Features */}
      <section className="py-16 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Revolutionary Cross-Chain Features
            </h2>
            <p className="text-lg text-gray-600">
              Extension of 1inch Fusion+ with deployed Limit Order Protocol
              contracts
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="card-gradient p-8 rounded-2xl">
              <div className="w-12 h-12 bg-gradient-to-r from-1inch-500 to-1inch-600 rounded-lg flex items-center justify-center mb-6">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Atomic Security
              </h3>
              <p className="text-gray-600 mb-4">
                Hashlock/timelock mechanism ensures atomic execution or complete
                rollback. 7-stage timelock system with safety deposits.
              </p>
              <div className="flex items-center text-sm text-green-600">
                <CheckCircle className="h-4 w-4 mr-1" />
                Zero counterparty risk
              </div>
            </div>

            <div className="card-gradient p-8 rounded-2xl">
              <div className="w-12 h-12 bg-gradient-to-r from-near-500 to-near-600 rounded-lg flex items-center justify-center mb-6">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Partial Fills
              </h3>
              <p className="text-gray-600 mb-4">
                Merkle tree-based partial execution allows flexible swap sizes.
                Execute 25%, 50%, or any percentage incrementally.
              </p>
              <div className="flex items-center text-sm text-green-600">
                <CheckCircle className="h-4 w-4 mr-1" />
                Maximum capital efficiency
              </div>
            </div>

            <div className="card-gradient p-8 rounded-2xl">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mb-6">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Bidirectional
              </h3>
              <p className="text-gray-600 mb-4">
                Native support for both Ethereum → Near and Near → Ethereum
                swaps. Same security guarantees in both directions.
              </p>
              <div className="flex items-center text-sm text-green-600">
                <CheckCircle className="h-4 w-4 mr-1" />
                True cross-chain liquidity
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Interface */}
      <section id="demo" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Real Cross-Chain Bridge Interface
            </h2>
            <p className="text-lg text-gray-600">
              Execute real cryptocurrency transfers between Ethereum and Near using deployed contracts
            </p>
          </div>

          {/* Wallet Connection */}
          <div className="mb-8">
            <WalletConnect onWalletChange={setWallets} />
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="card-gradient p-2 rounded-lg inline-flex space-x-2">
              <button 
                onClick={() => setActiveTab('real')}
                className={`px-6 py-3 rounded-md font-medium transition-all ${
                  activeTab === 'real' 
                    ? 'bg-gradient-to-r from-green-500 to-blue-600 text-white shadow-lg' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}>
                🚀 Real Swaps
              </button>
              <button 
                onClick={() => setActiveTab('liquidity')}
                className={`px-6 py-3 rounded-md font-medium transition-all ${
                  activeTab === 'liquidity' 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}>
                💰 Liquidity Pools
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="max-w-4xl mx-auto">
            {activeTab === 'real' && <RealSwapInterface wallets={wallets} />}
            {activeTab === 'liquidity' && <LiquidityManager wallets={wallets} />}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-4 mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-1inch-500 to-1inch-600 rounded-lg flex items-center justify-center">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-bold">1inch Unite Hackathon</span>
            </div>

            <p className="text-gray-400 mb-6">
              Extending 1inch Fusion+ to Near Protocol for true cross-chain DeFi
            </p>

            <div className="flex items-center justify-center space-x-6">
              <a
                href="https://github.com/tumrabert/1inchXNear"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Github className="h-6 w-6" />
              </a>
              <a
                href="https://sepolia.etherscan.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors inline-flex items-center"
              >
                <ExternalLink className="h-6 w-6 mr-2" />
                Ethereum Explorer
              </a>
              <a
                href="https://testnet.nearblocks.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors inline-flex items-center"
              >
                <ExternalLink className="h-6 w-6 mr-2" />
                Near Explorer
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
