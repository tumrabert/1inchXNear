// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";
import {EscrowSrc} from "./EscrowSrc.sol";
import {IEscrowFactory} from "./IEscrowFactory.sol";

/**
 * @title EscrowFactory
 * @dev Factory contract for creating escrow contracts using CREATE2
 * Compatible with 1inch Fusion+ architecture
 */
contract EscrowFactory is IEscrowFactory, Ownable {
    
    // Escrow implementation contract (for reference)
    address public immutable escrowImplementation;
    
    // Track created escrows
    mapping(address => bool) public isEscrow;
    address[] public allEscrows;

    modifier validParams(EscrowParams calldata params) {
        require(params.maker != address(0) && params.taker != address(0), "Invalid addresses");
        require(params.amount > 0, "Invalid amount");
        require(params.safetyDeposit > 0, "Invalid safety deposit");
        _;
    }

    /**
     * @dev Initialize factory with owner
     */
    constructor(address _owner) Ownable(_owner) {
        // Deploy a reference implementation
        escrowImplementation = address(new EscrowSrc(
            bytes32(0),
            address(0),
            1,
            address(this),
            address(this),
            1,
            0
        ));
    }

    /**
     * @dev Create a new escrow contract using CREATE2 for deterministic addresses
     */
    function createEscrow(EscrowParams calldata params) 
        external 
        payable 
        override 
        validParams(params) 
        returns (address escrow) 
    {
        require(msg.value >= params.safetyDeposit, "Insufficient safety deposit");

        // Generate salt for CREATE2
        bytes32 salt = _generateSalt(params);

        // Create escrow contract with CREATE2
        escrow = address(new EscrowSrc{salt: salt, value: params.safetyDeposit}(
            params.hashlock,
            params.token,
            params.amount,
            params.maker,
            params.taker,
            params.safetyDeposit,
            params.timelocks
        ));

        // Track the escrow
        isEscrow[escrow] = true;
        allEscrows.push(escrow);

        emit EscrowCreated(escrow, params.maker, params.taker, params.hashlock);

        return escrow;
    }

    /**
     * @dev Create multiple escrow contracts in a single transaction
     */
    function createEscrowBatch(EscrowParams[] calldata params) 
        external 
        payable 
        override 
        returns (address[] memory escrows) 
    {
        uint256 length = params.length;
        require(length > 0, "Empty batch");
        
        escrows = new address[](length);
        uint256 totalSafetyDeposit = 0;

        // Calculate total safety deposit needed
        for (uint256 i = 0; i < length; i++) {
            totalSafetyDeposit += params[i].safetyDeposit;
        }
        require(msg.value >= totalSafetyDeposit, "Insufficient total safety deposit");

        // Create each escrow
        for (uint256 i = 0; i < length; i++) {
            EscrowParams calldata param = params[i];
            require(param.maker != address(0) && param.taker != address(0), "Invalid addresses");
            require(param.amount > 0, "Invalid amount");

            bytes32 salt = _generateSalt(param);

            address escrow = address(new EscrowSrc{salt: salt, value: param.safetyDeposit}(
                param.hashlock,
                param.token,
                param.amount,
                param.maker,
                param.taker,
                param.safetyDeposit,
                param.timelocks
            ));

            isEscrow[escrow] = true;
            allEscrows.push(escrow);
            escrows[i] = escrow;

            emit EscrowCreated(escrow, param.maker, param.taker, param.hashlock);
        }

        return escrows;
    }

    /**
     * @dev Predict the address of an escrow contract before creation
     */
    function predictEscrowAddress(EscrowParams calldata params) 
        external 
        view 
        override 
        returns (address) 
    {
        bytes32 salt = _generateSalt(params);
        
        bytes memory bytecode = abi.encodePacked(
            type(EscrowSrc).creationCode,
            abi.encode(
                params.hashlock,
                params.token,
                params.amount,
                params.maker,
                params.taker,
                params.safetyDeposit,
                params.timelocks
            )
        );

        return Create2.computeAddress(salt, keccak256(bytecode));
    }

    /**
     * @dev Get the total number of created escrows
     */
    function escrowCount() external view returns (uint256) {
        return allEscrows.length;
    }

    /**
     * @dev Get escrow at specific index
     */
    function getEscrow(uint256 index) external view returns (address) {
        require(index < allEscrows.length, "Index out of bounds");
        return allEscrows[index];
    }

    /**
     * @dev Get all escrows created by this factory
     */
    function getAllEscrows() external view returns (address[] memory) {
        return allEscrows;
    }

    /**
     * @dev Get escrows in a specific range
     */
    function getEscrowsRange(uint256 start, uint256 end) 
        external 
        view 
        returns (address[] memory) 
    {
        require(start <= end, "Invalid range");
        require(end <= allEscrows.length, "End index out of bounds");

        address[] memory result = new address[](end - start);
        for (uint256 i = start; i < end; i++) {
            result[i - start] = allEscrows[i];
        }
        
        return result;
    }

    /**
     * @dev Emergency function to recover stuck ETH (owner only)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "ETH transfer failed");
    }

    /**
     * @dev Generate deterministic salt for CREATE2
     */
    function _generateSalt(EscrowParams calldata params) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            params.hashlock,
            params.token,
            params.amount,
            params.maker,
            params.taker,
            params.safetyDeposit,
            params.timelocks
        ));
    }

    /**
     * @dev Allow factory to receive ETH
     */
    receive() external payable {}
}