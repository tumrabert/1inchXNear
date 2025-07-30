// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IEscrowSrc
 * @dev Interface for source chain escrow contracts
 */
interface IEscrowSrc {
    struct EscrowImmutables {
        bytes32 hashlock;
        address token;
        uint256 amount;
        address maker;
        address taker;
        uint256 safetyDeposit;
        uint64 timelocks;
        uint256 deployedAt;
    }

    // Events
    event Withdrawn(address indexed maker, bytes32 secret);
    event Cancelled(address indexed taker);
    event SecretRevealed(bytes32 indexed secret);

    // View functions
    function getImmutables() external view returns (EscrowImmutables memory);
    function isWithdrawn() external view returns (bool);
    function isCancelled() external view returns (bool);
    function getRevealedSecret() external view returns (bytes32);

    // State-changing functions
    function withdraw(bytes32 secret) external;
    function cancel() external;
    function rescueFunds(address token, uint256 amount) external;
}