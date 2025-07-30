use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::{env, near_bindgen, AccountId, PanicOnDefault, Promise, NearToken, Gas};
use near_contract_standards::fungible_token::Balance;
use near_sdk::serde::{Deserialize, Serialize};

// Timelock stages corresponding to Ethereum implementation
#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Copy, Debug)]
#[serde(crate = "near_sdk::serde")]
#[borsh(use_discriminant = true)]
pub enum Stage {
    SrcWithdrawal = 0,      // Private withdrawal on Ethereum
    SrcPublicWithdrawal,    // Public withdrawal on Ethereum  
    SrcCancellation,        // Private cancellation on Ethereum
    SrcPublicCancellation,  // Public cancellation on Ethereum
    DstWithdrawal,          // Private withdrawal on Near
    DstPublicWithdrawal,    // Public withdrawal on Near
    DstCancellation,        // Cancellation on Near
}

// Merkle proof structure for partial fills
#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct MerkleProof {
    pub index: u64,              // Fill percentage index (0-N)
    pub secret_hash: [u8; 32],   // keccak256(secret) for this index
    pub proof: Vec<[u8; 32]>,    // Merkle proof path
}

// Partial fill validation structure
#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct PartialFillInfo {
    pub merkle_root: [u8; 32],       // Root of Merkle tree containing all secrets
    pub total_parts: u64,            // Total number of parts (N+1 secrets)
    pub used_indices: Vec<u64>,      // Track which indices have been used
    pub last_validated: u64,         // Last validated index for sequential fills
}

// Escrow immutable data structure
#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct EscrowImmutables {
    pub hashlock: [u8; 32],           // keccak256(secret) or Merkle root for partial fills
    pub token_id: AccountId,          // FT contract account
    pub amount: Balance,              // Token amount
    pub maker: AccountId,             // Near user account
    pub taker: AccountId,             // Resolver account
    pub safety_deposit: Balance,      // NEAR safety deposit
    pub timelocks: u64,               // Packed timelock stages
    pub deployed_at: u64,             // Block height
    pub partial_fill_info: Option<PartialFillInfo>, // None for single fill, Some for partial fills
}

// Main escrow contract for destination chain (Near)
#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct EscrowDst {
    pub immutables: EscrowImmutables,
    pub withdrawn: bool,
    pub cancelled: bool,
    pub revealed_secret: Option<Vec<u8>>,
    pub partial_fill_state: Option<PartialFillInfo>, // Mutable state for partial fills
    pub filled_amount: Balance,                      // Amount already filled in partial fills
}

// Merkle tree validation utilities
impl EscrowDst {
    /// Validate Merkle proof for partial fill
    fn validate_merkle_proof(&self, proof: &MerkleProof) -> bool {
        if let Some(ref partial_info) = self.partial_fill_state {
            // Compute leaf hash: keccak256(index || secret_hash)
            let mut leaf_data = Vec::new();
            leaf_data.extend_from_slice(&proof.index.to_le_bytes());
            leaf_data.extend_from_slice(&proof.secret_hash);
            let leaf_hash = env::keccak256(&leaf_data);

            // Verify Merkle proof
            self.verify_merkle_proof(leaf_hash, &proof.proof, partial_info.merkle_root)
        } else {
            false // No partial fills supported if partial_fill_state is None
        }
    }

    /// Verify Merkle proof against root
    fn verify_merkle_proof(&self, leaf: Vec<u8>, proof: &[[u8; 32]], root: [u8; 32]) -> bool {
        let mut computed_hash: [u8; 32] = leaf.try_into().unwrap_or_default();
        
        for proof_element in proof {
            // Determine hash order (smaller hash first for consistent ordering)
            if computed_hash <= *proof_element {
                let mut combined = Vec::new();
                combined.extend_from_slice(&computed_hash);
                combined.extend_from_slice(proof_element);
                let hash_vec = env::keccak256(&combined);
                computed_hash = hash_vec.try_into().unwrap_or_default();
            } else {
                let mut combined = Vec::new();
                combined.extend_from_slice(proof_element);
                combined.extend_from_slice(&computed_hash);
                let hash_vec = env::keccak256(&combined);
                computed_hash = hash_vec.try_into().unwrap_or_default();
            }
        }
        
        computed_hash == root
    }

