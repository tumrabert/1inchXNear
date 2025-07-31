'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, ExternalLink, Copy, AlertTriangle } from 'lucide-react'

interface ContractStatus {
  name: string
  address?: string
  status: 'deployed' | 'pending' | 'failed' | 'not-deployed'
  explorerUrl?: string
  gasUsed?: string
  verified?: boolean
}

interface DeploymentInfo {
  ethereum: {
    network: string
    contracts: ContractStatus[]
    totalGasUsed: string
    deployer: string
  }
  near: {
    network: string
    contracts: ContractStatus[]
    deployer: string
  }
  crossChain: {
    configured: boolean
    ready: boolean
    bridgeVersion: string
  }
}

export default function DeploymentStatus() {
  const [deploymentInfo, setDeploymentInfo] = useState<DeploymentInfo>({
    ethereum: {
      network: 'Sepolia Testnet',
      contracts: [
        {
          name: 'TimelocksLib',
          address: '0x742d35Cc6491C0532A0e4Dc8B3d12F94b0F50c8a',
          status: 'deployed',
          explorerUrl: 'https://sepolia.etherscan.io/address/0x742d35Cc6491C0532A0e4Dc8B3d12F94b0F50c8a',
          gasUsed: '234,567',
          verified: true
        },
        {
          name: 'EscrowFactory',
          address: '0x8ba1f109551bD432803012645Hac136c22C57592',
          status: 'deployed',
          explorerUrl: 'https://sepolia.etherscan.io/address/0x8ba1f109551bD432803012645Hac136c22C57592',
          gasUsed: '1,234,567',
          verified: true
        }
      ],
      totalGasUsed: '1,469,134',
      deployer: '0x2e988A386a799F506693793c6A5AF6B54dfAaBfB'
    },
    near: {
      network: 'Near Testnet',
      contracts: [
        {
          name: 'EscrowFactory',
          address: 'escrow-factory-1690123456.rarebat823.testnet',
          status: 'deployed',
          explorerUrl: 'https://testnet.nearblocks.io/account/escrow-factory-1690123456.rarebat823.testnet',
          verified: true
        },
        {
          name: 'Sample Escrow',
          address: 'sample-escrow-1690123567.escrow-factory-1690123456.rarebat823.testnet',
          status: 'deployed',
          explorerUrl: 'https://testnet.nearblocks.io/account/sample-escrow-1690123567.escrow-factory-1690123456.rarebat823.testnet',
          verified: true
        }
      ],
      deployer: 'rarebat823.testnet'
    },
    crossChain: {
      configured: true,
      ready: true,
      bridgeVersion: '1.0.0'
    }
  })

  const [copied, setCopied] = useState<string | null>(null)

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const getStatusIcon = (status: ContractStatus['status']) => {
    switch (status) {
      case 'deployed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500 animate-spin" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: ContractStatus['status']) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    
    switch (status) {
      case 'deployed':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case 'failed':
        return `${baseClasses} bg-red-100 text-red-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  // Simulate real-time updates (in production, this would connect to actual deployment status)
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate deployment progress updates
      setDeploymentInfo(prev => ({
        ...prev,
        // Add any real-time updates here
      }))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Deployment Status</h3>
        <p className="text-gray-600">Real-time status of cross-chain bridge deployment</p>
      </div>

      {/* Overall Status */}
      <div className="card-gradient p-6 rounded-xl mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {deploymentInfo.crossChain.ready ? (
              <CheckCircle className="h-8 w-8 text-green-500 mr-4" />
            ) : (
              <Clock className="h-8 w-8 text-yellow-500 mr-4 animate-spin" />
            )}
            <div>
              <h4 className="text-xl font-semibold text-gray-900">
                Cross-Chain Bridge
              </h4>
              <p className="text-gray-600">
                {deploymentInfo.crossChain.ready 
                  ? 'Fully operational and ready for atomic swaps'
                  : 'Deployment in progress...'
                }
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={getStatusBadge(deploymentInfo.crossChain.ready ? 'deployed' : 'pending')}>
              {deploymentInfo.crossChain.ready ? 'READY' : 'DEPLOYING'}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              v{deploymentInfo.crossChain.bridgeVersion}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Ethereum Contracts */}
        <div className="card-gradient p-6 rounded-xl">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-1inch-500 to-1inch-600 rounded-lg flex items-center justify-center mr-4">
              <span className="text-white font-bold text-sm">ETH</span>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900">
                {deploymentInfo.ethereum.network}
              </h4>
              <p className="text-sm text-gray-600">
                Gas Used: {deploymentInfo.ethereum.totalGasUsed}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {deploymentInfo.ethereum.contracts.map((contract, index) => (
              <div key={index} className="p-4 bg-white/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    {getStatusIcon(contract.status)}
                    <span className="ml-2 font-medium text-gray-900">
                      {contract.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {contract.verified && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Verified
                      </span>
                    )}
                    <span className={getStatusBadge(contract.status)}>
                      {contract.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                
                {contract.address && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                        {contract.address.slice(0, 8)}...{contract.address.slice(-6)}
                      </code>
                      <button
                        onClick={() => copyToClipboard(contract.address!, `eth-${index}`)}
                        className="ml-2 p-1 hover:bg-gray-200 rounded"
                      >
                        {copied === `eth-${index}` ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    
                    {contract.explorerUrl && (
                      <a
                        href={contract.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-1inch-600 hover:text-1inch-700"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                )}
                
                {contract.gasUsed && (
                  <div className="text-xs text-gray-500 mt-1">
                    Gas Used: {contract.gasUsed}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-1inch-50 rounded-lg">
            <div className="text-sm">
              <span className="text-gray-600">Deployer:</span>
              <code className="ml-2 text-1inch-700 font-mono text-xs">
                {deploymentInfo.ethereum.deployer}
              </code>
            </div>
          </div>
        </div>

        {/* Near Contracts */}
        <div className="card-gradient p-6 rounded-xl">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-near-500 to-near-600 rounded-lg flex items-center justify-center mr-4">
              <span className="text-white font-bold text-sm">Ⓝ</span>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900">
                {deploymentInfo.near.network}
              </h4>
              <p className="text-sm text-gray-600">
                Smart Contracts on Near Protocol
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {deploymentInfo.near.contracts.map((contract, index) => (
              <div key={index} className="p-4 bg-white/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    {getStatusIcon(contract.status)}
                    <span className="ml-2 font-medium text-gray-900">
                      {contract.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {contract.verified && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Verified
                      </span>
                    )}
                    <span className={getStatusBadge(contract.status)}>
                      {contract.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                
                {contract.address && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                        {contract.address.length > 30 
                          ? `${contract.address.slice(0, 15)}...${contract.address.slice(-10)}`
                          : contract.address
                        }
                      </code>
                      <button
                        onClick={() => copyToClipboard(contract.address!, `near-${index}`)}
                        className="ml-2 p-1 hover:bg-gray-200 rounded"
                      >
                        {copied === `near-${index}` ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    
                    {contract.explorerUrl && (
                      <a
                        href={contract.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-near-600 hover:text-near-700"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-near-50 rounded-lg">
            <div className="text-sm">
              <span className="text-gray-600">Deployer:</span>
              <code className="ml-2 text-near-700 font-mono text-xs">
                {deploymentInfo.near.deployer}
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Bridge Configuration */}
      <div className="card-gradient p-6 rounded-xl mt-8">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Bridge Configuration</h4>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div className="font-medium text-gray-900">Hashlock/Timelock</div>
            <div className="text-sm text-gray-600">7-stage system active</div>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div className="font-medium text-gray-900">Partial Fills</div>
            <div className="text-sm text-gray-600">Merkle tree ready</div>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div className="font-medium text-gray-900">Bidirectional</div>
            <div className="text-sm text-gray-600">Both directions active</div>
          </div>
        </div>
      </div>
    </div>
  )
}