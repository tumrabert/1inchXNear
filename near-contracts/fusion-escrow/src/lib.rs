use near_sdk::borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::collections::UnorderedMap;
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{
    env, near_bindgen, AccountId, NearToken, Promise, PanicOnDefault, 
    require, log
};

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct CrossChainOrder {
    pub ethereum_order_hash: String,
    pub direction: String,
    pub maker: AccountId,
    pub resolver: AccountId,
    pub amount: NearToken,
    pub hashlock: String,
    pub deadline: u64,
    pub completed: bool,
    pub cancelled: bool,
    pub revealed_secret: Option<String>,
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct FusionEscrow {
    pub orders: UnorderedMap<String, CrossChainOrder>,
    pub owner: AccountId,
    pub authorized_resolvers: UnorderedMap<AccountId, bool>,
}

#[near_bindgen]
impl FusionEscrow {
    #[init]
    pub fn new() -> Self {
        let mut contract = Self {
            orders: UnorderedMap::new(b"o"),
            owner: env::predecessor_account_id(),
            authorized_resolvers: UnorderedMap::new(b"r"),
        };
        
        contract.authorized_resolvers.insert(&env::predecessor_account_id(), &true);
        contract
    }

    pub fn authorize_resolver(&mut self, resolver: AccountId) {
        require!(env::predecessor_account_id() == self.owner, "Only owner can authorize");
        self.authorized_resolvers.insert(&resolver, &true);
        log!("Authorized resolver: {}", resolver);
    }

    #[payable]
    pub fn create_eth_to_near_order(
        &mut self,
        ethereum_order_hash: String,
        maker: AccountId,
        hashlock: String,
        deadline_seconds: u64,
    ) {
        require!(
            self.authorized_resolvers.get(&env::predecessor_account_id()).unwrap_or(false),
            "Not authorized resolver"
        );
        
        let amount = env::attached_deposit();
        require!(amount.as_yoctonear() > 0, "Must attach NEAR tokens");
        require!(self.orders.get(&ethereum_order_hash).is_none(), "Order already exists");
        
        let deadline = env::block_timestamp() + (deadline_seconds * 1_000_000_000);
        
        let order = CrossChainOrder {
            ethereum_order_hash: ethereum_order_hash.clone(),
            direction: "eth_to_near".to_string(),
            maker,
            resolver: env::predecessor_account_id(),
            amount,
            hashlock,
            deadline,
            completed: false,
            cancelled: false,
            revealed_secret: None,
        };
        
        self.orders.insert(&ethereum_order_hash, &order);
        
        log!(
            "ETH->NEAR escrow created: {} yoctoNEAR for order {}",
            amount, ethereum_order_hash
        );
    }

    #[payable]
    pub fn create_near_to_eth_order(
        &mut self,
        ethereum_order_hash: String,
        resolver: AccountId,
        hashlock: String,
        deadline_seconds: u64,
    ) {
        let amount = env::attached_deposit();
        require!(amount.as_yoctonear() > 0, "Must attach NEAR tokens");
        require!(self.orders.get(&ethereum_order_hash).is_none(), "Order already exists");
        
        let deadline = env::block_timestamp() + (deadline_seconds * 1_000_000_000);
        
        let order = CrossChainOrder {
            ethereum_order_hash: ethereum_order_hash.clone(),
            direction: "near_to_eth".to_string(),
            maker: env::predecessor_account_id(),
            resolver,
            amount,
            hashlock,
            deadline,
            completed: false,
            cancelled: false,
            revealed_secret: None,
        };
        
        self.orders.insert(&ethereum_order_hash, &order);
        
        log!(
            "NEAR->ETH escrow created: {} yoctoNEAR for order {}",
            amount, ethereum_order_hash
        );
    }

    pub fn claim_with_secret(
        &mut self,
        ethereum_order_hash: String,
        secret: String,
    ) -> Promise {
        let mut order = self.orders.get(&ethereum_order_hash)
            .expect("Order does not exist");
        
        require!(!order.completed, "Order already completed");
        require!(!order.cancelled, "Order cancelled");
        require!(env::block_timestamp() <= order.deadline, "Order expired");
        
        // For demo, using simple comparison - in production would use proper hash verification
        let computed_hash = self.compute_hashlock(&secret);
        require!(computed_hash == order.hashlock, "Invalid secret");
        
        order.completed = true;
        order.revealed_secret = Some(secret.clone());
        self.orders.insert(&ethereum_order_hash, &order);
        
        if order.direction == "eth_to_near" {
            log!(
                "ETH->NEAR completed: Transferring {} yoctoNEAR to {}",
                order.amount, order.maker
            );
            Promise::new(order.maker).transfer(order.amount)
        } else {
            log!(
                "NEAR->ETH completed: Transferring {} yoctoNEAR to resolver {}",
                order.amount, order.resolver
            );
            Promise::new(order.resolver).transfer(order.amount)
        }
    }

    pub fn get_order(&self, ethereum_order_hash: String) -> Option<CrossChainOrder> {
        self.orders.get(&ethereum_order_hash)
    }

    pub fn get_orders_for_account(&self, account: AccountId) -> Vec<CrossChainOrder> {
        let mut result = Vec::new();
        for (_, order) in self.orders.iter() {
            if order.maker == account || order.resolver == account {
                result.push(order);
            }
        }
        result
    }

    pub fn is_authorized_resolver(&self, resolver: AccountId) -> bool {
        self.authorized_resolvers.get(&resolver).unwrap_or(false)
    }

    fn compute_hashlock(&self, secret: &str) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        secret.hash(&mut hasher);
        format!("{:x}", hasher.finish())
    }

    pub fn get_contract_balance(&self) -> NearToken {
        env::account_balance()
    }
}