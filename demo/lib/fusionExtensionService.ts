// 1inch Fusion+ Near Extension Service
import { ethers } from 'ethers'

// Updated deployed contract addresses (Fixed cross-chain token handling)
export const FUSION_EXTENSION_CONFIG = {
  ethereum: {
    limitOrderProtocol: '0x45406E6742247DD5535D8FC22B19b93Dc543b6Ef',
    fusionNearExtension: '0xBc5124B5ebd36Dc45C79162c060D0F590b50d170',
    chainId: '0xaa36a7', // Sepolia
    explorerUrl: 'https://sepolia.etherscan.io'
  },
  near: {
    escrowContractId: 'escrow-bridge-1754031906.testnet',
    networkId: 'testnet',
    explorerUrl: 'https://testnet.nearblocks.io'
  }
}

// ABI for SimpleLimitOrderProtocol
const LIMIT_ORDER_PROTOCOL_ABI = [
  {
    "inputs": [
      {
        "components": [
          {"name": "maker", "type": "address"},
          {"name": "makerAsset", "type": "address"},
          {"name": "takerAsset", "type": "address"},
          {"name": "makingAmount", "type": "uint256"},
          {"name": "takingAmount", "type": "uint256"},
          {"name": "salt", "type": "uint256"},
          {"name": "deadline", "type": "uint256"},
          {"name": "postInteraction", "type": "bytes"}
        ],
        "name": "order",
        "type": "tuple"
      },
      {"name": "signature", "type": "bytes"},
      {"name": "takingAmount", "type": "uint256"},
      {"name": "postInteractionTarget", "type": "address"}
    ],
    "name": "fillOrder",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {"name": "maker", "type": "address"},
          {"name": "makerAsset", "type": "address"},
          {"name": "takerAsset", "type": "address"},
          {"name": "makingAmount", "type": "uint256"},
          {"name": "takingAmount", "type": "uint256"},
          {"name": "salt", "type": "uint256"},
          {"name": "deadline", "type": "uint256"},
          {"name": "postInteraction", "type": "bytes"}
        ],
        "name": "order",
        "type": "tuple"
      }
    ],
    "name": "getOrderHash",
    "outputs": [{"name": "", "type": "bytes32"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "DOMAIN_SEPARATOR",
    "outputs": [{"name": "", "type": "bytes32"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "orderHash", "type": "bytes32"},
      {"indexed": true, "name": "maker", "type": "address"},
      {"indexed": true, "name": "taker", "type": "address"},
      {"indexed": false, "name": "makingAmount", "type": "uint256"},
      {"indexed": false, "name": "takingAmount", "type": "uint256"}
    ],
    "name": "OrderFilled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "orderHash", "type": "bytes32"},
      {"indexed": false, "name": "reason", "type": "bytes"}
    ],
    "name": "PostInteractionFailed",
    "type": "event"
  }
]

// ABI for FusionNearExtension
const FUSION_EXTENSION_ABI = [
  {
    "inputs": [
      {"name": "orderHash", "type": "bytes32"},
      {"name": "maker", "type": "address"},
      {"name": "taker", "type": "address"},
      {"name": "makingAmount", "type": "uint256"},
      {"name": "takingAmount", "type": "uint256"},
      {"name": "interactionData", "type": "bytes"}
    ],
    "name": "processLimitOrderFill",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "orderHash", "type": "bytes32"},
      {"name": "secret", "type": "bytes32"}
    ],
    "name": "revealSecret",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "orderHash", "type": "bytes32"}
    ],
    "name": "getOrder",
    "outputs": [
      {
        "components": [
          {"name": "maker", "type": "address"},
          {"name": "taker", "type": "address"},
          {"name": "hashlock", "type": "bytes32"},
          {"name": "token", "type": "address"},
          {"name": "amount", "type": "uint256"},
          {"name": "nearAccount", "type": "string"},
          {"name": "deadline", "type": "uint256"},
          {"name": "completed", "type": "bool"},
          {"name": "cancelled", "type": "bool"},
          {"name": "revealedSecret", "type": "bytes32"}
        ],
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "resolver", "type": "address"}
    ],
    "name": "authorizeResolver",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "", "type": "address"}
    ],
    "name": "authorizedResolvers",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "maker", "type": "address"},
      {"indexed": true, "name": "taker", "type": "address"},
      {"indexed": true, "name": "orderHash", "type": "bytes32"},
      {"indexed": false, "name": "hashlock", "type": "bytes32"},
      {"indexed": false, "name": "token", "type": "address"},
      {"indexed": false, "name": "amount", "type": "uint256"},
      {"indexed": false, "name": "nearAccount", "type": "string"}
    ],
    "name": "CrossChainSwapInitiated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "orderHash", "type": "bytes32"},
      {"indexed": false, "name": "secret", "type": "bytes32"}
    ],
    "name": "SecretRevealed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "orderHash", "type": "bytes32"}
    ],
    "name": "SwapCompleted",
    "type": "event"
  }
]