    /// Check if partial fill is valid (sequential and percentage-based)
    fn is_valid_partial_fill(&self, index: u64, remaining_amount: Balance) -> bool {
        if let Some(ref partial_info) = self.partial_fill_state {
            // Check if index is in valid range
            if index >= partial_info.total_parts {
                return false;
            }

            // Check if index hasn't been used
            if partial_info.used_indices.contains(&index) {
                return false;
            }

            // For sequential fills, index should be next in sequence
            if index != partial_info.last_validated + 1 && partial_info.last_validated != 0 {
                return false;
            }

            // Validate amount corresponds to expected percentage
            let expected_fill_amount = self.calculate_partial_amount(index);
            let tolerance = expected_fill_amount / 100; // 1% tolerance
            
            remaining_amount >= expected_fill_amount.saturating_sub(tolerance) &&
            remaining_amount <= expected_fill_amount + tolerance
        } else {
            false
        }
    }

    /// Calculate expected amount for partial fill index
    fn calculate_partial_amount(&self, index: u64) -> Balance {
        if let Some(ref partial_info) = self.partial_fill_state {
            // For N parts: index 0 = (0-25%], index 1 = (25-50%], etc.
            let percentage = ((index + 1) * 100) / partial_info.total_parts;
            (self.immutables.amount * percentage as u128) / 100
        } else {
            0
        }
    }
}

#[near_bindgen]
impl EscrowDst {
    /// Initialize new escrow contract (single fill)
    #[init]
    pub fn new(
        hashlock: [u8; 32],
        token_id: AccountId,
        amount: Balance,
        maker: AccountId,
        taker: AccountId,
        safety_deposit: Balance,
        timelocks: u64,
    ) -> Self {
        Self {
            immutables: EscrowImmutables {
                hashlock,
                token_id,
                amount,
                maker,
                taker,
                safety_deposit,
                timelocks,
                deployed_at: env::block_height(),
                partial_fill_info: None,
            },
            withdrawn: false,
            cancelled: false,
            revealed_secret: None,
            partial_fill_state: None,
            filled_amount: 0,
        }
    }

    /// Initialize new escrow contract with partial fill support
    #[init]
    pub fn new_with_partial_fills(
        merkle_root: [u8; 32],
        token_id: AccountId,
        amount: Balance,
        maker: AccountId,
        taker: AccountId,
        safety_deposit: Balance,
        timelocks: u64,
        total_parts: u64,
    ) -> Self {
        let partial_fill_info = PartialFillInfo {
            merkle_root,
            total_parts,
            used_indices: Vec::new(),
            last_validated: 0,
        };

        Self {
            immutables: EscrowImmutables {
                hashlock: merkle_root, // Use Merkle root as hashlock for partial fills
                token_id,
                amount,
                maker,
                taker,
                safety_deposit,
                timelocks,
                deployed_at: env::block_height(),
                partial_fill_info: Some(partial_fill_info.clone()),
            },
            withdrawn: false,
            cancelled: false,
            revealed_secret: None,
            partial_fill_state: Some(partial_fill_info),
            filled_amount: 0,
        }
    }

    /// Withdraw tokens by revealing the secret (private phase) - single fill
    pub fn withdraw(&mut self, secret: Vec<u8>) -> Promise {
        self.validate_withdraw(&secret);
        self.execute_withdrawal(secret, &env::predecessor_account_id())
    }

