Page 1: Title Page
1inch NETWORK 

1inch Cross-chain swaps - Fusion+ 

Tanner Moore 

Page 2: Overview

Overview 

Classic Swap - AMM/PMM aggregation 

1inch Fusion - intent-based swaps 

1inch Fusion+ - cross-chain swaps 

Building projects for the cross-chain swap bounty 

Page 3: Swapping with 1inch
Swapping with 1inch 

Page 4: Supported Chains

Supported Chains 

Ethereum 

BNB Chain 

Polygon 

Optimism 

Arbitrum 

Base 

Avalanche 

Gnosis Chain 

zkSync Era 

Sonic 

Unichain 

Linea 

OP 

Also includes logos for Polygon, Arbitrum, Base, Gnosis Chain, and others.

Page 5: Solana
Fusion 

Solana 

Page 7: Classic Swap Details

Classic Swap 

Sources swap liquidity from all popular protocols 

Combines these protocols to optimize swap output 

Executes all swaps in a single transaction 

Pages 8-16: Classic Swap Illustrations
These pages visually depict the Classic Swap process, showing how a swap from USDC to DAI is routed through different liquidity sources like DODO to achieve an optimal rate. A comparison shows that 1inch's optimized routing can result in lower gas fees (e.g., 175,055 gas) compared to a direct swap (e.g., 205,555 gas). 





Page 18: 1inch Fusion Details

1inch Fusion 

User submits a swap request with a signature. 

A Dutch auction is created for the swap. 

Resolvers asynchronously compete to fill it. 

Users are protected from MEV by design. 

It's a gasless transaction for users. 

Page 19-20: Fusion Questions
What is a Fusion dutch auction? 

What is a Resolver? 

Page 21: Dutch Auction Graph
This slide displays a graph of a Dutch Auction. The y-axis represents the "rate," and the x-axis represents "time." The rate starts at a maximum (MAX) value and decreases over time until it hits a minimum (MIN) point. 




Pages 22-32: 1inch Fusion Process Flow
These slides illustrate the Fusion swap process:

A user intends to swap 50 USDC for approximately 50 DAI. 


The user signs the transaction. 

The signed request is sent to the 1inch API. 

The API initiates a 3-minute Fusion auction. 


Multiple resolvers (resolver 1, resolver 2, etc.) are alerted. 



Resolvers analyze the auction; some may "pass." 

A resolver (e.g., resolver 3) decides to "execute" the swap at a favorable rate during the auction. 

Page 33: Fusion Swap Example
This chart shows a real example of a 3700 WETH to USDT Fusion swap. It plots the "Rate USDT per ETH" over a 10-minute period. The rate starts high (around 1606.21) and gradually decreases. The graph indicates various points where parts of the order were filled. 





Page 34: Resolver Liquidity
Where do resolvers get liquidity? 

Pages 35-38: Sources of Resolver Liquidity
These slides illustrate that resolvers can source liquidity from:

Centralized Exchanges (CEX) 



Personal Funds 


Decentralized Exchanges (DEX) 


Cross-chain sources 

Page 40-43: User Priorities for Cross-Chain Swaps
What matters to users for cross-chain swaps? 



Good swap rates 



Simple UX 


Trustlessness 

Page 45-47: Hashed Timelock Contracts (HTLCs)

Hashed Timelock Contracts 



They are smart contracts that hold funds. 



They require a secret 's' to unlock the funds. 


They will expire after a set amount of time. 

Pages 48-53: HTLC Mechanism
These slides explain the HTLC process. A user has a secret 's'. They create a hash of the secret, H(s), and use it to lock funds in a contract. Another party cannot claim the funds without revealing the original secret 's'. Once the other party uses the secret 's' to claim funds, the secret is revealed, allowing the original user to claim their assets. 





Pages 54-68: 1inch Fusion+ Cross-Chain Process
This section illustrates a cross-chain swap from 50 USDC on Ethereum to ~50 DAI on Base. 


The process is similar to a standard Fusion swap, involving a user signature, the 1inch API, and a Dutch auction where resolvers compete. 





The winning resolver (e.g., resolver 2) facilitates the cross-chain transaction by interacting with Escrow Contracts on both the source (Ethereum) and destination (Base) chains. 



The resolver places a "safety deposit" into the escrow contracts, which are locked with the same hash H(s). 



The user sends their USDC to the Ethereum escrow, and the resolver sends the DAI from their Base wallet to the Base escrow. 



Pages 69-76: The Role of the Relayer
A "Relayer" is introduced, which communicates between the Escrow Contract on the "Source Chain" and the "Dest Chain." 



The Relayer verifies actions on both chains. 


The user provides the "Secret" to the Relayer, which then enables the user, resolver 2, and other potential resolvers to finalize their parts of the transaction. 




Page 77-86: Integrating non-EVM Chains

Primary Goal: Manage the HTLC and communication between an EVM chain and a non-EVM chain. 

Properly handle hashlock logic. 

Properly handle contract expiration/reverts. 

Swaps must be bi-directional. 

Architecture:


EVM side: Use the 1inch Escrow Factory to create a 1inch Escrow contract. 



non-EVM side: You must build your own Escrow contract. 



Cross-chain orchestration: This is a key part of the project. 


Improving Your Score: UI, enabling partial fills, building a relayer and resolver, and using mainnet non-EVM chains like Base/Arbitrum. 


Important Note: Do not post any orders to our REST APIs. Your resolver will not work with our official backend system. 


Pages 87-90: Getting Started

Where do I start? 

Go to: 

github.com/1inch/cross-chain-resolver-example 


Cross-chain Resolver Example: 

Written in Typescript. 

Simulates a Fusion+ swap between Ethereum and BNB. 

Has all information needed for the EVM side of your project. 


Running the Example: Instructions are provided to install dependencies using pnpm and forge, and to run tests by providing RPC URLs for Ethereum and BSC. Public RPC URLs are provided for Ethereum (

https://eth.merkle.lo) and BSC (wss://bsc-rpc.publicnode.com). 
