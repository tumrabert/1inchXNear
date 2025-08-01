// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Simple Limit Order Protocol
 * @notice Simplified version of 1inch Limit Order Protocol for hackathon/testnet deployment
 * @dev Supports basic limit orders with post-interaction hooks for Fusion+ Near extension
 */
contract SimpleLimitOrderProtocol is EIP712, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    // Order structure
    struct Order {
        address maker;              // Order creator
        address makerAsset;         // Asset to sell (address(0) for ETH)
        address takerAsset;         // Asset to buy (address(0) for ETH)  
        uint256 makingAmount;       // Amount to sell
        uint256 takingAmount;       // Amount to buy
        uint256 salt;               // Unique order identifier
        uint256 deadline;           // Order expiration
        bytes postInteraction;      // Post-interaction call data
    }

    // Order status tracking
    mapping(bytes32 => uint256) public filledAmount;
    mapping(bytes32 => bool) public cancelledOrders;

    // Events
    event OrderFilled(
        bytes32 indexed orderHash,
        address indexed maker,
        address indexed taker,
        uint256 makingAmount,
        uint256 takingAmount
    );
    
    event OrderCancelled(bytes32 indexed orderHash);
    
    event PostInteractionFailed(bytes32 indexed orderHash, bytes reason);

    // Constants
    bytes32 private constant ORDER_TYPEHASH = keccak256(
        "Order(address maker,address makerAsset,address takerAsset,uint256 makingAmount,uint256 takingAmount,uint256 salt,uint256 deadline,bytes postInteraction)"
    );

    constructor() 
        EIP712("SimpleLimitOrderProtocol", "1") 
        Ownable(msg.sender) 
    {}

    /**
     * @notice Fill a limit order
     * @param order Order to fill
     * @param signature Maker's signature
     * @param takingAmount Amount taker wants to take
     * @param postInteractionTarget Contract to call for post-interaction
     */
    function fillOrder(
        Order calldata order,
        bytes calldata signature,
        uint256 takingAmount,
        address postInteractionTarget
    ) external payable nonReentrant whenNotPaused {
        require(block.timestamp <= order.deadline, "Order expired");
        require(takingAmount > 0, "Invalid taking amount");
        
        bytes32 orderHash = _getOrderHash(order);
        
        require(!cancelledOrders[orderHash], "Order cancelled");
        require(filledAmount[orderHash] + takingAmount <= order.takingAmount, "Exceeds order amount");

        // Verify signature
        require(_isValidSignature(order, signature, orderHash), "Invalid signature");

        // Calculate proportional making amount
        uint256 makingAmount = (order.makingAmount * takingAmount) / order.takingAmount;

        // Update filled amount
        filledAmount[orderHash] += takingAmount;

        // Execute transfers
        _executeTransfers(order, makingAmount, takingAmount);

        emit OrderFilled(orderHash, order.maker, msg.sender, makingAmount, takingAmount);

        // Execute post-interaction if specified
        if (postInteractionTarget != address(0) && order.postInteraction.length > 0) {
            _executePostInteraction(
                orderHash,
                order,
                makingAmount,
                takingAmount,
                postInteractionTarget
            );
        }
    }

    /**
     * @notice Cancel an order
     * @param order Order to cancel
     */
    function cancelOrder(Order calldata order) external {
        bytes32 orderHash = _getOrderHash(order);
        require(order.maker == msg.sender, "Only maker can cancel");
        require(!cancelledOrders[orderHash], "Already cancelled");
        
        cancelledOrders[orderHash] = true;
        emit OrderCancelled(orderHash);
    }

    /**
     * @notice Get order hash
     * @param order Order struct
     */
    function getOrderHash(Order calldata order) external view returns (bytes32) {
        return _getOrderHash(order);
    }

    /**
     * @notice Check if order is valid
     * @param order Order to check
     * @param signature Maker's signature
     */
    function isValidSignature(Order calldata order, bytes calldata signature) external view returns (bool) {
        bytes32 orderHash = _getOrderHash(order);
        return _isValidSignature(order, signature, orderHash);
    }

    /**
     * @notice Get remaining fillable amount for order
     * @param order Order to check
     */
    function remainingAmount(Order calldata order) external view returns (uint256) {
        bytes32 orderHash = _getOrderHash(order);
        return order.takingAmount - filledAmount[orderHash];
    }

    // Internal functions

    function _getOrderHash(Order calldata order) internal view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(
            ORDER_TYPEHASH,
            order.maker,
            order.makerAsset,
            order.takerAsset,
            order.makingAmount,
            order.takingAmount,
            order.salt,
            order.deadline,
            keccak256(order.postInteraction)
        )));
    }

    function _isValidSignature(
        Order calldata order,
        bytes calldata signature,
        bytes32 orderHash
    ) internal pure returns (bool) {
        address signer = orderHash.recover(signature);
        return signer == order.maker;
    }

    function _executeTransfers(
        Order calldata order,
        uint256 makingAmount,
        uint256 takingAmount
    ) internal {
        // Transfer making asset from maker to taker
        if (order.makerAsset == address(0)) {
            // ETH transfer - maker should have sent ETH to this contract beforehand
            require(address(this).balance >= makingAmount, "Insufficient ETH in contract");
            (bool success, ) = msg.sender.call{value: makingAmount}("");
            require(success, "ETH transfer to taker failed");
        } else {
            // ERC20 transfer
            IERC20(order.makerAsset).safeTransferFrom(order.maker, msg.sender, makingAmount);
        }

        // Transfer taking asset from taker to maker  
        if (order.takerAsset == address(0)) {
            // ETH transfer
            require(msg.value >= takingAmount, "Insufficient ETH sent");
            (bool success, ) = order.maker.call{value: takingAmount}("");
            require(success, "ETH transfer to maker failed");
            
            // Refund excess ETH
            if (msg.value > takingAmount) {
                (bool refundSuccess, ) = msg.sender.call{value: msg.value - takingAmount}("");
                require(refundSuccess, "ETH refund failed");
            }
        } else {
            // ERC20 transfer
            IERC20(order.takerAsset).safeTransferFrom(msg.sender, order.maker, takingAmount);
        }
    }

    function _executePostInteraction(
        bytes32 orderHash,
        Order calldata order,
        uint256 makingAmount,
        uint256 takingAmount,
        address target
    ) internal {
        try this.callPostInteraction(
            target,
            orderHash,
            order.maker,
            msg.sender,
            makingAmount,
            takingAmount,
            order.postInteraction
        ) {
            // Post-interaction succeeded
        } catch (bytes memory reason) {
            emit PostInteractionFailed(orderHash, reason);
        }
    }

    /**
     * @notice External function to call post-interaction (for try/catch)
     */
    function callPostInteraction(
        address target,
        bytes32 orderHash,
        address maker,
        address taker,
        uint256 makingAmount,
        uint256 takingAmount,
        bytes calldata data
    ) external {
        require(msg.sender == address(this), "Only self");
        
        // Call the post-interaction function
        (bool success, ) = target.call(
            abi.encodeWithSelector(
                bytes4(keccak256("processLimitOrderFill(bytes32,address,address,uint256,uint256,bytes)")),
                orderHash,
                maker,
                taker,
                makingAmount,
                takingAmount,
                data
            )
        );
        
        require(success, "Post-interaction call failed");
    }

    // Admin functions
    
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Allow contract to receive ETH
    receive() external payable {}
}