    /// Withdraw tokens with partial fill using Merkle proof
    pub fn withdraw_partial(&mut self, secret: Vec<u8>, proof: MerkleProof) -> Promise {
        self.validate_partial_withdraw(&secret, &proof);
        self.execute_partial_withdrawal(secret, proof, &env::predecessor_account_id())
    }

    /// Public withdrawal allowing anyone to withdraw after timeout
    pub fn public_withdraw(&mut self, secret: Vec<u8>) -> Promise {
        self.validate_public_withdraw(&secret);
        self.execute_withdrawal(secret, &env::predecessor_account_id())
    }

    /// Cancel the escrow (private phase)
    pub fn cancel(&mut self) -> Promise {
        self.validate_cancel();
        self.execute_cancellation(&env::predecessor_account_id())
    }

    /// Rescue stuck funds after extended timeout
    pub fn rescue_funds(&mut self, token_id: AccountId, amount: Balance) -> Promise {
        self.validate_rescue();
        // Implementation for fund rescue
        Promise::new(token_id).function_call(
            "ft_transfer".to_string(),
            format!(r#"{{"receiver_id": "{}", "amount": "{}"}}"#, 
                   self.immutables.taker, amount).into_bytes(),
            NearToken::from_yoctonear(1), // 1 yoctoNEAR for security
            Gas::from_tgas(30),
        )
    }

    // View functions
    pub fn get_immutables(&self) -> &EscrowImmutables {
        &self.immutables
    }

    pub fn is_withdrawn(&self) -> bool {
        self.withdrawn
    }

    pub fn is_cancelled(&self) -> bool {
        self.cancelled
    }

    pub fn get_revealed_secret(&self) -> Option<&Vec<u8>> {
        self.revealed_secret.as_ref()
    }

    pub fn get_partial_fill_state(&self) -> Option<&PartialFillInfo> {
        self.partial_fill_state.as_ref()
    }

    // Private helper functions
    fn validate_withdraw(&self, secret: &[u8]) {
        assert!(!self.withdrawn, "Already withdrawn");
        assert!(!self.cancelled, "Already cancelled");
        assert_eq!(env::predecessor_account_id(), self.immutables.taker, "Only taker can withdraw");
        
        // For single fills, verify secret matches hashlock directly
        if self.immutables.partial_fill_info.is_none() {
            let hash = env::keccak256(secret);
            let hash_array: [u8; 32] = hash.try_into().unwrap_or_default();
            assert_eq!(hash_array, self.immutables.hashlock, "Invalid secret");
        } else {
            env::panic_str("Use withdraw_partial for partial fills");
        }
        
        // Check timelock stage
        let current_stage = self.get_current_stage();
        assert!(matches!(current_stage, Stage::DstWithdrawal), "Not in withdrawal stage");
    }

    fn validate_partial_withdraw(&self, secret: &[u8], proof: &MerkleProof) {
        assert!(!self.withdrawn, "Already withdrawn");
        assert!(!self.cancelled, "Already cancelled");
        assert_eq!(env::predecessor_account_id(), self.immutables.taker, "Only taker can withdraw");
        
        // Ensure this is a partial fill escrow
        assert!(self.immutables.partial_fill_info.is_some(), "Not a partial fill escrow");
        
        // Verify secret matches the proof's secret hash
        let secret_hash = env::keccak256(secret);
        let secret_hash_array: [u8; 32] = secret_hash.try_into().unwrap_or_default();
        assert_eq!(secret_hash_array, proof.secret_hash, "Secret doesn't match proof");
        
        // Validate Merkle proof
        assert!(self.validate_merkle_proof(proof), "Invalid Merkle proof");
        
        // Check if this partial fill is valid
        let remaining_amount = self.immutables.amount - self.filled_amount;
        assert!(self.is_valid_partial_fill(proof.index, remaining_amount), "Invalid partial fill");
        
        // Check timelock stage
        let current_stage = self.get_current_stage();
        assert!(matches!(current_stage, Stage::DstWithdrawal), "Not in withdrawal stage");
    }

