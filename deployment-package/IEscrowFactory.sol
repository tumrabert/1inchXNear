// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IEscrowFactory
 * @dev Interface for escrow factory contract
 */
interface IEscrowFactory {
    struct EscrowParams {
        bytes32 hashlock;
        address token;
        uint256 amount;
        address maker;
        address taker;
        uint256 safetyDeposit;
        uint64 timelocks;
    }

    // Events
    event EscrowCreated(
        address indexed escrow,
        address indexed maker,
        address indexed taker,
        bytes32 hashlock
    );

    // View functions
    function escrowImplementation() external view returns (address);
    function predictEscrowAddress(EscrowParams calldata params) external view returns (address);

    // State-changing functions
    function createEscrow(EscrowParams calldata params) external payable returns (address);
    function createEscrowBatch(EscrowParams[] calldata params) external payable returns (address[] memory);
}