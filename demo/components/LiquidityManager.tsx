'use client'

import React, { useState, useEffect } from 'react'
import { liquidityService, LiquidityPool } from '../lib/liquidityService'

interface LiquidityManagerProps {
  wallets: {
    ethereum: { connected: boolean; address: string; balance: string }
    near: { connected: boolean; accountId: string; balance: string }
  }
}

export default function LiquidityManager({ wallets }: LiquidityManagerProps) {
  const [poolStatus, setPoolStatus] = useState<LiquidityPool | null>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [transactions, setTransactions] = useState<Array<{
    chain: string
    type: string
    amount: string
    txHash: string
    timestamp: number
  }>>([])

  useEffect(() => {
    initializeLiquidity()
  }, [])

  const initializeLiquidity = async () => {
    await liquidityService.initialize()
    await updatePoolStatus()
  }

  const updatePoolStatus = async () => {
    const status = await liquidityService.getLiquidityStatus()
    setPoolStatus(status)
  }

  const depositEthLiquidity = async () => {
    if (!wallets.ethereum.connected) {
      setStatus('❌ Please connect Ethereum wallet first')
      return
    }

    setLoading(true)
    setStatus('💰 Depositing 0.5 ETH liquidity...')

    try {
      const result = await liquidityService.depositEthLiquidity('0.5')
      
      if (result.success && result.txHash) {
        setTransactions(prev => [...prev, {
          chain: 'Ethereum',
          type: 'Deposit',
          amount: '0.5 ETH',
          txHash: result.txHash || '',
          timestamp: Date.now()
        }])
        
        setStatus(`✅ ETH liquidity deposited! TX: ${result.txHash}`)
        await updatePoolStatus()
      } else {
        setStatus(`❌ ETH deposit failed: ${result.error}`)
      }
    } catch (error) {
      setStatus(`❌ ETH deposit error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const depositNearLiquidity = async () => {
    if (!wallets.near.connected) {
      setStatus('❌ Please connect Near wallet first')
      return
    }

    setLoading(true)
    setStatus('🌿 Depositing 5.0 NEAR liquidity...')

    try {
      const result = await liquidityService.depositNearLiquidity('5.0')
      
      if (result.success && result.txHash) {
        setTransactions(prev => [...prev, {
          chain: 'Near',
          type: 'Deposit',
          amount: '5.0 NEAR',
          txHash: result.txHash || '',
          timestamp: Date.now()
        }])
        
        setStatus(`✅ NEAR liquidity deposited! TX: ${result.txHash}`)
        await updatePoolStatus()
      } else {
        setStatus(`❌ NEAR deposit failed: ${result.error}`)
      }
    } catch (error) {
      setStatus(`❌ NEAR deposit error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const isEthTargetMet = poolStatus ? parseFloat(poolStatus.eth.available) >= 0.5 : false
  const isNearTargetMet = poolStatus ? parseFloat(poolStatus.near.available) >= 5.0 : false
  const isFullyFunded = isEthTargetMet && isNearTargetMet

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">💰 Liquidity Pool Management</h2>
      </div>

      {/* Pool Status Overview */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">ETH Pool</span>
            <div className={`w-3 h-3 rounded-full ${isEthTargetMet ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {poolStatus?.eth.available || '0.000'} ETH
          </div>
          <div className="text-xs text-blue-600">
            Target: 0.5 ETH {isEthTargetMet ? '✅' : '⚠️'}
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-900">NEAR Pool</span>
            <div className={`w-3 h-3 rounded-full ${isNearTargetMet ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          </div>
          <div className="text-2xl font-bold text-purple-900">
            {poolStatus?.near.available || '0.000'} NEAR
          </div>
          <div className="text-xs text-purple-600">
            Target: 5.0 NEAR {isNearTargetMet ? '✅' : '⚠️'}
          </div>
        </div>
      </div>

      {/* Overall Status */}
      <div className={`rounded-lg p-4 mb-6 ${
        isFullyFunded ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
      }`}>
        <div className="flex items-center space-x-2">
          <div className={`w-4 h-4 rounded-full ${isFullyFunded ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          <span className={`font-medium ${isFullyFunded ? 'text-green-900' : 'text-yellow-900'}`}>
            {isFullyFunded ? '🚀 Pools Ready - Real Swaps Enabled!' : '⚠️ Deposit Liquidity to Enable Real Swaps'}
          </span>
        </div>
        {isFullyFunded && (
          <div className="text-xs text-green-700 mt-1">
            Users can now swap real cryptocurrency using your liquidity pools
          </div>
        )}
      </div>

      {/* Liquidity Deposit Buttons */}
      <div className="space-y-3 mb-6">
        <button
          onClick={depositEthLiquidity}
          disabled={loading || !wallets.ethereum.connected || isEthTargetMet}
          className={`w-full py-3 rounded-xl font-medium transition-colors ${
            isEthTargetMet
              ? 'bg-green-100 text-green-800 cursor-not-allowed'
              : !wallets.ethereum.connected
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : loading
              ? 'bg-blue-400 text-white cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isEthTargetMet ? (
            '✅ ETH Liquidity Complete (0.5 ETH)'
          ) : !wallets.ethereum.connected ? (
            '🔗 Connect Ethereum Wallet to Deposit'
          ) : loading ? (
            '⏳ Depositing ETH...'
          ) : (
            '💰 Deposit 0.5 ETH Liquidity'
          )}
        </button>

        <button
          onClick={depositNearLiquidity}
          disabled={loading || !wallets.near.connected || isNearTargetMet}
          className={`w-full py-3 rounded-xl font-medium transition-colors ${
            isNearTargetMet
              ? 'bg-green-100 text-green-800 cursor-not-allowed'
              : !wallets.near.connected
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : loading
              ? 'bg-purple-400 text-white cursor-not-allowed'
              : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
        >
          {isNearTargetMet ? (
            '✅ NEAR Liquidity Complete (5.0 NEAR)'
          ) : !wallets.near.connected ? (
            '🔗 Connect Near Wallet to Deposit'
          ) : loading ? (
            '⏳ Depositing NEAR...'
          ) : (
            '🌿 Deposit 5.0 NEAR Liquidity'
          )}
        </button>
      </div>

      {/* Status Display */}
      {status && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm font-mono text-gray-700">{status}</div>
        </div>
      )}

      {/* Transaction History */}
      {transactions.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Recent Deposits</h3>
          <div className="space-y-2">
            {transactions.slice(-3).reverse().map((tx, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${tx.chain === 'Ethereum' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                  <span className="font-medium">{tx.type} {tx.amount}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500">
                    {new Date(tx.timestamp).toLocaleTimeString()}
                  </span>
                  <a
                    href={tx.chain === 'Ethereum' 
                      ? `https://sepolia.etherscan.io/tx/${tx.txHash}`
                      : `https://testnet.nearblocks.io/txns/${tx.txHash}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-xs"
                  >
                    View TX
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">💡 How Liquidity Works</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <div><strong>ETH Pool (0.5 ETH):</strong> Provides instant liquidity for NEAR → ETH swaps</div>
          <div><strong>NEAR Pool (5.0 NEAR):</strong> Provides instant liquidity for ETH → NEAR swaps</div>
          <div><strong>Real Swaps:</strong> Users get instant exchanges from your deposited liquidity</div>
          <div><strong>Settlement:</strong> Cross-chain atomic coordination happens in background</div>
        </div>
      </div>

      {/* Contract Addresses */}
      {poolStatus && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">📋 Pool Addresses</h3>
          <div className="text-xs text-gray-600 space-y-1">
            <div>
              <strong>ETH Pool:</strong>{' '}
              <a 
                href={`https://sepolia.etherscan.io/address/${poolStatus.eth.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {poolStatus.eth.address}
              </a>
            </div>
            <div>
              <strong>NEAR Pool:</strong>{' '}
              <a 
                href={`https://testnet.nearblocks.io/account/${poolStatus.near.contractId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {poolStatus.near.contractId}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}