// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {TimelocksLib} from "./TimelocksLib.sol";
import {IEscrowSrc} from "./IEscrowSrc.sol";

/**
 * @title EscrowSrc
 * @dev Source chain escrow contract for cross-chain atomic swaps
 * Compatible with 1inch Fusion+ architecture
 */
contract EscrowSrc is IEscrowSrc, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using TimelocksLib for uint64;

    // Immutable escrow parameters stored individually
    bytes32 public immutable hashlock;
    address public immutable token;
    uint256 public immutable amount;
    address public immutable maker;
    address public immutable taker;
    uint256 public immutable safetyDeposit;
    uint64 public immutable timelocks;
    uint256 public immutable deployedAt;
    
    // Mutable state
    bool public withdrawn;
    bool public cancelled;
    bytes32 public revealedSecret;

    modifier onlyTaker() {
        require(msg.sender == taker, "Only taker");
        _;
    }

    modifier notWithdrawn() {
        require(!withdrawn, "Already withdrawn");
        _;
    }

    modifier notCancelled() {
        require(!cancelled, "Already cancelled");
        _;
    }

    /**
     * @dev Initialize escrow with immutable parameters
     */
    constructor(
        bytes32 _hashlock,
        address _token,
        uint256 _amount,
        address _maker,
        address _taker,
        uint256 _safetyDeposit,
        uint64 _timelocks
    ) payable {
        require(_maker != address(0) && _taker != address(0), "Invalid addresses");
        require(_amount > 0, "Invalid amount");
        require(msg.value >= _safetyDeposit, "Insufficient safety deposit");

        hashlock = _hashlock;
        token = _token;
        amount = _amount;
        maker = _maker;
        taker = _taker;
        safetyDeposit = _safetyDeposit;
        timelocks = _timelocks;
        deployedAt = block.timestamp;

        // Transfer tokens from maker to escrow
        if (_token != address(0)) {
            IERC20(_token).safeTransferFrom(_maker, address(this), _amount);
        }
    }

    /**
     * @dev Withdraw tokens by revealing the secret
     */
    function withdraw(bytes32 secret) external override onlyTaker notWithdrawn notCancelled nonReentrant {
        // Verify secret matches hashlock
        require(keccak256(abi.encode(secret)) == hashlock, "Invalid secret");
        
        // Check timelock stage allows withdrawal
        require(
            timelocks.canWithdraw(deployedAt, false),
            "Withdrawal not allowed in current stage"
        );

        withdrawn = true;
        revealedSecret = secret;

        // Transfer tokens to maker
        _transferTokens(maker, amount);

        // Transfer safety deposit to taker
        _transferEther(taker, safetyDeposit);

        emit Withdrawn(maker, secret);
        emit SecretRevealed(secret);
    }

    /**
     * @dev Public withdrawal (anyone can call after timeout)
     */
    function publicWithdraw(bytes32 secret) external notWithdrawn notCancelled nonReentrant {
        // Verify secret matches hashlock
        require(keccak256(abi.encode(secret)) == hashlock, "Invalid secret");
        
        // Check timelock stage allows public withdrawal
        require(
            timelocks.canWithdraw(deployedAt, true),
            "Public withdrawal not allowed"
        );

        withdrawn = true;
        revealedSecret = secret;

        // Transfer tokens to maker
        _transferTokens(maker, amount);

        // Transfer safety deposit to caller
        _transferEther(msg.sender, safetyDeposit);

        emit Withdrawn(maker, secret);
        emit SecretRevealed(secret);
    }

    /**
     * @dev Cancel the escrow and return tokens
     */
    function cancel() external override onlyTaker notWithdrawn notCancelled nonReentrant {
        // Check timelock stage allows cancellation
        require(
            timelocks.canCancel(deployedAt, false),
            "Cancellation not allowed in current stage"
        );

        cancelled = true;

        // Return tokens to taker
        _transferTokens(taker, amount);

        // Return safety deposit to taker
        _transferEther(taker, safetyDeposit);

        emit Cancelled(taker);
    }

    /**
     * @dev Public cancellation (anyone can call after timeout)
     */
    function publicCancel() external notWithdrawn notCancelled nonReentrant {
        // Check timelock stage allows public cancellation
        require(
            timelocks.canCancel(deployedAt, true),
            "Public cancellation not allowed"
        );

        cancelled = true;

        // Return tokens to taker
        _transferTokens(taker, amount);

        // Transfer safety deposit to caller
        _transferEther(msg.sender, safetyDeposit);

        emit Cancelled(taker);
    }

    /**
     * @dev Emergency rescue of stuck funds (only after extended timeout)
     */
    function rescueFunds(address _token, uint256 _amount) external override onlyTaker {
        require(
            block.timestamp > deployedAt + 7 days,
            "Rescue not available yet"
        );

        if (_token == address(0)) {
            _transferEther(taker, _amount);
        } else {
            IERC20(_token).safeTransfer(taker, _amount);
        }
    }

    /**
     * @dev Get immutable escrow parameters
     */
    function getImmutables() external view override returns (EscrowImmutables memory) {
        return EscrowImmutables({
            hashlock: hashlock,
            token: token,
            amount: amount,
            maker: maker,
            taker: taker,
            safetyDeposit: safetyDeposit,
            timelocks: timelocks,
            deployedAt: deployedAt
        });
    }

    /**
     * @dev Check if escrow is withdrawn
     */
    function isWithdrawn() external view override returns (bool) {
        return withdrawn;
    }

    /**
     * @dev Check if escrow is cancelled
     */
    function isCancelled() external view override returns (bool) {
        return cancelled;
    }

    /**
     * @dev Get revealed secret
     */
    function getRevealedSecret() external view override returns (bytes32) {
        return revealedSecret;
    }

    /**
     * @dev Get current timelock stage
     */
    function getCurrentStage() external view returns (TimelocksLib.Stage) {
        return TimelocksLib.getCurrentStage(timelocks, deployedAt);
    }

    /**
     * @dev Internal function to transfer tokens
     */
    function _transferTokens(address to, uint256 _amount) internal {
        if (token == address(0)) {
            // ETH transfer
            _transferEther(to, _amount);
        } else {
            // ERC20 transfer
            IERC20(token).safeTransfer(to, _amount);
        }
    }

    /**
     * @dev Internal function to transfer ETH
     */
    function _transferEther(address to, uint256 _amount) internal {
        require(address(this).balance >= _amount, "Insufficient balance");
        (bool success, ) = to.call{value: _amount}("");
        require(success, "ETH transfer failed");
    }

    /**
     * @dev Allow contract to receive ETH
     */
    receive() external payable {}
}