interface Order {
  maker: string
  makerAsset: string
  takerAsset: string
  makingAmount: string
  takingAmount: string
  salt: string
  deadline: string
  postInteraction: string
}

interface CrossChainSwapParams {
  fromChain: 'ethereum' | 'near'
  toChain: 'ethereum' | 'near'
  fromToken: string
  toToken: string
  fromAmount: string
  toAmount: string
  makerAddress: string
  nearAccount: string
  secret: string
}

export class FusionExtensionService {
  
  generateSecret(): string {
    const randomBytes = new Uint8Array(32)
    crypto.getRandomValues(randomBytes)
    return '0x' + Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  generateHashlock(secret: string): string {
    // Create a simple hash of the secret for the hashlock
    // In production, this should match the contract's hashing logic (keccak256)
    // For demo purposes, using a simple hash
    let hash = 0
    for (let i = 0; i < secret.length; i++) {
      const char = secret.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return '0x' + Math.abs(hash).toString(16).padStart(64, '0')
  }

  /**
   * Get proper token address for cross-chain orders
   * For cross-chain swaps, we need to distinguish between ETH and cross-chain tokens
   */
  private getTokenAddress(tokenIdentifier: string, chain: 'ethereum' | 'near'): string {
    // If it's already an Ethereum address (like 0x0000... for ETH), use it as-is
    if (tokenIdentifier === '0x0000000000000000000000000000000000000000') {
      return ethers.ZeroAddress // ETH
    }
    
    // Handle Near token identifier
    if (tokenIdentifier === 'NEAR' || chain === 'near') {
      return '0x0000000000000000000000000000000000000001' // Near token placeholder
    }
    
    // For other cross-chain tokens, use placeholder addresses
    return '0x0000000000000000000000000000000000000001' // Near token placeholder
  }

  generateHashlock(secret: string): string {
    // The contract uses keccak256(abi.encode(secret)) where secret is bytes32
    // So we need to convert string to bytes32 first, then abi.encode it
    const secretBytes32 = ethers.keccak256(ethers.toUtf8Bytes(secret))
    return ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['bytes32'], [secretBytes32]))
  }

  /**
   * Create a limit order with cross-chain post-interaction
   */
  async createCrossChainOrder(params: CrossChainSwapParams) {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not found')
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      
      // Generate hashlock from secret
      const hashlock = this.generateHashlock(params.secret)
      
      // Create post-interaction data for Near extension
      const postInteractionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['bytes32', 'address', 'string', 'uint256'],
        [
          hashlock,
          this.getTokenAddress(params.fromToken, params.fromChain), // token address
          params.nearAccount,
          Math.floor(Date.now() / 1000) + 3600 // 1 hour deadline
        ]
      )

      // Create the limit order with proper token addresses
      const order: Order = {
        maker: params.makerAddress,
        makerAsset: this.getTokenAddress(params.fromToken, params.fromChain),
        takerAsset: this.getTokenAddress(params.toToken, params.toChain),
        makingAmount: params.fromAmount,
        takingAmount: params.toAmount,
        salt: Math.floor(Math.random() * 1000000).toString(),
        deadline: (Math.floor(Date.now() / 1000) + 3600).toString(), // 1 hour
        postInteraction: postInteractionData
      }

      console.log('📝 Created cross-chain order:', order)

      // Get order hash for signing
      const protocol = new ethers.Contract(
        FUSION_EXTENSION_CONFIG.ethereum.limitOrderProtocol,
        LIMIT_ORDER_PROTOCOL_ABI,
        signer
      )

      const orderHash = await protocol.getOrderHash(order)
      console.log('📋 Order hash:', orderHash)

      // Sign the order using EIP-712
      const domain = {
        name: 'SimpleLimitOrderProtocol',
        version: '1',
        chainId: 11155111, // Sepolia
        verifyingContract: FUSION_EXTENSION_CONFIG.ethereum.limitOrderProtocol
      }

