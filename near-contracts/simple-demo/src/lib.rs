use near_sdk::borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::collections::UnorderedMap;
use near_sdk::json_types::U128;
use near_sdk::{
    env, near_bindgen, AccountId, Balance, Promise, 
    require, log, PanicOnDefault
};

#[derive(BorshDeserialize, BorshSerialize)]
pub struct Order {
    pub maker: AccountId,
    pub amount: U128,
    pub hashlock: String,
    pub completed: bool,
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct FusionDemo {
    orders: UnorderedMap<String, Order>,
}

#[near_bindgen]
impl FusionDemo {
    #[init]
    pub fn new() -> Self {
        Self {
            orders: UnorderedMap::new(b"o"),
        }
    }
    
    #[payable]
    pub fn create_order(&mut self, order_hash: String, hashlock: String) {
        let amount = env::attached_deposit();
        require!(amount > 0, "Must attach NEAR");
        
        let order = Order {
            maker: env::predecessor_account_id(),
            amount: U128(amount),
            hashlock,
            completed: false,
        };
        
        self.orders.insert(&order_hash, &order);
        log!("Order created: {} yoctoNEAR", amount);
    }
    
    pub fn claim(&mut self, order_hash: String, secret: String) -> Promise {
        let mut order = self.orders.get(&order_hash).expect("Order not found");
        require!(!order.completed, "Already completed");
        
        // Simple validation - just check secret is not empty
        require!(!secret.is_empty(), "Secret required");
        
        order.completed = true;
        self.orders.insert(&order_hash, &order);
        
        let amount: Balance = order.amount.into();
        log!("Claiming {} yoctoNEAR for {}", amount, env::predecessor_account_id());
        
        Promise::new(env::predecessor_account_id()).transfer(amount)
    }
    
    pub fn get_order(&self, order_hash: String) -> Option<Order> {
        self.orders.get(&order_hash)
    }
    
    pub fn test(&self) -> String {
        "Contract is working!".to_string()
    }
}