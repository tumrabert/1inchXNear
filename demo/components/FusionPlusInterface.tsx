'use client'

import React, { useState, useEffect } from 'react'
import { fusionExtensionService, FUSION_EXTENSION_CONFIG } from '../lib/fusionExtensionService'
import { priceService } from '../lib/priceService'

interface SwapState {
  fromChain: 'ethereum' | 'near'
  toChain: 'ethereum' | 'near'  
  fromToken: string
  toToken: string
  fromAmount: string
  toAmount: string
  makerAddress: string
  nearAccount: string
}

interface OrderState {
  order: any
  orderHash: string
  signature: string
  secret: string
  hashlock: string
  status: 'created' | 'filled' | 'completed' | 'cancelled'
}

export default function FusionPlusInterface() {
  const [swapState, setSwapState] = useState<SwapState>({
    fromChain: 'ethereum',
    toChain: 'near',
    fromToken: '0x0000000000000000000000000000000000000000', // ETH
    toToken: 'near',
    fromAmount: '0.01',
    toAmount: '0',
    makerAddress: '',
    nearAccount: ''
  })

  const [orderState, setOrderState] = useState<OrderState | null>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [exchangeRate, setExchangeRate] = useState<any>(null)

  // Load exchange rates
  useEffect(() => {
    const loadRates = async () => {
      try {
        const rate = await priceService.getExchangeRate()
        setExchangeRate(rate)
        
        // Auto-calculate equivalent amount
        if (swapState.fromAmount && rate) {
          const fromAmt = parseFloat(swapState.fromAmount)
          if (swapState.fromChain === 'ethereum' && swapState.toChain === 'near') {
            const toAmt = (fromAmt * rate.ethToNear * 0.995).toFixed(6) // 0.5% slippage
            setSwapState(prev => ({ ...prev, toAmount: toAmt }))
          } else if (swapState.fromChain === 'near' && swapState.toChain === 'ethereum') {
            const toAmt = (fromAmt * rate.nearToEth * 0.995).toFixed(6)
            setSwapState(prev => ({ ...prev, toAmount: toAmt }))
          }
        }
      } catch (error) {
        console.error('Failed to load exchange rates:', error)
      }
    }
    loadRates()
  }, [swapState.fromAmount, swapState.fromChain, swapState.toChain])

  // Load wallet addresses
  useEffect(() => {
    const loadAddresses = async () => {
      try {
        if (window.ethereum) {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' })
          if (accounts.length > 0) {
            setSwapState(prev => ({ ...prev, makerAddress: accounts[0] }))
          }
        }
      } catch (error) {
        console.error('Failed to load wallet addresses:', error)
      }
    }
    loadAddresses()
  }, [])

  const handleSwapDirections = () => {
    setSwapState(prev => ({
      ...prev,
      fromChain: prev.toChain,
      toChain: prev.fromChain,
      fromToken: prev.toToken === 'near' ? '0x0000000000000000000000000000000000000000' : prev.toToken,
      toToken: prev.fromToken === '0x0000000000000000000000000000000000000000' ? 'near' : prev.fromToken,
      fromAmount: prev.toAmount,
      toAmount: prev.fromAmount
    }))
  }

  const createLimitOrder = async () => {
    setLoading(true)
    setStatus('Creating cross-chain limit order...')

    try {
      // Generate secret for atomic swap
      const secret = fusionExtensionService.generateSecret()
      
      // Convert amounts to wei for Ethereum
      const fromAmountWei = swapState.fromChain === 'ethereum' 
        ? (parseFloat(swapState.fromAmount) * 1e18).toString()
        : (parseFloat(swapState.fromAmount) * 1e24).toString() // Near uses 24 decimals

      const toAmountWei = swapState.toChain === 'ethereum'
        ? (parseFloat(swapState.toAmount) * 1e18).toString()
        : (parseFloat(swapState.toAmount) * 1e24).toString()

      const result = await fusionExtensionService.createCrossChainOrder({
        fromChain: swapState.fromChain,
        toChain: swapState.toChain,
        fromToken: swapState.fromToken,
        toToken: swapState.toToken,
        fromAmount: fromAmountWei,
        toAmount: toAmountWei,
        makerAddress: swapState.makerAddress,
        nearAccount: swapState.nearAccount,
        secret: secret
      })

      if (result.success) {
        setOrderState({
          order: result.order,
          orderHash: result.orderHash,
          signature: result.signature,
          secret: result.secret,
          hashlock: result.hashlock,
          status: 'created'
        })
        setStatus('✅ Cross-chain limit order created successfully!')
      } else {
        setStatus(`❌ Order creation failed: ${result.error}`)
      }

    } catch (error) {
      console.error('Create order error:', error)
      setStatus(`❌ Order creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const fillOrder = async () => {
    if (!orderState) return

    setLoading(true)
    setStatus('Filling limit order (this triggers cross-chain swap)...')

    try {
      const result = await fusionExtensionService.fillCrossChainOrder(
        orderState.order,
        orderState.signature,
        orderState.order.takingAmount
      )

      if (result.success) {
        setOrderState(prev => prev ? { ...prev, status: 'filled' } : null)
        setStatus(`✅ Order filled! Tx: ${result.txHash}`)
      } else {
        setStatus(`❌ Order fill failed: ${result.error}`)
      }

    } catch (error) {
      console.error('Fill order error:', error)
      setStatus(`❌ Order fill failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const revealSecret = async () => {
    if (!orderState) return

    setLoading(true)
    setStatus('Revealing secret to complete cross-chain swap...')

    try {
      const result = await fusionExtensionService.revealSecret(
        orderState.orderHash,
        orderState.secret
      )

      if (result.success) {
        setOrderState(prev => prev ? { ...prev, status: 'completed' } : null)
        setStatus(`🎉 Cross-chain swap completed! Secret revealed: ${result.txHash}`)
      } else {
        setStatus(`❌ Secret reveal failed: ${result.error}`)
      }

    } catch (error) {
      console.error('Reveal secret error:', error)
      setStatus(`❌ Secret reveal failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {  
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          1inch Fusion+ Near Extension
        </h1>
        <p className="text-gray-600">
          Cross-chain atomic swaps between Ethereum and Near Protocol
        </p>
        <p className="text-sm text-blue-600 mt-2">
          Using deployed Limit Order Protocol on Sepolia testnet
        </p>
      </div>

      {/* Swap Interface */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <div className="space-y-4">
          {/* From Section */}
          <div className="bg-white rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
            <div className="flex items-center space-x-3">
              <select 
                value={swapState.fromChain}
                onChange={(e) => setSwapState(prev => ({ 
                  ...prev, 
                  fromChain: e.target.value as 'ethereum' | 'near'
                }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ethereum">Ethereum</option>
                <option value="near">Near</option>
              </select>
              <input
                type="number"
                placeholder="Amount"
                value={swapState.fromAmount}
                onChange={(e) => setSwapState(prev => ({ ...prev, fromAmount: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-sm text-gray-500">
                {swapState.fromChain === 'ethereum' ? 'ETH' : 'NEAR'}
              </span>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <button
              onClick={handleSwapDirections}
              className="p-2 rounded-full bg-blue-100 hover:bg-blue-200 transition-colors"
            >
              ↕️
            </button>
          </div>

          {/* To Section */}
          <div className="bg-white rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
            <div className="flex items-center space-x-3">
              <select 
                value={swapState.toChain}
                onChange={(e) => setSwapState(prev => ({ 
                  ...prev, 
                  toChain: e.target.value as 'ethereum' | 'near'
                }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ethereum">Ethereum</option>
                <option value="near">Near</option>
              </select>
              <input
                type="number"
                placeholder="Amount"
                value={swapState.toAmount}
                onChange={(e) => setSwapState(prev => ({ ...prev, toAmount: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-sm text-gray-500">
                {swapState.toChain === 'ethereum' ? 'ETH' : 'NEAR'}
              </span>
            </div>
          </div>

          {/* Near Account Input */}
          {(swapState.fromChain === 'near' || swapState.toChain === 'near') && (
            <div className="bg-white rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Near Account</label>
              <input
                type="text"
                placeholder="your-account.testnet"
                value={swapState.nearAccount}
                onChange={(e) => setSwapState(prev => ({ ...prev, nearAccount: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
        </div>

        {/* Exchange Rate Display */}
        {exchangeRate && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-800">
              <div>1 ETH = {exchangeRate.ethToNear.toFixed(2)} NEAR</div>
              <div>1 NEAR = {exchangeRate.nearToEth.toFixed(6)} ETH</div>
              <div className="text-xs text-blue-600 mt-1">Rates include 0.5% slippage protection</div>
            </div>
          </div>
        )}
      </div>

      {/* Order Actions */}
      <div className="space-y-3">
        {!orderState && (
          <button
            onClick={createLimitOrder}
            disabled={loading || !swapState.makerAddress || !swapState.nearAccount}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating Order...' : 'Create Cross-Chain Limit Order'}
          </button>
        )}

        {orderState && orderState.status === 'created' && (
          <button
            onClick={fillOrder}
            disabled={loading}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
          >
            {loading ? 'Filling Order...' : 'Fill Order (Simulate Resolver)'}
          </button>
        )}

        {orderState && orderState.status === 'filled' && (
          <button
            onClick={revealSecret}
            disabled={loading}
            className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
          >
            {loading ? 'Revealing Secret...' : 'Reveal Secret & Complete Swap'}
          </button>
        )}

        {orderState && orderState.status === 'completed' && (
          <div className="w-full px-6 py-3 bg-green-100 text-green-800 rounded-lg text-center font-medium">
            🎉 Cross-Chain Swap Completed Successfully!
          </div>
        )}
      </div>

      {/* Status Display */}
      {status && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-sm font-mono text-gray-700">{status}</div>
        </div>
      )}

      {/* Order Details */}
      {orderState && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Order Details</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div><strong>Order Hash:</strong> {orderState.orderHash}</div>
            <div><strong>Status:</strong> {orderState.status}</div>
            <div><strong>Secret:</strong> {orderState.secret}</div>
            <div>
              <strong>View on Explorer:</strong>{' '}
              <a 
                href={`${FUSION_EXTENSION_CONFIG.ethereum.explorerUrl}/address/${FUSION_EXTENSION_CONFIG.ethereum.fusionNearExtension}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Fusion Extension Contract
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Contract Info */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Deployed Contracts</h3>
        <div className="space-y-1 text-sm text-blue-700">
          <div>
            <strong>Limit Order Protocol:</strong>{' '}
            <a 
              href={`${FUSION_EXTENSION_CONFIG.ethereum.explorerUrl}/address/${FUSION_EXTENSION_CONFIG.ethereum.limitOrderProtocol}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {FUSION_EXTENSION_CONFIG.ethereum.limitOrderProtocol}
            </a>
          </div>
          <div>
            <strong>Fusion Near Extension:</strong>{' '}
            <a 
              href={`${FUSION_EXTENSION_CONFIG.ethereum.explorerUrl}/address/${FUSION_EXTENSION_CONFIG.ethereum.fusionNearExtension}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {FUSION_EXTENSION_CONFIG.ethereum.fusionNearExtension}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}