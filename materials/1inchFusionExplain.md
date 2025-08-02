The Big Picture: What is 1inch Fusion+?
At its core, 1inch Fusion+ is a system for trustless cross-chain swaps.

The Problem: Normally, swapping tokens between two different blockchains (like Ethereum and NEAR) is risky. You either have to trust a centralized exchange (like Binance) or use a complex, often vulnerable "bridge."

The 1inch Solution: They use a clever system where a swap can only happen if both sides fulfill their part of the bargain. If one person backs out, the other person automatically gets their money back. This is called being "trustless" because you don't have to trust the other person.

The Core Mechanism: Hashed Timelock Contracts (HTLC)
This is the most important concept for us. It's the "magic" that makes the swap trustless. The slides and video explain it like this:

The Secret: The user who starts the swap (let's call her Alice) creates a secret piece of data, like a password. Let's call it S.

The Lock (Hash): Alice doesn't reveal the secret. Instead, she calculates a cryptographic "hash" of it. Think of a hash as a unique fingerprint of the secret. Let's call it H. It's impossible to figure out S just by looking at H.

Locking Funds: Alice locks her tokens (e.g., USDC on Ethereum) in a smart contract (the 1inch Escrow Contract). This contract has a rule: "I will only release these funds to someone who can provide the original secret S that matches the hash H."

The Other Side: The person filling the order (the Resolver) sees this. They now lock their funds (e.g., NEAR tokens) in our smart contract on the NEAR blockchain. They use the exact same hash H as the lock.

The Reveal: To get the NEAR tokens, Alice must now reveal her secret S to our contract. When she does, the secret becomes public on the NEAR blockchain.

Unlocking Both Sides: The Resolver sees the secret S on NEAR and immediately uses it to unlock the USDC on Ethereum. The swap is complete!

The "Timelock" part: What if Alice never reveals the secret? Each contract has a timeout (e.g., 1 hour). If the time expires, the funds are automatically returned to their original owners. This prevents funds from being stuck forever.

Our Specific Task: The "Your Escrow" Contract
The diagrams on pages 82-83 of the presentation are the most important for our project.

EVM Side: 1inch has already built the 1inch Escrow Contract on Ethereum and other EVM chains. We don't need to touch this.

Non-EVM Side (Our Job): Our entire task is to build the "Your Escrow" box on the NEAR blockchain.

This means we need to create a NEAR smart contract that can:

Accept and lock NEAR tokens against a hashlock.

Release the tokens to a receiver if the correct secret is provided.

Refund the tokens to the original sender if the timelock expires.

The Golden Resource: The GitHub Example
The video and slides (pages 87-90) repeatedly emphasize that the github.com/1inch/cross-chain-resolver-example repository is our starting point.

What it is: It's a TypeScript project that simulates the off-chain part of a swap. It shows how to structure the data, how to create the order, and how the EVM side works.

Why it's critical: We need to study this example to understand what data our NEAR contract needs to be compatible with. It's our blueprint for the entire system's logic.

In summary, the materials confirm our plan is correct. We are not building the whole system, just one critical piece: the escrow contract on NEAR, using the official 1inch example as our guide.
