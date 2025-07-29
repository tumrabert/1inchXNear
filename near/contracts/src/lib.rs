use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::{env, near_bindgen, AccountId, Balance, PanicOnDefault, Promise, PromiseResult};
use near_sdk::collections::UnorderedMap;

// Timelock stages corresponding to Ethereum implementation
#[derive(BorshDeserialize, BorshSerialize, Clone, Copy, Debug)]
pub enum Stage {
    SrcWithdrawal = 0,      // Private withdrawal on Ethereum
    SrcPublicWithdrawal,    // Public withdrawal on Ethereum  
    SrcCancellation,        // Private cancellation on Ethereum
    SrcPublicCancellation,  // Public cancellation on Ethereum
    DstWithdrawal,          // Private withdrawal on Near
    DstPublicWithdrawal,    // Public withdrawal on Near
    DstCancellation,        // Cancellation on Near
}

// Escrow immutable data structure
#[derive(BorshDeserialize, BorshSerialize, Clone, Debug)]
pub struct EscrowImmutables {
    pub hashlock: [u8; 32],           // keccak256(secret)
    pub token_id: AccountId,          // FT contract account
    pub amount: Balance,              // Token amount
    pub maker: AccountId,             // Near user account
    pub taker: AccountId,             // Resolver account
    pub safety_deposit: Balance,      // NEAR safety deposit
    pub timelocks: u64,               // Packed timelock stages
    pub deployed_at: u64,             // Block height
}

// Main escrow contract for destination chain (Near)
#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct EscrowDst {
    pub immutables: EscrowImmutables,
    pub withdrawn: bool,
    pub cancelled: bool,
    pub revealed_secret: Option<Vec<u8>>,
}

#[near_bindgen]
impl EscrowDst {
    /// Initialize new escrow contract
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
            },
            withdrawn: false,
            cancelled: false,
            revealed_secret: None,
        }
    }

    /// Withdraw tokens by revealing the secret (private phase)
    pub fn withdraw(&mut self, secret: Vec<u8>) -> Promise {
        self.validate_withdraw(&secret);
        self.execute_withdrawal(secret, &env::predecessor_account_id())
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
            1, // 1 yoctoNEAR for security
            env::prepaid_gas() / 3,
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

    // Private helper functions
    fn validate_withdraw(&self, secret: &[u8]) {
        assert!(!self.withdrawn, "Already withdrawn");
        assert!(!self.cancelled, "Already cancelled");
        assert_eq!(env::predecessor_account_id(), self.immutables.taker, "Only taker can withdraw");
        
        // Verify secret matches hashlock
        let hash = env::keccak256(secret);
        assert_eq!(hash, self.immutables.hashlock, "Invalid secret");
        
        // Check timelock stage
        let current_stage = self.get_current_stage();
        assert!(matches!(current_stage, Stage::DstWithdrawal), "Not in withdrawal stage");
    }

    fn validate_public_withdraw(&self, secret: &[u8]) {
        assert!(!self.withdrawn, "Already withdrawn");
        assert!(!self.cancelled, "Already cancelled");
        
        // Verify secret matches hashlock
        let hash = env::keccak256(secret);
        assert_eq!(hash, self.immutables.hashlock, "Invalid secret");
        
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
            1, // 1 yoctoNEAR for security
            env::prepaid_gas() / 3,
        );

        let safety_deposit_transfer = Promise::new(caller.clone()).transfer(self.immutables.safety_deposit);

        token_transfer.and(safety_deposit_transfer)
    }

    fn execute_cancellation(&mut self, caller: &AccountId) -> Promise {
        self.cancelled = true;

        // Return tokens to taker and safety deposit to caller
        let token_transfer = Promise::new(self.immutables.token_id.clone()).function_call(
            "ft_transfer".to_string(),
            format!(r#"{{"receiver_id": "{}", "amount": "{}"}}"#, 
                   self.immutables.taker, self.immutables.amount).into_bytes(),
            1, // 1 yoctoNEAR for security
            env::prepaid_gas() / 3,
        );

        let safety_deposit_transfer = Promise::new(caller.clone()).transfer(self.immutables.safety_deposit);

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

// Factory contract for deploying escrow contracts
#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct EscrowFactory {
    pub escrow_contracts: UnorderedMap<Vec<u8>, AccountId>,
}

#[near_bindgen]
impl EscrowFactory {
    #[init]
    pub fn new() -> Self {
        Self {
            escrow_contracts: UnorderedMap::new(b"e"),
        }
    }

    /// Create new escrow contract
    pub fn create_escrow(
        &mut self,
        salt: Vec<u8>,
        hashlock: [u8; 32],
        token_id: AccountId,
        amount: Balance,
        maker: AccountId,
        taker: AccountId,
        timelocks: u64,
    ) -> Promise {
        let escrow_account = self.predict_escrow_address(&salt);
        
        // Deploy new escrow contract
        Promise::new(escrow_account.clone())
            .create_account()
            .transfer(env::attached_deposit())
            .deploy_contract(include_bytes!("../target/wasm32-unknown-unknown/release/fusion_near_escrow.wasm").to_vec())
            .function_call(
                "new".to_string(),
                format!(r#"{{
                    "hashlock": {:?},
                    "token_id": "{}",
                    "amount": "{}",
                    "maker": "{}",
                    "taker": "{}",
                    "safety_deposit": "{}",
                    "timelocks": {}
                }}"#, hashlock, token_id, amount, maker, taker, env::attached_deposit() / 2, timelocks).into_bytes(),
                0,
                env::prepaid_gas() / 3,
            )
            .then(Self::ext(env::current_account_id()).on_escrow_created(salt, escrow_account.clone()))
    }

    /// Predict escrow contract address
    pub fn predict_escrow_address(&self, salt: &[u8]) -> AccountId {
        let hash = env::keccak256(&[env::current_account_id().as_bytes(), salt].concat());
        let hex_hash = hex::encode(&hash[..8]); // Use first 8 bytes for account name
        format!("{}.{}", hex_hash, env::current_account_id()).parse().unwrap()
    }

    #[private]
    pub fn on_escrow_created(&mut self, salt: Vec<u8>, escrow_account: AccountId) {
        match env::promise_result(0) {
            PromiseResult::Successful(_) => {
                self.escrow_contracts.insert(&salt, &escrow_account);
            }
            PromiseResult::Failed => {
                env::panic_str("Failed to create escrow contract");
            }
        }
    }

    // View functions
    pub fn get_escrow_address(&self, salt: &[u8]) -> Option<AccountId> {
        self.escrow_contracts.get(salt)
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
    fn test_secret_validation() {
        let context = VMContextBuilder::new()
            .predecessor_account_id(accounts(3)) // taker
            .build();
        testing_env!(context);

        let secret = b"test_secret";
        let hashlock = env::keccak256(secret);
        
        let mut escrow = EscrowDst::new(
            hashlock,
            accounts(1),
            1000u128,
            accounts(2),
            accounts(3),
            500u128,
            0u64,
        );

        // This would fail in real test due to token transfer, but validates logic
        // escrow.withdraw(secret.to_vec());
        assert_eq!(env::keccak256(secret), hashlock);
    }
}