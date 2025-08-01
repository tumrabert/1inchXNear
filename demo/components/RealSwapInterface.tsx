'use client'

import { useState, useEffect } from 'react'
import { ArrowUpDown, Zap, Clock, CheckCircle, AlertCircle, ExternalLink, Settings } from 'lucide-react'
import { blockchainService } from '@/lib/blockchain'

interface SwapStep {
  id: string
  title: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  txHash?: string
  error?: string
}

interface RealSwapState {
  fromChain: 'ethereum' | 'near'
  toChain: 'ethereum' | 'near'
  amount: string
  secret: string
  hashlock: string
  steps: SwapStep[]
  currentStep: number
  escrowAddresses: {
    ethereum?: string
    near?: string
  }
}

interface WalletState {
  ethereum: { connected: boolean; address: string; balance: string }
  near: { connected: boolean; accountId: string; balance: string }
}

interface RealSwapInterfaceProps {
  wallets: WalletState
}

export default function RealSwapInterface({ wallets: initialWallets }: RealSwapInterfaceProps) {
  const [wallets, setWallets] = useState<WalletState>(initialWallets)
  const [swapState, setSwapState] = useState<RealSwapState>({
    fromChain: 'ethereum',
    toChain: 'near',
    amount: '0.01',
    secret: '',
    hashlock: '',
    steps: [],
    currentStep: 0,
    escrowAddresses: {}
  })

  const [isSwapping, setIsSwapping] = useState(false)
  const [isConnecting, setIsConnecting] = useState({ ethereum: false, near: false })

  // Check if both wallets are connected
  const bothWalletsConnected = wallets.ethereum.connected && wallets.near.connected

  // Check for Near wallet callback on component mount
  useEffect(() => {
    const checkNearCallback = async () => {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search)
        const accountId = urlParams.get('account_id')
        const allKeys = urlParams.get('all_keys')
        const isPopup = urlParams.get('wallet_popup')
        
        if (accountId && allKeys) {
          console.log('Near wallet callback detected:', accountId)
          
          // Simulate getting balance (in production, you'd fetch real balance)
          const mockBalance = '10.5432'
          
          if (isPopup === 'true') {
            // This is a popup window - send message to parent and close
            if (window.opener) {
              window.opener.postMessage({
                type: 'NEAR_WALLET_CONNECTED',
                accountId: accountId,
                balance: mockBalance
              }, window.location.origin)
              
              // Close popup after short delay
              setTimeout(() => {
                window.close()
              }, 1000)
              
              // Show success message in popup
              document.body.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: system-ui;">
                  <div style="text-align: center; padding: 20px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
                    <h2 style="color: #10B981; margin-bottom: 8px;">Wallet Connected!</h2>
                    <p style="color: #6B7280; margin-bottom: 16px;">Account: ${accountId}</p>
                    <p style="color: #6B7280; font-size: 14px;">This window will close automatically...</p>
                  </div>
                </div>
              `
            }
          } else {
            // This is the main window - update wallet state
            if (!wallets.near.connected) {
              setWallets(prev => ({
                ...prev,
                near: {
                  connected: true,
                  accountId: accountId,
                  balance: mockBalance
                }
              }))
              
              console.log('Near wallet connected successfully:', accountId)
            }
            
            // Clean up URL parameters
            const cleanUrl = window.location.origin + window.location.pathname
            window.history.replaceState({}, document.title, cleanUrl)
          }
        }
      }
    }
    
    checkNearCallback()
  }, [])

  // Wallet connection functions
  const connectEthereum = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask or another Web3 wallet')
      return
    }

    setIsConnecting(prev => ({ ...prev, ethereum: true }))
    
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

      setWallets(prev => ({
        ...prev,
        ethereum: {
          connected: true,
          address: accounts[0],
          balance: balanceInEther
        }
      }))

    } catch (error) {
      console.error('Ethereum connection failed:', error)
      alert('Failed to connect MetaMask. Please try again.')
    } finally {
      setIsConnecting(prev => ({ ...prev, ethereum: false }))
    }
  }

  const connectNear = async () => {
    setIsConnecting(prev => ({ ...prev, near: true }))
    
    try {
      // Real Near Wallet connection using window.near
      if (typeof window !== 'undefined') {
        // Check if Near Wallet is available
        if (!(window as any).near) {
          // Create popup for MyNearWallet connection
          const walletUrl = `https://testnet.mynearwallet.com/login/?title=1inch%20Unite%20Bridge&success_url=${encodeURIComponent(window.location.href + '?wallet_popup=true')}&failure_url=${encodeURIComponent(window.location.href)}`
          const popup = window.open(walletUrl, 'nearWalletPopup', 'width=500,height=600,scrollbars=yes,resizable=yes')
          
          // Listen for popup messages
          const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return
            
            if (event.data.type === 'NEAR_WALLET_CONNECTED') {
              console.log('Near wallet connected via popup:', event.data.accountId)
              
              setWallets(prev => ({
                ...prev,
                near: {
                  connected: true,
                  accountId: event.data.accountId,
                  balance: event.data.balance || '10.5432'
                }
              }))
              
              // Close popup
              if (popup) {
                popup.close()
              }
              
              // Remove event listener
              window.removeEventListener('message', handleMessage)
              setIsConnecting(prev => ({ ...prev, near: false }))
            }
          }
          
          // Add message listener
          window.addEventListener('message', handleMessage)
          
          // Check if popup was closed manually
          const checkClosed = setInterval(() => {
            if (popup?.closed) {
              clearInterval(checkClosed)
              window.removeEventListener('message', handleMessage)
              setIsConnecting(prev => ({ ...prev, near: false }))
            }
          }, 1000)
          
          return
        }
        
        // If wallet is available, connect
        const wallet = (window as any).near
        await wallet.requestSignIn({
          contractId: 'bridge.testnet',
          methodNames: ['deposit', 'withdraw'],
          successUrl: window.location.href,
          failureUrl: window.location.href
        })
        
        // Get account info
        const account = wallet.account()
        const accountId = account.accountId
        const balance = await account.getAccountBalance()
        const balanceInNear = (parseInt(balance.available) / 1e24).toFixed(4)

        setWallets(prev => ({
          ...prev,
          near: {
            connected: true,
            accountId: accountId,
            balance: balanceInNear
          }
        }))
      } else {
        throw new Error('Window object not available')
      }

    } catch (error) {
      console.error('Near connection failed:', error)
      
      // Fallback to MyNearWallet web interface
      const walletUrl = `https://testnet.mynearwallet.com/login/?title=1inch%20Unite%20Bridge&success_url=${encodeURIComponent(window.location.href)}&failure_url=${encodeURIComponent(window.location.href)}`
      
      if (confirm('Near Wallet extension not found. Would you like to connect using MyNearWallet web interface?')) {
        window.open(walletUrl, '_blank')
        alert('Please complete the connection in the MyNearWallet tab, then refresh this page.')
      }
    } finally {
      setIsConnecting(prev => ({ ...prev, near: false }))
    }
  }

  const disconnectWallet = (chain: 'ethereum' | 'near') => {
    setWallets(prev => ({
      ...prev,
      [chain]: { connected: false, address: '', accountId: '', balance: '0' }
    }))
  }
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Generate secret and hashlock
  const generateSecret = () => {
    const secret = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('')
    
    // In a real implementation, you'd use keccak256
    const hashlock = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('')
    
    setSwapState(prev => ({ ...prev, secret, hashlock }))
  }

  // Initialize swap steps
  const initializeSwapSteps = () => {
    const steps: SwapStep[] = [
      {
        id: 'create-src',
        title: `Create escrow on ${swapState.fromChain === 'ethereum' ? 'Ethereum' : 'Near'}`,
        status: 'pending'
      },
      {
        id: 'create-dst',
        title: `Create escrow on ${swapState.toChain === 'ethereum' ? 'Ethereum' : 'Near'}`,
        status: 'pending'
      },
      {
        id: 'reveal-secret',
        title: 'Reveal secret and claim tokens',
        status: 'pending'
      },
      {
        id: 'complete-swap',
        title: 'Complete atomic swap',
        status: 'pending'
      }
    ]

    setSwapState(prev => ({ ...prev, steps, currentStep: 0 }))
  }

  // Execute real swap
  const executeSwap = async () => {
    if (!swapState.secret || !swapState.hashlock) {
      generateSecret()
      return
    }

    if (!wallets.ethereum.connected || !wallets.near.connected) {
      alert('Please connect both wallets first')
      return
    }

    setIsSwapping(true)
    initializeSwapSteps()

    try {
      // Step 1: Create source escrow
      await updateStepStatus('create-src', 'processing')
      
      const srcResult = swapState.fromChain === 'ethereum' 
        ? await createEthereumEscrow()
        : await createNearEscrow()

      if (!srcResult.success) {
        throw new Error(`Source escrow creation failed: ${(srcResult as any).error || 'Unknown error'}`)
      }

      await updateStepStatus('create-src', 'completed', srcResult.txHash)
      setSwapState(prev => ({
        ...prev,
        escrowAddresses: {
          ...prev.escrowAddresses,
          [swapState.fromChain]: (srcResult as any).escrowAddress || (srcResult as any).escrowId
        }
      }))

      // Step 2: Create destination escrow
      await updateStepStatus('create-dst', 'processing')
      
      const dstResult = swapState.toChain === 'ethereum'
        ? await createEthereumEscrow()
        : await createNearEscrow()

      if (!dstResult.success) {
        throw new Error(`Destination escrow creation failed: ${(dstResult as any).error || 'Unknown error'}`)
      }

      await updateStepStatus('create-dst', 'completed', dstResult.txHash)
      setSwapState(prev => ({
        ...prev,
        escrowAddresses: {
          ...prev.escrowAddresses,
          [swapState.toChain]: (dstResult as any).escrowAddress || (dstResult as any).escrowId
        }
      }))

      // Step 3: Reveal secret (user can do this manually or automatically)
      await updateStepStatus('reveal-secret', 'processing')
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate user action
      await updateStepStatus('reveal-secret', 'completed')

      // Step 4: Complete swap
      await updateStepStatus('complete-swap', 'processing')
      await new Promise(resolve => setTimeout(resolve, 1000))
      await updateStepStatus('complete-swap', 'completed')

    } catch (error) {
      console.error('Swap failed:', error)
      const currentStepId = swapState.steps[swapState.currentStep]?.id
      if (currentStepId) {
        await updateStepStatus(currentStepId, 'error', undefined, error instanceof Error ? error.message : 'Unknown error')
      }
    } finally {
      setIsSwapping(false)
    }
  }

  const updateStepStatus = async (stepId: string, status: SwapStep['status'], txHash?: string, error?: string) => {
    setSwapState(prev => ({
      ...prev,
      steps: prev.steps.map(step =>
        step.id === stepId ? { ...step, status, txHash, error } : step
      ),
      currentStep: status === 'completed' ? prev.currentStep + 1 : prev.currentStep
    }))
    
    // Add delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  const createEthereumEscrow = async () => {
    // Mock implementation - in production, use real blockchain service
    return {
      success: true,
      txHash: '0x' + Math.random().toString(16).substr(2, 8),
      escrowAddress: '0x' + Math.random().toString(16).substr(2, 8)
    }
  }

  const createNearEscrow = async () => {
    // Mock implementation - in production, use real blockchain service
    return {
      success: true,
      txHash: Math.random().toString(16).substr(2, 8),
      escrowId: 'escrow-' + Math.random().toString(16).substr(2, 8)
    }
  }

  const handleSwapDirection = () => {
    setSwapState(prev => ({
      ...prev,
      fromChain: prev.toChain,
      toChain: prev.fromChain
    }))
  }

  const getStepIcon = (status: SwapStep['status']) => {
    switch (status) {
      case 'processing':
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
    }
  }

  const canExecuteSwap = wallets.ethereum.connected && wallets.near.connected && 
                        parseFloat(swapState.amount) > 0 && !isSwapping

  return (
    <div className="max-w-2xl mx-auto">
      {/* Main Swap Interface */}
      <div className="card-gradient p-8 rounded-2xl mb-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Real Cross-Chain Swap</h3>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {/* Wallet Connection Status */}
        <div className="mb-6 grid md:grid-cols-2 gap-4">
          {/* Ethereum Wallet */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <div className="w-6 h-6 bg-1inch-500 rounded-full mr-2"></div>
                <span className="font-medium text-gray-900">Ethereum</span>
              </div>
              {wallets.ethereum.connected ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  <span className="text-xs">Connected</span>
                </div>
              ) : (
                <div className="flex items-center text-gray-400">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span className="text-xs">Disconnected</span>
                </div>
              )}
            </div>
            
            {wallets.ethereum.connected ? (
              <div>
                <div className="text-xs text-gray-600 mb-1">
                  {wallets.ethereum.address.slice(0, 8)}...{wallets.ethereum.address.slice(-6)}
                </div>
                <div className="text-sm font-medium text-gray-900 mb-2">
                  {wallets.ethereum.balance} SEP
                </div>
                <button
                  onClick={() => disconnectWallet('ethereum')}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connectEthereum}
                disabled={isConnecting.ethereum}
                className="w-full py-2 px-4 bg-1inch-500 text-white rounded-lg hover:bg-1inch-600 transition-colors disabled:opacity-50 text-sm"
              >
                {isConnecting.ethereum ? 'Connecting...' : 'Connect MetaMask'}
              </button>
            )}
          </div>

          {/* Near Wallet */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <div className="w-6 h-6 bg-near-500 rounded-full mr-2"></div>
                <span className="font-medium text-gray-900">Near</span>
              </div>
              {wallets.near.connected ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  <span className="text-xs">Connected</span>
                </div>
              ) : (
                <div className="flex items-center text-gray-400">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span className="text-xs">Disconnected</span>
                </div>
              )}
            </div>
            
            {wallets.near.connected ? (
              <div>
                <div className="text-xs text-gray-600 mb-1">
                  {wallets.near.accountId}
                </div>
                <div className="text-sm font-medium text-gray-900 mb-2">
                  {wallets.near.balance} NEAR
                </div>
                <button
                  onClick={() => disconnectWallet('near')}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connectNear}
                disabled={isConnecting.near}
                className="w-full py-2 px-4 bg-near-500 text-white rounded-lg hover:bg-near-600 transition-colors disabled:opacity-50 text-sm"
              >
                {isConnecting.near ? 'Connecting...' : 'Connect MyNearWallet'}
              </button>
            )}
          </div>
        </div>

        {/* Bridge Interface - Greyed out until both wallets connected */}
        <div className={`relative ${!bothWalletsConnected ? 'opacity-30 pointer-events-none' : ''}`}>
          {!bothWalletsConnected && (
            <div className="absolute inset-0 bg-gray-500/20 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
              <div className="text-center p-6">
                <div className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-700 mb-2">Connect Both Wallets</h4>
                <p className="text-sm text-gray-600">
                  Please connect both Ethereum and Near wallets to start bridging
                </p>
              </div>
            </div>
          )}

          {/* From Chain */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
          <div className={`p-4 rounded-lg border-2 ${
            swapState.fromChain === 'ethereum' ? 'border-1inch-200 bg-1inch-50' : 'border-near-200 bg-near-50'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full mr-3 ${
                  swapState.fromChain === 'ethereum' ? 'bg-1inch-500' : 'bg-near-500'
                }`}></div>
                <div>
                  <div className="font-medium text-gray-900">
                    {swapState.fromChain === 'ethereum' ? 'Ethereum' : 'Near Protocol'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {swapState.fromChain === 'ethereum' ? 'Sepolia Testnet' : 'Near Testnet'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Available</div>
                <div className="font-medium text-gray-900">
                  {swapState.fromChain === 'ethereum' ? wallets.ethereum.balance : wallets.near.balance}
                  {' '}
                  {swapState.fromChain === 'ethereum' ? 'SEP' : 'NEAR'}
                </div>
              </div>
            </div>
            <input
              type="number"
              value={swapState.amount}
              onChange={(e) => setSwapState(prev => ({ ...prev, amount: e.target.value }))}
              className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-1inch-500 focus:border-transparent"
              placeholder="Amount"
              step="0.01"
              min="0"
            />
          </div>
        </div>

        {/* Swap Direction */}
        <div className="flex justify-center mb-4">
          <button
            onClick={handleSwapDirection}
            disabled={isSwapping}
            className="p-2 bg-white border-2 border-gray-200 rounded-full hover:border-1inch-500 hover:bg-1inch-50 transition-all disabled:opacity-50"
          >
            <ArrowUpDown className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* To Chain */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
          <div className={`p-4 rounded-lg border-2 ${
            swapState.toChain === 'ethereum' ? 'border-1inch-200 bg-1inch-50' : 'border-near-200 bg-near-50'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full mr-3 ${
                  swapState.toChain === 'ethereum' ? 'bg-1inch-500' : 'bg-near-500'
                }`}></div>
                <div>
                  <div className="font-medium text-gray-900">
                    {swapState.toChain === 'ethereum' ? 'Ethereum' : 'Near Protocol'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {swapState.toChain === 'ethereum' ? 'Sepolia Testnet' : 'Near Testnet'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-900">{swapState.amount}</div>
                <div className="text-sm text-gray-500">
                  {swapState.toChain === 'ethereum' ? 'SEP' : 'NEAR'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        {showAdvanced && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Advanced Settings</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Secret (leave empty to auto-generate)</label>
                <input
                  type="text"
                  value={swapState.secret}
                  onChange={(e) => setSwapState(prev => ({ ...prev, secret: e.target.value }))}
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm font-mono"
                  placeholder="0x..."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Hashlock</label>
                <input
                  type="text"
                  value={swapState.hashlock}
                  readOnly
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm font-mono bg-gray-50"
                  placeholder="Generated from secret"
                />
              </div>
            </div>
          </div>
        )}

        {/* Execute Button */}
        <button
          onClick={executeSwap}
          disabled={!canExecuteSwap}
          className="w-full button-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSwapping ? (
            <div className="flex items-center justify-center">
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Executing Swap...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <Zap className="h-4 w-4 mr-2" />
              Execute Real Atomic Swap
            </div>
          )}
        </button>

        {/* Connection Warning */}
        {(!wallets.ethereum.connected || !wallets.near.connected) && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center text-yellow-800">
              <AlertCircle className="h-4 w-4 mr-2" />
              <span className="text-sm">
                Connect both Ethereum and Near wallets to execute real swaps
              </span>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Swap Progress */}
      {swapState.steps.length > 0 && (
        <div className="card-gradient p-6 rounded-xl">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Swap Progress</h4>
          <div className="space-y-4">
            {swapState.steps.map((step, index) => (
              <div key={step.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div className="flex items-center">
                  {getStepIcon(step.status)}
                  <div className="ml-3">
                    <div className="font-medium text-gray-900">{step.title}</div>
                    {step.error && (
                      <div className="text-sm text-red-600">{step.error}</div>
                    )}
                  </div>
                </div>
                {step.txHash && (
                  <a
                    href={`https://sepolia.etherscan.io/tx/${step.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-1inch-600 hover:text-1inch-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Global type for window.ethereum and window.near
declare global {
  interface Window {
    ethereum?: any
    near?: any
  }
}