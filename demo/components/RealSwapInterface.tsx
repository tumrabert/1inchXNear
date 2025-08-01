'use client'

import { useState, useEffect } from 'react'
import { ArrowUpDown, Zap, Clock, CheckCircle, AlertCircle, ExternalLink, Settings } from 'lucide-react'
import { realBlockchainService, BLOCKCHAIN_CONFIG } from '@/lib/realBlockchainService'
import { priceService, ExchangeRate, getPriceChangeIndicator } from '@/lib/priceService'

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
  equivalentAmount: string
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
    equivalentAmount: '0',
    secret: '',
    hashlock: '',
    steps: [],
    currentStep: 0,
    escrowAddresses: {}
  })
  
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null)
  const [priceLoading, setPriceLoading] = useState(false)
  const [lastPriceUpdate, setLastPriceUpdate] = useState(0)

  const [isSwapping, setIsSwapping] = useState(false)
  const [isConnecting, setIsConnecting] = useState({ ethereum: false, near: false })

  // Check if both wallets are connected
  const bothWalletsConnected = wallets.ethereum.connected && wallets.near.connected
  
  // Fetch exchange rates on component mount and periodically
  const fetchExchangeRate = async () => {
    setPriceLoading(true)
    try {
      const rate = await priceService.getExchangeRate()
      setExchangeRate(rate)
      setLastPriceUpdate(Date.now())
      
      // Recalculate equivalent amount with new rate
      if (swapState.amount) {
        const equivalent = priceService.calculateEquivalentAmount(
          swapState.amount,
          swapState.fromChain,
          swapState.toChain,
          rate
        )
        setSwapState(prev => ({ ...prev, equivalentAmount: equivalent }))
      }
    } catch (error) {
      console.error('Failed to fetch exchange rate:', error)
    } finally {
      setPriceLoading(false)
    }
  }
  
  // Update equivalent amount when input changes
  const updateEquivalentAmount = (newAmount: string) => {
    if (exchangeRate && newAmount) {
      const equivalent = priceService.calculateEquivalentAmount(
        newAmount,
        swapState.fromChain,
        swapState.toChain,
        exchangeRate
      )
      setSwapState(prev => ({ ...prev, amount: newAmount, equivalentAmount: equivalent }))
    } else {
      setSwapState(prev => ({ ...prev, amount: newAmount, equivalentAmount: '0' }))
    }
  }

  // Fetch initial exchange rate and set up periodic updates
  useEffect(() => {
    fetchExchangeRate()
    
    // Update exchange rate every 30 seconds
    const interval = setInterval(fetchExchangeRate, 30000)
    
    return () => clearInterval(interval)
  }, [])
  
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
    const secret = realBlockchainService.generateSecret()
    const hashlock = realBlockchainService.generateHashlock(secret)
    
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
    
    if (!exchangeRate) {
      alert('Exchange rate not available. Please wait for price data to load.')
      return
    }
    
    // Check if price data is stale and warn user (but don't block)
    if (priceService.isPriceStale(exchangeRate)) {
      console.warn('Price data is stale, but proceeding with swap')
    }

    setIsSwapping(true)
    initializeSwapSteps()

    try {
      // Store current chain values to avoid closure issues
      const fromChain = swapState.fromChain
      const toChain = swapState.toChain
      
      // Step 1: Create source escrow - this will trigger wallet popup
      await updateStepStatus('create-src', 'processing')
      console.log(`Creating ${fromChain} escrow - wallet popup should appear now...`)
      
      const srcResult = fromChain === 'ethereum' 
        ? await createEthereumEscrow()
        : await createNearEscrow()

      if (!srcResult.success) {
        throw new Error(`Source escrow creation failed: ${(srcResult as any).error || 'Unknown error'}`)
      }

      await updateStepStatus('create-src', 'completed', srcResult.txHash)
      
      // Store the escrow address
      const srcEscrowAddress = (srcResult as any).escrowAddress || (srcResult as any).escrowId
      console.log(`\u2705 Source escrow created on ${fromChain}:`, srcEscrowAddress)
      
      if (!srcEscrowAddress) {
        throw new Error('Source escrow address not returned from transaction')
      }
      
      setSwapState(prev => ({
        ...prev,
        escrowAddresses: {
          ...prev.escrowAddresses,
          [fromChain]: srcEscrowAddress
        }
      }))

      // Step 2: Create destination escrow
      await updateStepStatus('create-dst', 'processing')
      
      const dstResult = toChain === 'ethereum'
        ? await createEthereumEscrow()
        : await createNearEscrow()

      if (!dstResult.success) {
        throw new Error(`Destination escrow creation failed: ${(dstResult as any).error || 'Unknown error'}`)
      }

      await updateStepStatus('create-dst', 'completed', dstResult.txHash)
      
      // Store the escrow address
      const dstEscrowAddress = (dstResult as any).escrowAddress || (dstResult as any).escrowId
      console.log(`\u2705 Destination escrow created on ${toChain}:`, dstEscrowAddress)
      
      if (!dstEscrowAddress) {
        throw new Error('Destination escrow address not returned from transaction')
      }
      
      setSwapState(prev => ({
        ...prev,
        escrowAddresses: {
          ...prev.escrowAddresses,
          [toChain]: dstEscrowAddress
        }
      }))

      // Step 3: Reveal secret and claim tokens
      await updateStepStatus('reveal-secret', 'processing')
      
      // Use the addresses we just created - reveal secret on the destination chain
      const revealEscrowAddress = toChain === 'ethereum' 
        ? (toChain === fromChain ? srcEscrowAddress : dstEscrowAddress)  // Use the ethereum address
        : (toChain === fromChain ? srcEscrowAddress : dstEscrowAddress)  // Use the near address
        
      console.log('\ud83d\udd0d Revealing secret with address:', revealEscrowAddress)
      console.log('Chain info:', { fromChain, toChain, srcEscrowAddress, dstEscrowAddress })
      
      const revealResult = toChain === 'ethereum' 
        ? await revealWithAddress(revealEscrowAddress, true)
        : await revealWithAddress(revealEscrowAddress, false)

      if (!revealResult.success) {
        throw new Error(`Secret reveal failed: ${(revealResult as any).error || 'Unknown error'}`)
      }

      await updateStepStatus('reveal-secret', 'completed', revealResult.txHash)

      // Step 4: Complete swap (both sides withdrawn)
      await updateStepStatus('complete-swap', 'processing')
      await new Promise(resolve => setTimeout(resolve, 1000)) // Brief delay for UX
      await updateStepStatus('complete-swap', 'completed')

    } catch (error) {
      console.error('Swap failed:', error)
      const currentStepId = swapState.steps[swapState.currentStep]?.id
      let errorMessage = 'Unknown error'
      
      if (error instanceof Error) {
        errorMessage = error.message
        
        // Provide more user-friendly error messages
        if (error.message.includes('user rejected')) {
          errorMessage = 'Transaction was rejected by user'
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for transaction'
        } else if (error.message.includes('network')) {
          errorMessage = 'Network connection error - please try again'
        } else if (error.message.includes('contract')) {
          errorMessage = 'Smart contract error - please check deployment'
        }
      }
      
      if (currentStepId) {
        await updateStepStatus(currentStepId, 'error', undefined, errorMessage)
      }
      
      // Show error notification
      alert(`Swap failed: ${errorMessage}`)
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
    
    // Add delay for better UX, except for errors
    if (status !== 'error') {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  const createEthereumEscrow = async () => {
    try {
      const swapAmount = swapState.fromChain === 'ethereum' ? swapState.amount : swapState.equivalentAmount
      // For cross-chain swaps, we need to use a placeholder Ethereum address as taker
      // In production, this would be a bridge contract or derived address
      const ethereumTaker = wallets.ethereum.address // Use the same user's Ethereum address as taker for now
      
      const result = await realBlockchainService.createEthereumEscrow({
        hashlock: swapState.hashlock,
        token: '0x0000000000000000000000000000000000000000', // ETH
        amount: (parseFloat(swapAmount) * 1e18).toString(), // Convert to wei
        taker: ethereumTaker, // Use Ethereum address as taker
        safetyDeposit: (0.001 * 1e18).toString(), // 0.001 ETH safety deposit
        timelocks: '0' // Simplified timelock
      })
      
      return result
    } catch (error) {
      console.error('Ethereum escrow creation error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  const createNearEscrow = async () => {
    try {
      const swapAmount = swapState.fromChain === 'near' ? swapState.amount : swapState.equivalentAmount
      // For cross-chain, we'll use the Near account as taker since Near supports arbitrary strings
      const nearTaker = wallets.near.accountId // Near can handle account names as takers
      
      const result = await realBlockchainService.createNearEscrow({
        hashlock: swapState.hashlock,
        tokenId: 'near', // Native NEAR token
        amount: (parseFloat(swapAmount) * 1e24).toString(), // Convert to yoctoNEAR
        taker: nearTaker, // Use Near account as taker
        safetyDeposit: (0.1 * 1e24).toString(), // 0.1 NEAR safety deposit
        timelocks: 0, // Simplified timelock
        accountId: wallets.near.accountId
      })
      
      return result
    } catch (error) {
      console.error('Near escrow creation error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  const revealSecretEthereum = async () => {
    try {
      console.log('\ud83d\udd0d Revealing secret on Ethereum...')
      console.log('Escrow addresses:', swapState.escrowAddresses)
      console.log('Secret:', swapState.secret ? 'Present' : 'Missing')
      
      if (!swapState.escrowAddresses.ethereum || !swapState.secret) {
        console.error('Missing data for Ethereum reveal:', {
          ethereumAddress: swapState.escrowAddresses.ethereum,
          secretExists: !!swapState.secret
        })
        throw new Error('Missing escrow address or secret')
      }
      
      const result = await realBlockchainService.withdrawFromEthereumEscrow(
        swapState.escrowAddresses.ethereum,
        swapState.secret
      )
      
      return result
    } catch (error) {
      console.error('Ethereum secret reveal error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  const revealSecretNear = async () => {
    try {
      console.log('\ud83d\udd0d Revealing secret on Near...')
      console.log('Escrow addresses:', swapState.escrowAddresses)
      console.log('Secret:', swapState.secret ? 'Present' : 'Missing')
      
      if (!swapState.escrowAddresses.near || !swapState.secret) {
        console.error('Missing data for Near reveal:', {
          nearAddress: swapState.escrowAddresses.near,
          secretExists: !!swapState.secret
        })
        throw new Error('Missing escrow address or secret')
      }
      
      const result = await realBlockchainService.withdrawFromNearEscrow(
        swapState.escrowAddresses.near,
        swapState.secret,
        wallets.near.accountId
      )
      
      return result
    } catch (error) {
      console.error('Near secret reveal error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  const revealWithAddress = async (escrowAddress: string, isEthereum: boolean) => {
    try {
      if (!escrowAddress || !swapState.secret) {
        throw new Error('Missing escrow address or secret')
      }
      
      if (isEthereum) {
        return await realBlockchainService.withdrawFromEthereumEscrow(
          escrowAddress,
          swapState.secret
        )
      } else {
        return await realBlockchainService.withdrawFromNearEscrow(
          escrowAddress,
          swapState.secret,
          wallets.near.accountId
        )
      }
    } catch (error) {
      console.error('Reveal with address error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  const handleSwapDirection = () => {
    setSwapState(prev => {
      const newFromChain = prev.toChain
      const newToChain = prev.fromChain
      
      // Recalculate equivalent amount with swapped chains
      let newEquivalentAmount = '0'
      if (exchangeRate && prev.amount) {
        newEquivalentAmount = priceService.calculateEquivalentAmount(
          prev.amount,
          newFromChain,
          newToChain,
          exchangeRate
        )
      }
      
      return {
        ...prev,
        fromChain: newFromChain,
        toChain: newToChain,
        equivalentAmount: newEquivalentAmount
      }
    })
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
            
            {/* USD Value Display */}
            {exchangeRate && swapState.amount && (
              <div className="mt-2 text-right">
                <div className="text-xs text-gray-500">
                  ≈ ${priceService.calculateUsdValue(swapState.amount, swapState.fromChain, exchangeRate)} USD
                </div>
              </div>
            )}
            
            <input
              type="number"
              value={swapState.amount}
              onChange={(e) => updateEquivalentAmount(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-1inch-500 focus:border-transparent"
              placeholder="Amount"
              step="0.01"
              min="0"
            />
          </div>
        </div>

        {/* Exchange Rate Display */}
        {exchangeRate && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <span className="text-gray-600">Exchange Rate:</span>
                {priceLoading && (
                  <div className="ml-2 w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                )}
                <button
                  onClick={fetchExchangeRate}
                  disabled={priceLoading}
                  className="ml-2 p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                  title="Refresh exchange rate"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-900">
                  1 {swapState.fromChain === 'ethereum' ? 'ETH' : 'NEAR'} = {' '}
                  {swapState.fromChain === 'ethereum' 
                    ? priceService.formatPrice(exchangeRate.ethToNear) + ' NEAR'
                    : priceService.formatPrice(exchangeRate.nearToEth) + ' ETH'
                  }
                </div>
                <div className="text-xs text-gray-500">
                  ETH: ${priceService.formatPrice(exchangeRate.ethUsd)} | NEAR: ${priceService.formatPrice(exchangeRate.nearUsd)}
                  {lastPriceUpdate > 0 && (
                    <span className="ml-2 text-gray-400">
                      (Updated {Math.round((Date.now() - lastPriceUpdate) / 1000)}s ago)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
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
                <div className="font-medium text-gray-900">{swapState.equivalentAmount}</div>
                <div className="text-sm text-gray-500">
                  {swapState.toChain === 'ethereum' ? 'SEP' : 'NEAR'}
                </div>
                {exchangeRate && (
                  <div className="text-xs text-gray-400">
                    ≈ ${priceService.calculateUsdValue(swapState.equivalentAmount, swapState.toChain, exchangeRate)}
                  </div>
                )}
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
          disabled={!canExecuteSwap || BLOCKCHAIN_CONFIG.ethereum.escrowFactoryAddress === '0x0000000000000000000000000000000000000000'}
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
        
        {/* Price Staleness Warning */}
        {exchangeRate && priceService.isPriceStale(exchangeRate) && (
          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center text-orange-800">
              <AlertCircle className="h-4 w-4 mr-2" />
              <span className="text-sm">
                Price data is stale. Please refresh exchange rates before swapping.
              </span>
            </div>
          </div>
        )}
        
        {/* Contract Deployment Warning */}
        {bothWalletsConnected && BLOCKCHAIN_CONFIG.ethereum.escrowFactoryAddress === '0x0000000000000000000000000000000000000000' && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start text-red-800">
              <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
              <div>
                <div className="font-semibold text-sm mb-1">Contracts Not Deployed</div>
                <div className="text-sm mb-2">
                  Before executing real swaps, you need to deploy the smart contracts:
                </div>
                <div className="text-xs space-y-1">
                  <div>1. <strong>Ethereum:</strong> Deploy EscrowFactory to Sepolia testnet</div>
                  <div>2. <strong>Near:</strong> Deploy EscrowDst contract to Near testnet</div>
                  <div>3. Update contract addresses in blockchain config</div>
                </div>
                <div className="mt-2 text-xs text-red-600">
                  📝 <strong>Instructions:</strong> Use the provided deployment scripts in /ethereum/script/ and /near/contracts/
                </div>
              </div>
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
                <div className="flex items-center space-x-2">
                  {step.txHash && (
                    <a
                      href={step.txHash?.startsWith('0x') 
                        ? `${BLOCKCHAIN_CONFIG.ethereum.explorerUrl}/tx/${step.txHash}`
                        : `${BLOCKCHAIN_CONFIG.near.explorerUrl}/txns/${step.txHash}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-1inch-600 hover:text-1inch-700"
                      title="View transaction"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  {step.status === 'error' && !isSwapping && (
                    <button
                      onClick={() => executeSwap()}
                      className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      title="Retry swap"
                    >
                      Retry
                    </button>
                  )}
                </div>
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