    fn validate_public_withdraw(&self, secret: &[u8]) {
        assert!(!self.withdrawn, "Already withdrawn");
        assert!(!self.cancelled, "Already cancelled");
        
        // Verify secret matches hashlock
        let hash = env::keccak256(secret);
        let hash_array: [u8; 32] = hash.try_into().unwrap_or_default();
        assert_eq!(hash_array, self.immutables.hashlock, "Invalid secret");
        
        // Check timelock stage
        let current_stage = self.get_current_stage();
        assert!(matches!(current_stage, Stage::DstPublicWithdrawal), "Not in public withdrawal stage");
    }

    fn validate_cancel(&self) {
        assert!(!self.withdrawn, "Already withdrawn");
        assert!(!self.cancelled, "Already cancelled");
        assert_eq!(env::predecessor_account_id(), self.immutables.taker, "Only taker can cancel");
        
        // Check timelock stage
        let current_stage = self.get_current_stage();
        assert!(matches!(current_stage, Stage::DstCancellation), "Not in cancellation stage");
    }

    fn validate_rescue(&self) {
        assert_eq!(env::predecessor_account_id(), self.immutables.taker, "Only taker can rescue");
        
        // Check significant time has passed
        let blocks_passed = env::block_height() - self.immutables.deployed_at;
        let rescue_delay = 86400; // ~24 hours in blocks (assuming 1s block time)
        assert!(blocks_passed > rescue_delay, "Rescue delay not met");
    }

    fn execute_withdrawal(&mut self, secret: Vec<u8>, caller: &AccountId) -> Promise {
        self.withdrawn = true;
        self.revealed_secret = Some(secret);

        // Transfer tokens to maker and safety deposit to caller
        let token_transfer = Promise::new(self.immutables.token_id.clone()).function_call(
            "ft_transfer".to_string(),
            format!(r#"{{"receiver_id": "{}", "amount": "{}"}}"#, 
                   self.immutables.maker, self.immutables.amount).into_bytes(),
            NearToken::from_yoctonear(1), // 1 yoctoNEAR for security
            Gas::from_tgas(30),
        );

        let safety_deposit_transfer = Promise::new(caller.clone()).transfer(NearToken::from_yoctonear(self.immutables.safety_deposit));

        token_transfer.and(safety_deposit_transfer)
    }

    fn execute_partial_withdrawal(&mut self, secret: Vec<u8>, proof: MerkleProof, caller: &AccountId) -> Promise {
        // Calculate fill amount for this index
        let fill_amount = self.calculate_partial_amount(proof.index) - self.filled_amount;
        
        // Update state
        self.filled_amount += fill_amount;
        self.revealed_secret = Some(secret);
        
        // Update partial fill state
        if let Some(ref mut partial_state) = self.partial_fill_state {
            partial_state.used_indices.push(proof.index);
            partial_state.last_validated = proof.index;
            
            // Check if this completes all fills
            if self.filled_amount >= self.immutables.amount {
                self.withdrawn = true;
            }
        }

        // Transfer partial amount to maker and proportional safety deposit to caller
        let proportional_deposit = (self.immutables.safety_deposit * fill_amount as u128) / self.immutables.amount;
        
        let token_transfer = Promise::new(self.immutables.token_id.clone()).function_call(
            "ft_transfer".to_string(),
            format!(r#"{{"receiver_id": "{}", "amount": "{}"}}"#, 
                   self.immutables.maker, fill_amount).into_bytes(),
            NearToken::from_yoctonear(1), // 1 yoctoNEAR for security
            Gas::from_tgas(30),
        );

        let safety_deposit_transfer = Promise::new(caller.clone()).transfer(NearToken::from_yoctonear(proportional_deposit));

        token_transfer.and(safety_deposit_transfer)
    }

