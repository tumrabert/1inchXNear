// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Fusion+ Near Extension
 * @notice Post-interaction contract for extending 1inch Fusion+ with Near Protocol support
 * @dev This contract acts as a post-interaction hook in Limit Order Protocol orders
 *      to enable cross-chain swaps between Ethereum and Near Protocol
 */
contract FusionNearExtension is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Events
    event CrossChainSwapInitiated(
        address indexed maker,
        address indexed taker, 
        bytes32 indexed orderHash,
        bytes32 hashlock,
        address token,
        uint256 amount,
        string nearAccount
    );
    
    event SecretRevealed(bytes32 indexed orderHash, bytes32 secret);
    event SwapCompleted(bytes32 indexed orderHash);
    event SwapCancelled(bytes32 indexed orderHash);

    // Structures
    struct CrossChainOrder {
        address maker;          // Ethereum maker
        address taker;          // Ethereum taker/resolver
        bytes32 hashlock;       // keccak256(secret)
        address token;          // ERC20 token address (address(0) for ETH)
        uint256 amount;         // Token amount
        string nearAccount;     // Near account for destination
        uint256 deadline;       // Order expiration
        bool completed;         // Whether swap is completed
        bool cancelled;         // Whether swap is cancelled
        bytes32 revealedSecret; // Secret revealed for claiming
    }

    // Storage
    mapping(bytes32 => CrossChainOrder) public orders;
    mapping(address => bool) public authorizedResolvers;
    
    // Configuration
    uint256 public constant TIMELOCK_DURATION = 1800; // 30 minutes
    
    modifier onlyAuthorizedResolver() {
        require(authorizedResolvers[msg.sender], "Not authorized resolver");
        _;
    }

    constructor() Ownable(msg.sender) {
        // Initial setup - authorize deployer as resolver
        authorizedResolvers[msg.sender] = true;
    }

    /**
     * @notice Post-interaction function called by Limit Order Protocol
     * @dev This function is called after a limit order is filled to initiate cross-chain swap
     * @param orderHash Hash of the original limit order
     * @param maker Address of the order maker
     * @param taker Address of the order taker (resolver)
     * @param makingAmount Amount of tokens being swapped
     * @param takingAmount Amount of tokens received
     * @param interactionData Encoded cross-chain swap parameters
     */
    function processLimitOrderFill(
        bytes32 orderHash,
        address maker,
        address taker,
        uint256 makingAmount,
        uint256 takingAmount,
        bytes calldata interactionData
    ) external onlyAuthorizedResolver nonReentrant {
        
        // Decode interaction data
        (
            bytes32 hashlock,
            address token,
            string memory nearAccount,
            uint256 deadline
        ) = abi.decode(interactionData, (bytes32, address, string, uint256));

        require(deadline > block.timestamp, "Order expired");
        require(orders[orderHash].maker == address(0), "Order already exists");

        // Create cross-chain order
        orders[orderHash] = CrossChainOrder({
            maker: maker,
            taker: taker,
            hashlock: hashlock,
            token: token,
            amount: makingAmount,
            nearAccount: nearAccount,
            deadline: deadline,
            completed: false,
            cancelled: false,
            revealedSecret: bytes32(0)
        });

        emit CrossChainSwapInitiated(
            maker,
            taker,
            orderHash,
            hashlock,
            token,
            makingAmount,
            nearAccount
        );
    }

    /**
     * @notice Reveal secret to complete cross-chain swap
     * @param orderHash Hash of the cross-chain order
     * @param secret Secret that generates the hashlock
     */
    function revealSecret(bytes32 orderHash, bytes32 secret) external nonReentrant {
        CrossChainOrder storage order = orders[orderHash];
        
        require(order.maker != address(0), "Order does not exist");
        require(!order.completed && !order.cancelled, "Order already finalized");
        require(block.timestamp <= order.deadline, "Order expired");
        require(keccak256(abi.encode(secret)) == order.hashlock, "Invalid secret");

        // Mark as completed and store secret
        order.completed = true;
        order.revealedSecret = secret;

        emit SecretRevealed(orderHash, secret);
        emit SwapCompleted(orderHash);
    }

    /**
     * @notice Cancel cross-chain swap after timeout
     * @param orderHash Hash of the cross-chain order
     */
    function cancelSwap(bytes32 orderHash) external nonReentrant {
        CrossChainOrder storage order = orders[orderHash];
        
        require(order.maker != address(0), "Order does not exist");
        require(!order.completed && !order.cancelled, "Order already finalized");
        require(
            block.timestamp > order.deadline + TIMELOCK_DURATION || 
            msg.sender == order.maker,
            "Cannot cancel yet"
        );

        order.cancelled = true;
        emit SwapCancelled(orderHash);
    }

    /**
     * @notice Get order details
     * @param orderHash Hash of the cross-chain order
     */
    function getOrder(bytes32 orderHash) external view returns (CrossChainOrder memory) {
        return orders[orderHash];
    }

    /**
     * @notice Check if secret is valid for order
     * @param orderHash Hash of the cross-chain order
     * @param secret Secret to validate
     */
    function isValidSecret(bytes32 orderHash, bytes32 secret) external view returns (bool) {
        return keccak256(abi.encode(secret)) == orders[orderHash].hashlock;
    }

    // Administrative functions
    
    /**
     * @notice Authorize a resolver to process orders
     * @param resolver Address to authorize
     */
    function authorizeResolver(address resolver) external onlyOwner {
        authorizedResolvers[resolver] = true;
    }

    /**
     * @notice Revoke resolver authorization
     * @param resolver Address to revoke
     */
    function revokeResolver(address resolver) external onlyOwner {
        authorizedResolvers[resolver] = false;
    }

    /**
     * @notice Emergency function to rescue stuck tokens
     * @param token Token address (address(0) for ETH)
     * @param amount Amount to rescue
     */
    function emergencyRescue(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            (bool success, ) = owner().call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(token).safeTransfer(owner(), amount);
        }
    }

    // Allow contract to receive ETH
    receive() external payable {}
}