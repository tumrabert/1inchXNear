'use client'

import { useState, useEffect } from 'react'
import { Wallet, ExternalLink, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'

interface WalletState {
  ethereum: {
    connected: boolean
    address: string
    balance: string
    chainId?: number
  }
  near: {
    connected: boolean
    accountId: string
    balance: string
  }
}

interface WalletConnectProps {
  onWalletChange?: (wallets: WalletState) => void
}

export default function WalletConnect({ onWalletChange }: WalletConnectProps) {
  const [wallets, setWallets] = useState<WalletState>({
    ethereum: { connected: false, address: '', balance: '0' },
    near: { connected: false, accountId: '', balance: '0' }
  })
  const [loading, setLoading] = useState({ ethereum: false, near: false })

  // Ethereum wallet connection
  const connectEthereum = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask or another Web3 wallet')
      return
    }

    setLoading(prev => ({ ...prev, ethereum: true }))
    
    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      // Switch to Sepolia testnet
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }] // Sepolia chainId
        })
      } catch (switchError: any) {
        // If network doesn't exist, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xaa36a7',
              chainName: 'Sepolia Test Network',
              nativeCurrency: {
                name: 'SepoliaETH',
                symbol: 'SEP',
                decimals: 18
              },
              rpcUrls: ['https://sepolia.infura.io/v3/'],
              blockExplorerUrls: ['https://sepolia.etherscan.io/']
            }]
          })
        }
      }

      // Get balance
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [accounts[0], 'latest']
      })

      const balanceInEther = (parseInt(balance, 16) / 1e18).toFixed(4)

      const newEthereumState = {
        connected: true,
        address: accounts[0],
        balance: balanceInEther,
        chainId: 11155111
      }

      setWallets(prev => ({
        ...prev,
        ethereum: newEthereumState
      }))

      onWalletChange?.({
        ...wallets,
        ethereum: newEthereumState
      })

    } catch (error) {
      console.error('Ethereum connection failed:', error)
    } finally {
      setLoading(prev => ({ ...prev, ethereum: false }))
    }
  }

  // Near wallet connection (simplified)
  const connectNear = async () => {
    setLoading(prev => ({ ...prev, near: true }))
    
    try {
      // For demo purposes, simulate Near wallet connection
      // In production, you'd use @near-wallet-selector
      const mockAccountId = 'demo-user.testnet'
      const mockBalance = '10.0000'

      const newNearState = {
        connected: true,
        accountId: mockAccountId,
        balance: mockBalance
      }

      setWallets(prev => ({
        ...prev,
        near: newNearState
      }))

      onWalletChange?.({
        ...wallets,
        near: newNearState
      })

    } catch (error) {
      console.error('Near connection failed:', error)
    } finally {
      setLoading(prev => ({ ...prev, near: false }))
    }
  }

  const disconnectWallet = (chain: 'ethereum' | 'near') => {
    const newWallets = {
      ...wallets,
      [chain]: { connected: false, address: '', accountId: '', balance: '0' }
    }
    setWallets(newWallets)
    onWalletChange?.(newWallets)
  }

  const refreshBalance = async (chain: 'ethereum' | 'near') => {
    if (chain === 'ethereum' && wallets.ethereum.connected) {
      try {
        const balance = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [wallets.ethereum.address, 'latest']
        })
        const balanceInEther = (parseInt(balance, 16) / 1e18).toFixed(4)
        
        setWallets(prev => ({
          ...prev,
          ethereum: { ...prev.ethereum, balance: balanceInEther }
        }))
      } catch (error) {
        console.error('Failed to refresh Ethereum balance:', error)
      }
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Ethereum Wallet */}
      <div className="card-gradient p-6 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-r from-1inch-500 to-1inch-600 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white font-bold text-sm">ETH</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Ethereum Wallet</h3>
              <p className="text-sm text-gray-600">Sepolia Testnet</p>
            </div>
          </div>
          
          {wallets.ethereum.connected ? (
            <div className="flex items-center text-green-600">
              <CheckCircle className="h-5 w-5 mr-1" />
              <span className="text-sm">Connected</span>
            </div>
          ) : (
            <div className="flex items-center text-gray-400">
              <AlertCircle className="h-5 w-5 mr-1" />
              <span className="text-sm">Disconnected</span>
            </div>
          )}
        </div>

        {wallets.ethereum.connected ? (
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">Address</label>
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                <code className="text-sm font-mono">
                  {wallets.ethereum.address.slice(0, 8)}...{wallets.ethereum.address.slice(-6)}
                </code>
                <a
                  href={`https://sepolia.etherscan.io/address/${wallets.ethereum.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-1inch-600 hover:text-1inch-700"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-600">Balance</label>
                <button
                  onClick={() => refreshBalance('ethereum')}
                  className="text-1inch-600 hover:text-1inch-700"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {wallets.ethereum.balance} SEP
              </div>
            </div>

            <button
              onClick={() => disconnectWallet('ethereum')}
              className="w-full py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={connectEthereum}
            disabled={loading.ethereum}
            className="w-full button-primary disabled:opacity-50"
          >
            {loading.ethereum ? (
              <div className="flex items-center justify-center">
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <Wallet className="h-4 w-4 mr-2" />
                Connect MetaMask
              </div>
            )}
          </button>
        )}
      </div>

      {/* Near Wallet */}
      <div className="card-gradient p-6 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-r from-near-500 to-near-600 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white font-bold text-sm">Ⓝ</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Near Wallet</h3>
              <p className="text-sm text-gray-600">Near Testnet</p>
            </div>
          </div>
          
          {wallets.near.connected ? (
            <div className="flex items-center text-green-600">
              <CheckCircle className="h-5 w-5 mr-1" />
              <span className="text-sm">Connected</span>
            </div>
          ) : (
            <div className="flex items-center text-gray-400">
              <AlertCircle className="h-5 w-5 mr-1" />
              <span className="text-sm">Disconnected</span>
            </div>
          )}
        </div>

        {wallets.near.connected ? (
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">Account ID</label>
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                <code className="text-sm font-mono">
                  {wallets.near.accountId}
                </code>
                <a
                  href={`https://testnet.nearblocks.io/account/${wallets.near.accountId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-near-600 hover:text-near-700"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-600">Balance</label>
                <button
                  onClick={() => refreshBalance('near')}
                  className="text-near-600 hover:text-near-700"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {wallets.near.balance} NEAR
              </div>
            </div>

            <button
              onClick={() => disconnectWallet('near')}
              className="w-full py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={connectNear}
            disabled={loading.near}
            className="w-full button-secondary disabled:opacity-50"
          >
            {loading.near ? (
              <div className="flex items-center justify-center">
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <Wallet className="h-4 w-4 mr-2" />
                Connect Near Wallet
              </div>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// Global type for window.ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}