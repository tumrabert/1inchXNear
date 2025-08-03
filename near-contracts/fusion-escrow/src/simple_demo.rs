use near_sdk::borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::collections::LookupMap;
use near_sdk::{
    env, near_bindgen, AccountId, NearToken, Promise, 
    require, log, PanicOnDefault
};

#[derive(BorshDeserialize, BorshSerialize)]
pub struct DemoOrder {
    pub maker: AccountId,
    pub amount: NearToken,
    pub hashlock: String,
    pub deadline: u64,
    pub completed: bool,
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct SimpleFusionDemo {
    pub orders: LookupMap<String, DemoOrder>,
    pub owner: AccountId,
}

#[near_bindgen]
impl SimpleFusionDemo {
    #[init]
    pub fn new() -> Self {
        Self {
            orders: LookupMap::new(b"o"),
            owner: env::current_account_id(),
        }
    }
    
    /// Create a new escrow order
    #[payable]
    pub fn create_order(
        &mut self, 
        order_hash: String, 
        hashlock: String,
        deadline_minutes: u64
    ) {
        let amount = env::attached_deposit();
        require!(amount > NearToken::from_near(0), "Must attach NEAR tokens");
        
        let deadline = env::block_timestamp() + (deadline_minutes * 60 * 1_000_000_000);
        
        let order = DemoOrder {
            maker: env::predecessor_account_id(),
            amount,
            hashlock,
            deadline,
            completed: false,
        };
        
        self.orders.insert(&order_hash, &order);
        
        log!("✅ Order created: {} NEAR locked by {}", 
             amount.as_near(), 
             env::predecessor_account_id());
    }
    
    /// Claim NEAR tokens by revealing the secret
    pub fn claim_with_secret(
        &mut self, 
        order_hash: String, 
        secret: String
    ) -> Promise {
        let mut order = self.orders.get(&order_hash)
            .expect("Order not found");
        
        require!(!order.completed, "Order already completed");
        require!(env::block_timestamp() < order.deadline, "Order expired");
        
        // Simple hash check (in production, use proper crypto)
        let secret_hash = env::sha256(secret.as_bytes());
        let secret_hash_hex = hex::encode(secret_hash);
        require!(secret_hash_hex == order.hashlock, "Invalid secret");
        
        order.completed = true;
        self.orders.insert(&order_hash, &order);
        
        log!("🎉 Secret revealed! Transferring {} NEAR to {}", 
             order.amount.as_near(), 
             env::predecessor_account_id());
        
        // Transfer NEAR tokens to the caller
        Promise::new(env::predecessor_account_id())
            .transfer(order.amount)
    }
    
    /// Cancel order and refund (only by maker, after deadline)
    pub fn cancel_order(&mut self, order_hash: String) -> Promise {
        let mut order = self.orders.get(&order_hash)
            .expect("Order not found");
        
        require!(order.maker == env::predecessor_account_id(), "Only maker can cancel");
        require!(env::block_timestamp() >= order.deadline, "Cannot cancel before deadline");
        require!(!order.completed, "Order already completed");
        
        order.completed = true;
        self.orders.insert(&order_hash, &order);
        
        log!("❌ Order cancelled, refunding {} NEAR to {}", 
             order.amount.as_near(), 
             order.maker);
        
        Promise::new(order.maker).transfer(order.amount)
    }
    
    /// View order details
    pub fn get_order(&self, order_hash: String) -> Option<DemoOrder> {
        self.orders.get(&order_hash)
    }
    
    /// Get contract balance
    pub fn get_balance(&self) -> NearToken {
        env::account_balance()
    }
}