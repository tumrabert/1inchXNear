// 1inch Fusion+ Near Extension Service
import { ethers } from 'ethers'

// New deployed contract addresses
export const FUSION_EXTENSION_CONFIG = {
  ethereum: {
    limitOrderProtocol: '0xfCD530747560A12424206998c2866194663A0230',
    fusionNearExtension: '0x94498d8D022c7A56FbD41e0e1637b7DB39bf796B',
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
  }
]

// ABI for FusionNearExtension
const FUSION_EXTENSION_ABI = [
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
    return ethers.keccak256(ethers.toUtf8Bytes(secret))
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
          params.fromToken, // token address
          params.nearAccount,
          Math.floor(Date.now() / 1000) + 3600 // 1 hour deadline
        ]
      )

      // Create the limit order
      const order: Order = {
        maker: params.makerAddress,
        makerAsset: params.fromToken, // address(0) for ETH
        takerAsset: params.toToken,   // address(0) for ETH
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

      console.log('🔄 Filling cross-chain order...')
      
      // Calculate required ETH value if dealing with ETH
      const value = order.takerAsset === ethers.ZeroAddress ? takingAmount : '0'

      const tx = await protocol.fillOrder(
        order,
        signature,
        takingAmount,
        FUSION_EXTENSION_CONFIG.ethereum.fusionNearExtension,
        { value }
      )

      console.log('📤 Fill transaction sent:', tx.hash)
      const receipt = await tx.wait()

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
      
      const tx = await extension.revealSecret(orderHash, ethers.keccak256(ethers.toUtf8Bytes(secret)))
      console.log('📤 Reveal transaction sent:', tx.hash)
      
      const receipt = await tx.wait()

      return {
        success: true,
        txHash: receipt.hash,
        explorerUrl: `${FUSION_EXTENSION_CONFIG.ethereum.explorerUrl}/tx/${receipt.hash}`
      }

    } catch (error) {
      console.error('Secret reveal failed:', error)
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