      const types = {
        Order: [
          { name: 'maker', type: 'address' },
          { name: 'makerAsset', type: 'address' },
          { name: 'takerAsset', type: 'address' },
          { name: 'makingAmount', type: 'uint256' },
          { name: 'takingAmount', type: 'uint256' },
          { name: 'salt', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'postInteraction', type: 'bytes' }
        ]
      }

      console.log('✍️ Signing order...')
      const signature = await signer.signTypedData(domain, types, order)
      console.log('✅ Order signed:', signature)

      return {
        success: true,
        order,
        orderHash,
        signature,
        secret: params.secret,
        hashlock,
        postInteractionData
      }

    } catch (error) {
      console.error('Cross-chain order creation failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Fill a cross-chain order (called by resolver/taker)
   */
  async fillCrossChainOrder(
    order: Order,
    signature: string,
    takingAmount: string
  ) {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not found')
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()

      const protocol = new ethers.Contract(
        FUSION_EXTENSION_CONFIG.ethereum.limitOrderProtocol,
        LIMIT_ORDER_PROTOCOL_ABI,
        signer
      )

      console.log('🔄 Filling cross-chain order...', {
        order,
        takingAmount,
        takerAsset: order.takerAsset,
        isETH: order.takerAsset === ethers.ZeroAddress
      })
      
      // Calculate required ETH value for cross-chain swaps
      // The resolver needs to provide ETH when the maker is offering ETH (makerAsset is ETH)
      // In ETH → Near swaps: maker offers ETH, taker provides Near equivalent
      const value = order.makerAsset === ethers.ZeroAddress ? order.makingAmount : '0'
      
      console.log('💸 Transaction value:', {
        value,
        valueInETH: ethers.formatEther(value)
      })

      // Check wallet balance before attempting transaction
      const signerAddress = await signer.getAddress()
      const balance = await provider.getBalance(signerAddress)
      const estimatedGasCost = ethers.parseUnits('20', 'gwei') * 500000n // gas price * gas limit
      const totalRequired = BigInt(value) + estimatedGasCost
      
      if (balance < totalRequired) {
        throw new Error(`Insufficient funds: need ${ethers.formatEther(totalRequired)} ETH, have ${ethers.formatEther(balance)} ETH. Get testnet ETH from Sepolia faucet.`)
      }

      // Debug: Check authorization status before filling
      console.log('🔍 Checking authorization status before filling order...')
      await this.checkAuthorizationStatus()

      // Get order hash for debugging
      const orderHash = await protocol.getOrderHash(order)
      console.log('🔑 Order hash for filling:', orderHash)

      const tx = await protocol.fillOrder(
        order,
        signature,
        takingAmount,
        FUSION_EXTENSION_CONFIG.ethereum.fusionNearExtension,
        { 
          value,
          gasLimit: 500000, // Set reasonable gas limit
          gasPrice: ethers.parseUnits('20', 'gwei') // Set reasonable gas price for Sepolia
        }
      )

      console.log('📤 Fill transaction sent:', tx.hash)
      const receipt = await tx.wait()

      // Check for events in the transaction receipt
      console.log('📋 Transaction receipt:', receipt)
      console.log('📊 Events emitted:', receipt.logs.length)
      
      // Parse events from both contracts
      const protocolInterface = new ethers.Interface(LIMIT_ORDER_PROTOCOL_ABI)
      const extensionInterface = new ethers.Interface(FUSION_EXTENSION_ABI)
      
      receipt.logs.forEach((log, index) => {
        try {
          // Try parsing as protocol event
          if (log.address.toLowerCase() === FUSION_EXTENSION_CONFIG.ethereum.limitOrderProtocol.toLowerCase()) {
            const parsed = protocolInterface.parseLog(log)
            console.log(`🎯 Protocol Event ${index}:`, parsed?.name, parsed?.args)
          }
          // Try parsing as extension event
          else if (log.address.toLowerCase() === FUSION_EXTENSION_CONFIG.ethereum.fusionNearExtension.toLowerCase()) {
            const parsed = extensionInterface.parseLog(log)
            console.log(`🌉 Extension Event ${index}:`, parsed?.name, parsed?.args)
          }
        } catch (e) {
          console.log(`⚠️ Unparsed log ${index}:`, log)
        }
      })

      // Check if order was created in extension
      setTimeout(async () => {
        try {
          console.log('🔍 Checking if order was created in extension...')
          const extension = new ethers.Contract(
            FUSION_EXTENSION_CONFIG.ethereum.fusionNearExtension,
            FUSION_EXTENSION_ABI,
            provider
          )
          const orderDetails = await extension.getOrder(orderHash)
          console.log('📋 Order in extension:', orderDetails)
          
          if (orderDetails.maker === ethers.ZeroAddress) {
            console.log('❌ Order was NOT created in extension')
          } else {
            console.log('✅ Order was successfully created in extension')
          }
        } catch (error) {
          console.error('❌ Error checking order in extension:', error)
        }
      }, 2000) // Check after 2 seconds

      return {
        success: true,
        txHash: receipt.hash,
        gasUsed: receipt.gasUsed.toString(),
        explorerUrl: `${FUSION_EXTENSION_CONFIG.ethereum.explorerUrl}/tx/${receipt.hash}`
      }

    } catch (error) {
      console.error('Order fill failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Reveal secret to complete cross-chain swap
   */
  async revealSecret(orderHash: string, secret: string) {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not found')
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()

      const extension = new ethers.Contract(
        FUSION_EXTENSION_CONFIG.ethereum.fusionNearExtension,
        FUSION_EXTENSION_ABI,
        signer
      )

      console.log('🔓 Revealing secret for order:', orderHash)
      console.log('🔑 Secret:', secret)
      
      // First check if order exists
      try {
        const orderDetails = await extension.getOrder(orderHash)
        console.log('📋 Order details:', orderDetails)
        
        if (orderDetails.maker === ethers.ZeroAddress) {
          throw new Error('Order does not exist in FusionNearExtension contract. The fillOrder transaction may not have triggered the post-interaction correctly.')
        }
        
        if (orderDetails.completed) {
          throw new Error('Order is already completed')
        }
        
        if (orderDetails.cancelled) {
          throw new Error('Order has been cancelled')
        }
        
      } catch (orderCheckError) {
        console.error('Order check failed:', orderCheckError)
        if (orderCheckError instanceof Error && orderCheckError.message.includes('Order does not exist')) {
          throw orderCheckError
        }
        throw new Error(`Failed to verify order existence: ${orderCheckError instanceof Error ? orderCheckError.message : 'Unknown error'}`)
      }
      
      // Convert secret string to bytes32 for the contract
      // The contract expects the secret as bytes32 and does keccak256(abi.encode(secret))
      const secretBytes32 = ethers.keccak256(ethers.toUtf8Bytes(secret))
      console.log('🔐 Secret (string):', secret)
      console.log('🔐 Secret as bytes32:', secretBytes32)
      
      // Debug: Calculate what the hashlock should be
      const expectedHashlock = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['bytes32'], [secretBytes32]))
      console.log('🔐 Expected hashlock:', expectedHashlock)
      
      // Try to estimate gas first to catch revert reasons
      try {
        const gasEstimate = await extension.revealSecret.estimateGas(orderHash, secretBytes32)
        console.log('⛽ Gas estimate for revealSecret:', gasEstimate.toString())
      } catch (gasError) {
        console.error('❌ Gas estimation failed:', gasError)
        throw new Error(`Transaction would fail: ${gasError instanceof Error ? gasError.message : 'Unknown gas estimation error'}`)
      }
      
      const tx = await extension.revealSecret(orderHash, secretBytes32, {
        gasLimit: 200000, // Set reasonable gas limit
        gasPrice: ethers.parseUnits('20', 'gwei')
      })
      console.log('📤 Reveal transaction sent:', tx.hash)
      
      const receipt = await tx.wait()

      return {
        success: true,
        txHash: receipt.hash,
        explorerUrl: `${FUSION_EXTENSION_CONFIG.ethereum.explorerUrl}/tx/${receipt.hash}`
      }

    } catch (error) {
      console.error('Secret reveal failed:', error)
      
      if (error instanceof Error) {
        if (error.message.includes('Order does not exist')) {
          return {
            success: false,
            error: 'Order was not properly created in the cross-chain extension. This likely means the fillOrder transaction did not trigger the post-interaction correctly. Please check that the SimpleLimitOrderProtocol is authorized as a resolver.'
          }
        }
        
        if (error.message.includes('Invalid secret')) {
          return {
            success: false,
            error: 'The provided secret does not match the order hashlock. Please verify the secret is correct.'
          }
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Authorize SimpleLimitOrderProtocol as a resolver (owner-only function)
   */
  async authorizeResolver() {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not found')
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const currentAccount = await signer.getAddress()

      const extension = new ethers.Contract(
        FUSION_EXTENSION_CONFIG.ethereum.fusionNearExtension,
        [
          "function authorizeResolver(address resolver) external",
          "function authorizedResolvers(address) external view returns (bool)",
          "function owner() external view returns (address)"
        ],
        signer
      )

      // Check contract owner
      const contractOwner = await extension.owner()
      console.log('📋 Contract owner:', contractOwner)
      console.log('📋 Current account:', currentAccount)

      if (contractOwner.toLowerCase() !== currentAccount.toLowerCase()) {
        return {
          success: false,
          error: `Only contract owner can authorize resolvers. Current owner: ${contractOwner}, Your account: ${currentAccount}. Please connect with the deployer wallet.`
        }
      }

      // Check if already authorized
      const isAuthorized = await extension.authorizedResolvers(
        FUSION_EXTENSION_CONFIG.ethereum.limitOrderProtocol
      )

      if (isAuthorized) {
        return {
          success: true,
          message: 'SimpleLimitOrderProtocol is already authorized',
          alreadyAuthorized: true
        }
      }

      console.log('🔓 Authorizing SimpleLimitOrderProtocol as resolver...')
      console.log('📝 Resolver address:', FUSION_EXTENSION_CONFIG.ethereum.limitOrderProtocol)
      
      // Estimate gas first
      const gasEstimate = await extension.authorizeResolver.estimateGas(
        FUSION_EXTENSION_CONFIG.ethereum.limitOrderProtocol
      )
      console.log('⛽ Gas estimate:', gasEstimate.toString())

      const tx = await extension.authorizeResolver(
        FUSION_EXTENSION_CONFIG.ethereum.limitOrderProtocol,
        {
          gasLimit: Math.floor(Number(gasEstimate) * 1.2), // Add 20% buffer
          gasPrice: ethers.parseUnits('20', 'gwei')
        }
      )
      
      console.log('📤 Authorization transaction sent:', tx.hash)
      const receipt = await tx.wait()

      return {
        success: true,
        txHash: receipt.hash,
        message: 'SimpleLimitOrderProtocol authorized successfully!',
        explorerUrl: `${FUSION_EXTENSION_CONFIG.ethereum.explorerUrl}/tx/${receipt.hash}`
      }

    } catch (error) {
      console.error('Authorization failed:', error)
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Ownable: caller is not the owner')) {
          return {
            success: false,
            error: 'Only the contract owner can authorize resolvers. Please connect with the wallet that deployed the contract.'
          }
        }
        
        if (error.message.includes('execution reverted')) {
          return {
            success: false,
            error: `Contract execution failed: ${error.message}. Check if you're the contract owner.`
          }
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown authorization error'
      }
    }
  }

  /**
   * Debug function to check authorization status
   */
  async checkAuthorizationStatus() {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not found')
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      
      const extension = new ethers.Contract(
        FUSION_EXTENSION_CONFIG.ethereum.fusionNearExtension,
        FUSION_EXTENSION_ABI,
        provider
      )

      const isAuthorized = await extension.authorizedResolvers(
        FUSION_EXTENSION_CONFIG.ethereum.limitOrderProtocol
      )

      console.log('🔐 Authorization Status:')
      console.log('  SimpleLimitOrderProtocol:', FUSION_EXTENSION_CONFIG.ethereum.limitOrderProtocol)
      console.log('  Is Authorized:', isAuthorized)

      return {
        success: true,
        isAuthorized,
        resolverAddress: FUSION_EXTENSION_CONFIG.ethereum.limitOrderProtocol
      }

    } catch (error) {
      console.error('Authorization check failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get cross-chain order details
   */
  async getCrossChainOrder(orderHash: string) {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not found')
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      
      const extension = new ethers.Contract(
        FUSION_EXTENSION_CONFIG.ethereum.fusionNearExtension,
        FUSION_EXTENSION_ABI,
        provider
      )

      const orderDetails = await extension.getOrder(orderHash)
      
      return {
        success: true,
        order: {
          maker: orderDetails.maker,
          taker: orderDetails.taker,
          hashlock: orderDetails.hashlock,
          token: orderDetails.token,
          amount: orderDetails.amount.toString(),
          nearAccount: orderDetails.nearAccount,
          deadline: orderDetails.deadline.toString(),
          completed: orderDetails.completed,
          cancelled: orderDetails.cancelled,
          revealedSecret: orderDetails.revealedSecret
        }
      }

    } catch (error) {
      console.error('Get order failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

// Singleton instance
export const fusionExtensionService = new FusionExtensionService()