    fn execute_cancellation(&mut self, caller: &AccountId) -> Promise {
        self.cancelled = true;

        // Return tokens to taker and safety deposit to caller
        let token_transfer = Promise::new(self.immutables.token_id.clone()).function_call(
            "ft_transfer".to_string(),
            format!(r#"{{"receiver_id": "{}", "amount": "{}"}}"#, 
                   self.immutables.taker, self.immutables.amount).into_bytes(),
            NearToken::from_yoctonear(1), // 1 yoctoNEAR for security
            Gas::from_tgas(30),
        );

        let safety_deposit_transfer = Promise::new(caller.clone()).transfer(NearToken::from_yoctonear(self.immutables.safety_deposit));

        token_transfer.and(safety_deposit_transfer)
    }

    fn get_current_stage(&self) -> Stage {
        let blocks_passed = env::block_height() - self.immutables.deployed_at;
        
        // Extract timelock stages from packed u64 (simplified version)
        // In full implementation, this would decode the packed timelocks
        if blocks_passed < 100 {
            Stage::DstWithdrawal
        } else if blocks_passed < 200 {
            Stage::DstPublicWithdrawal  
        } else {
            Stage::DstCancellation
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::{testing_env, MockedBlockchain};

    #[test]
    fn test_escrow_initialization() {
        let context = VMContextBuilder::new()
            .predecessor_account_id(accounts(0))
            .build();
        testing_env!(context);

        let hashlock = [1u8; 32];
        let escrow = EscrowDst::new(
            hashlock,
            accounts(1),
            1000u128,
            accounts(2),
            accounts(3),
            500u128,
            0u64,
        );

        assert_eq!(escrow.immutables.hashlock, hashlock);
        assert_eq!(escrow.immutables.amount, 1000u128);
        assert!(!escrow.is_withdrawn());
        assert!(!escrow.is_cancelled());
    }

    #[test]
    fn test_partial_fill_initialization() {
        let context = VMContextBuilder::new()
            .predecessor_account_id(accounts(0))
            .build();
        testing_env!(context);

        let merkle_root = [2u8; 32];
        let escrow = EscrowDst::new_with_partial_fills(
            merkle_root,
            accounts(1),
            1000u128,
            accounts(2),
            accounts(3),
            500u128,
            0u64,
            4, // 4 parts
        );

        assert_eq!(escrow.immutables.hashlock, merkle_root);
        assert!(escrow.get_partial_fill_state().is_some());
        let partial_state = escrow.get_partial_fill_state().unwrap();
        assert_eq!(partial_state.total_parts, 4);
        assert_eq!(partial_state.used_indices.len(), 0);
    }

    #[test]
    fn test_merkle_proof_structure() {
        // Test Merkle proof structure
        let proof = MerkleProof {
            index: 0,
            secret_hash: [3u8; 32],
            proof: vec![[4u8; 32], [5u8; 32]],
        };

        // Validate proof structure exists
        assert_eq!(proof.index, 0);
        assert_eq!(proof.secret_hash, [3u8; 32]);
        assert_eq!(proof.proof.len(), 2);
    }

    #[test]
    fn test_partial_amount_calculation() {
        let context = VMContextBuilder::new()
            .predecessor_account_id(accounts(0))
            .build();
        testing_env!(context);

        let merkle_root = [2u8; 32];
        let escrow = EscrowDst::new_with_partial_fills(
            merkle_root,
            accounts(1),
            1000u128,
            accounts(2),
            accounts(3),
            500u128,
            0u64,
            4, // 4 parts (25% each)
        );

        // Test partial fill amount calculations
        assert_eq!(escrow.calculate_partial_amount(0), 250); // 25% of 1000
        assert_eq!(escrow.calculate_partial_amount(1), 500); // 50% of 1000
        assert_eq!(escrow.calculate_partial_amount(2), 750); // 75% of 1000
        assert_eq!(escrow.calculate_partial_amount(3), 1000); // 100% of 1000
    }
}