'use client'

import { useState } from 'react'
import { ArrowUpDown, Wallet, AlertCircle, CheckCircle, Clock, ExternalLink } from 'lucide-react'

interface SwapState {
  fromChain: 'ethereum' | 'near'
  toChain: 'ethereum' | 'near'
  fromToken: string
  toToken: string
  amount: string
  status: 'idle' | 'connecting' | 'swapping' | 'success' | 'error'
  txHash?: string
}

export default function SwapInterface() {
  const [swap, setSwap] = useState<SwapState>({
    fromChain: 'ethereum',
    toChain: 'near',
    fromToken: 'USDT',
    toToken: 'USDT',
    amount: '100',
    status: 'idle'
  })

  const [enablePartialFills, setEnablePartialFills] = useState(false)
  const [partialFillPercentage, setPartialFillPercentage] = useState(25)

  const handleSwapDirection = () => {
    setSwap(prev => ({
      ...prev,
      fromChain: prev.toChain,
      toChain: prev.fromChain
    }))
  }

  const handleSwap = async () => {
    setSwap(prev => ({ ...prev, status: 'connecting' }))
    
    // Simulate swap process
    setTimeout(() => {
      setSwap(prev => ({ ...prev, status: 'swapping' }))
    }, 1000)
    
    setTimeout(() => {
      setSwap(prev => ({ 
        ...prev, 
        status: 'success',
        txHash: '0x1234567890abcdef1234567890abcdef12345678'
      }))
    }, 3000)
  }

  const getStatusColor = (status: SwapState['status']) => {
    switch (status) {
      case 'connecting': return 'text-yellow-600'
      case 'swapping': return 'text-blue-600'
      case 'success': return 'text-green-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: SwapState['status']) => {
    switch (status) {
      case 'connecting': return <Wallet className="h-5 w-5" />
      case 'swapping': return <Clock className="h-5 w-5 animate-spin" />
      case 'success': return <CheckCircle className="h-5 w-5" />
      case 'error': return <AlertCircle className="h-5 w-5" />
      default: return null
    }
  }

  return (
    <div className="card-gradient p-8 rounded-2xl max-w-md mx-auto">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Cross-Chain Swap</h3>
        <p className="text-gray-600">Atomic swaps with 1inch Fusion+ security</p>
      </div>

      {/* From Chain */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
        <div className={`p-4 rounded-lg border-2 ${
          swap.fromChain === 'ethereum' ? 'border-1inch-200 bg-1inch-50' : 'border-near-200 bg-near-50'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full mr-3 ${
                swap.fromChain === 'ethereum' ? 'bg-1inch-500' : 'bg-near-500'
              }`}></div>
              <div>
                <div className="font-medium text-gray-900">
                  {swap.fromChain === 'ethereum' ? 'Ethereum' : 'Near Protocol'}
                </div>
                <div className="text-sm text-gray-500">
                  {swap.fromChain === 'ethereum' ? 'Sepolia Testnet' : 'Near Testnet'}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium text-gray-900">{swap.amount} {swap.fromToken}</div>
              <div className="text-sm text-gray-500">≈ $100.00</div>
            </div>
          </div>
          <input
            type="number"
            value={swap.amount}
            onChange={(e) => setSwap(prev => ({ ...prev, amount: e.target.value }))}
            className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-1inch-500 focus:border-transparent"
            placeholder="Amount"
          />
        </div>
      </div>

      {/* Swap Direction Button */}
      <div className="flex justify-center mb-4">
        <button
          onClick={handleSwapDirection}
          className="p-2 bg-white border-2 border-gray-200 rounded-full hover:border-1inch-500 hover:bg-1inch-50 transition-all"
        >
          <ArrowUpDown className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* To Chain */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
        <div className={`p-4 rounded-lg border-2 ${
          swap.toChain === 'ethereum' ? 'border-1inch-200 bg-1inch-50' : 'border-near-200 bg-near-50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full mr-3 ${
                swap.toChain === 'ethereum' ? 'bg-1inch-500' : 'bg-near-500'
              }`}></div>
              <div>
                <div className="font-medium text-gray-900">
                  {swap.toChain === 'ethereum' ? 'Ethereum' : 'Near Protocol'}
                </div>
                <div className="text-sm text-gray-500">
                  {swap.toChain === 'ethereum' ? 'Sepolia Testnet' : 'Near Testnet'}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium text-gray-900">{swap.amount} {swap.toToken}</div>
              <div className="text-sm text-gray-500">≈ $100.00</div>
            </div>
          </div>
        </div>
      </div>

      {/* Partial Fills Option */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={enablePartialFills}
              onChange={(e) => setEnablePartialFills(e.target.checked)}
              className="mr-2 h-4 w-4 text-1inch-600 focus:ring-1inch-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Enable Partial Fills</span>
          </label>
        </div>
        
        {enablePartialFills && (
          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Fill Percentage: {partialFillPercentage}%
            </label>
            <input
              type="range"
              min="25"
              max="100"
              step="25"
              value={partialFillPercentage}
              onChange={(e) => setPartialFillPercentage(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>
        )}
      </div>

      {/* Status Display */}
      {swap.status !== 'idle' && (
        <div className={`mb-6 p-4 rounded-lg border ${getStatusColor(swap.status)} border-current/20 bg-current/5`}>
          <div className="flex items-center">
            {getStatusIcon(swap.status)}
            <span className="ml-2 font-medium">
              {swap.status === 'connecting' && 'Connecting wallets...'}
              {swap.status === 'swapping' && 'Executing atomic swap...'}
              {swap.status === 'success' && 'Swap completed successfully!'}
              {swap.status === 'error' && 'Swap failed. Please try again.'}
            </span>
          </div>
          
          {swap.txHash && (
            <div className="mt-2 flex items-center text-sm">
              <span className="text-gray-600 mr-2">Transaction:</span>
              <a
                href={`https://sepolia.etherscan.io/tx/${swap.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-1inch-600 hover:text-1inch-700 inline-flex items-center"
              >
                {swap.txHash.slice(0, 8)}...{swap.txHash.slice(-6)}
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Swap Button */}
      <button
        onClick={handleSwap}
        disabled={swap.status === 'connecting' || swap.status === 'swapping'}
        className="w-full button-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {swap.status === 'idle' && 'Execute Atomic Swap'}
        {swap.status === 'connecting' && 'Connecting...'}
        {swap.status === 'swapping' && 'Swapping...'}
        {swap.status === 'success' && 'Swap Another'}
        {swap.status === 'error' && 'Try Again'}
      </button>

      {/* Swap Details */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3">Swap Details</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Security Model:</span>
            <span className="text-gray-900">Hashlock/Timelock</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Execution:</span>
            <span className="text-gray-900">Atomic</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Safety Deposit:</span>
            <span className="text-gray-900">0.01 ETH</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Timelock Duration:</span>
            <span className="text-gray-900">1 hour</span>
          </div>
          {enablePartialFills && (
            <div className="flex justify-between">
              <span className="text-gray-600">Partial Fill:</span>
              <span className="text-gray-900">{partialFillPercentage}% of total</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}