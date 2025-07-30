'use client'

import { useState, useEffect } from 'react'
import { Play, Pause, RotateCcw, CheckCircle, Clock, ArrowRight, ExternalLink } from 'lucide-react'

interface DemoStep {
  id: number
  title: string
  description: string
  status: 'pending' | 'active' | 'completed'
  chain: 'ethereum' | 'near' | 'both'
  duration: number
  details?: string[]
}

export default function LiveDemo() {
  const [isRunning, setIsRunning] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)

  const demoSteps: DemoStep[] = [
    {
      id: 1,
      title: 'Initialize Atomic Swap',
      description: 'User initiates 100 USDT swap from Ethereum to Near',
      status: 'pending',
      chain: 'ethereum',
      duration: 2000,
      details: [
        'Generate secret and hashlock',
        'Calculate timelock stages',
        'Prepare safety deposit (0.01 ETH)'
      ]
    },
    {
      id: 2,
      title: 'Deploy Source Escrow',
      description: 'EscrowSrc contract deployed on Ethereum Sepolia',
      status: 'pending',
      chain: 'ethereum',
      duration: 3000,
      details: [
        'Deploy using CREATE2 for deterministic address',
        'Lock 100 USDT in escrow',
        'Set 7-stage timelock system',
        'Emit EscrowCreated event'
      ]
    },
    {
      id: 3,
      title: 'Deploy Destination Escrow',
      description: 'EscrowDst contract deployed on Near testnet',
      status: 'pending',
      chain: 'near',
      duration: 2500,
      details: [
        'Resolver detects source escrow',
        'Deploy matching Near escrow',
        'Lock equivalent USDT on Near',
        'Merkle tree ready for partial fills'
      ]
    },
    {
      id: 4,
      title: 'Cross-Chain Validation',
      description: 'Bridge validates both escrows are properly configured',
      status: 'pending',
      chain: 'both',
      duration: 1500,
      details: [
        'Verify hashlock compatibility',
        'Confirm timelock synchronization',
        'Validate safety deposits',
        'Check partial fill configuration'
      ]
    },
    {
      id: 5,
      title: 'Secret Revelation',
      description: 'User reveals secret to claim tokens on Near',
      status: 'pending',
      chain: 'near',
      duration: 2000,
      details: [
        'User calls withdraw() with secret',
        'Near contract validates secret hash',
        'Transfer 100 USDT to user on Near',
        'Emit SecretRevealed event'
      ]
    },
    {
      id: 6,
      title: 'Cross-Chain Completion',
      description: 'Secret propagates back to Ethereum for resolver claim',
      status: 'pending',
      chain: 'ethereum',
      duration: 2500,
      details: [
        'Bridge detects secret revelation',
        'Resolver claims on Ethereum',
        'Safety deposits distributed',
        'Atomic swap completed successfully'
      ]
    }
  ]

  const [steps, setSteps] = useState(demoSteps)

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isRunning && currentStep < steps.length) {
      const step = steps[currentStep]
      
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            // Move to next step
            setSteps(prevSteps => 
              prevSteps.map((s, index) => ({
                ...s,
                status: index === currentStep ? 'completed' : 
                       index === currentStep + 1 ? 'active' : s.status
              }))
            )
            setCurrentStep(prev => prev + 1)
            return 0
          }
          return prev + (100 / (step.duration / 100))
        })
      }, 100)
    } else if (currentStep >= steps.length) {
      setIsRunning(false)
    }

    return () => clearInterval(interval)
  }, [isRunning, currentStep, steps])

  const startDemo = () => {
    setIsRunning(true)
    if (currentStep === 0) {
      setSteps(prevSteps => 
        prevSteps.map((step, index) => ({
          ...step,
          status: index === 0 ? 'active' : 'pending'
        }))
      )
    }
  }

  const pauseDemo = () => {
    setIsRunning(false)
  }

  const resetDemo = () => {
    setIsRunning(false)
    setCurrentStep(0)
    setProgress(0)
    setSteps(demoSteps.map(step => ({ ...step, status: 'pending' })))
  }

  const getChainColor = (chain: string) => {
    switch (chain) {
      case 'ethereum': return 'from-1inch-500 to-1inch-600'
      case 'near': return 'from-near-500 to-near-600'
      case 'both': return 'from-purple-500 to-purple-600'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  const getChainBadge = (chain: string) => {
    switch (chain) {
      case 'ethereum': return 'ethereum-badge'
      case 'near': return 'near-badge'
      case 'both': return 'chain-badge bg-purple-100 text-purple-700 border border-purple-200'
      default: return 'chain-badge bg-gray-100 text-gray-700'
    }
  }

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'active': return <Clock className="h-5 w-5 text-blue-500 animate-spin" />
      default: return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Live Atomic Swap Demo</h3>
        <p className="text-gray-600">Watch a complete cross-chain swap execution in real-time</p>
      </div>

      {/* Demo Controls */}
      <div className="card-gradient p-6 rounded-xl mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={isRunning ? pauseDemo : startDemo}
              disabled={currentStep >= steps.length && !isRunning}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-1inch-500 to-1inch-600 text-white rounded-lg hover:from-1inch-600 hover:to-1inch-700 transition-all disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause Demo
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  {currentStep >= steps.length ? 'Demo Complete' : 'Start Demo'}
                </>
              )}
            </button>
            
            <button
              onClick={resetDemo}
              className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </button>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-600">
              Step {Math.min(currentStep + 1, steps.length)} of {steps.length}
            </div>
            <div className="text-lg font-semibold text-gray-900">
              {currentStep >= steps.length ? 'Complete' : steps[currentStep]?.title}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {isRunning && currentStep < steps.length && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Current Step Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full bg-gradient-to-r ${getChainColor(steps[currentStep]?.chain)} transition-all duration-300`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Demo Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`card-gradient p-6 rounded-xl transition-all ${
              step.status === 'active' ? 'ring-2 ring-1inch-500 shadow-lg' : ''
            } ${
              step.status === 'completed' ? 'bg-green-50/50' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className="mr-4 mt-1">
                  {getStepIcon(step.status)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h4 className="text-lg font-semibold text-gray-900 mr-3">
                      {step.title}
                    </h4>
                    <span className={getChainBadge(step.chain)}>
                      {step.chain === 'both' ? 'Cross-Chain' : 
                       step.chain === 'ethereum' ? 'Ethereum' : 'Near Protocol'}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-4">{step.description}</p>
                  
                  {step.details && (step.status === 'active' || step.status === 'completed') && (
                    <div className="space-y-2">
                      {step.details.map((detail, detailIndex) => (
                        <div key={detailIndex} className="flex items-center text-sm text-gray-600">
                          <div className="w-2 h-2 bg-gradient-to-r from-1inch-500 to-near-500 rounded-full mr-3" />
                          {detail}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right ml-4">
                <div className="text-sm text-gray-500">
                  ~{step.duration / 1000}s
                </div>
                {step.status === 'completed' && (
                  <button className="mt-2 inline-flex items-center text-xs text-1inch-600 hover:text-1inch-700">
                    View on Explorer
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </button>
                )}
              </div>
            </div>

            {/* Step Connection Arrow */}
            {index < steps.length - 1 && (
              <div className="flex justify-center mt-4">
                <ArrowRight className={`h-5 w-5 ${
                  step.status === 'completed' ? 'text-green-500' : 'text-gray-300'
                }`} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Demo Completion */}
      {currentStep >= steps.length && (
        <div className="card-gradient p-8 rounded-xl mt-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
          
          <h4 className="text-2xl font-bold text-gray-900 mb-2">
            Atomic Swap Completed! 🎉
          </h4>
          
          <p className="text-gray-600 mb-6">
            Successfully demonstrated cross-chain atomic swap between Ethereum and Near Protocol
          </p>

          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="font-medium text-green-900">✅ Security</div>
              <div className="text-green-700">Atomic execution guaranteed</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="font-medium text-blue-900">🔄 Cross-Chain</div>
              <div className="text-blue-700">Ethereum ↔ Near compatible</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="font-medium text-purple-900">⚡ Efficient</div>
              <div className="text-purple-700">Partial fills supported</div>
            </div>
          </div>

          <button
            onClick={resetDemo}
            className="mt-6 button-primary"
          >
            Run Demo Again
          </button>
        </div>
      )}
    </div>
  )
}