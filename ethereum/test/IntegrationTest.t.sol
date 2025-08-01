// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/EscrowFactory.sol";
import "../src/EscrowSrc.sol";

contract IntegrationTest is Test {
    EscrowFactory public factory;
    address public owner = address(0x1);
    address public maker = address(0x2);
    address public taker = address(0x3);

    function setUp() public {
        vm.deal(owner, 10 ether);
        vm.startPrank(owner);
        factory = new EscrowFactory{value: 1}(owner);
        vm.stopPrank();
    }

    function testCreateAndWithdrawEscrow() public {
        // Test parameters
        bytes32 secret = keccak256("test-secret");
        bytes32 hashlock = keccak256(abi.encode(secret));
        uint256 amount = 1 ether;
        uint256 safetyDeposit = 0.1 ether;
        
        // Create simple timelocks: immediate withdrawal allowed (0 = immediate)
        uint64 timelocks = 0; // All stages at time 0 for testing

        // Give maker some ETH and tokens
        vm.deal(maker, 10 ether);
        
        // Create escrow parameters
        IEscrowFactory.EscrowParams memory params = IEscrowFactory.EscrowParams({
            hashlock: hashlock,
            token: address(0), // ETH
            amount: amount,
            maker: maker,
            taker: taker,
            safetyDeposit: safetyDeposit,
            timelocks: timelocks
        });

        // Create escrow as maker
        vm.startPrank(maker);
        address escrowAddress = factory.createEscrow{value: amount + safetyDeposit}(params);
        vm.stopPrank();

        // Verify escrow was created
        assertTrue(factory.isEscrow(escrowAddress));
        
        // Get escrow contract
        EscrowSrc escrow = EscrowSrc(payable(escrowAddress));
        
        // Verify escrow parameters
        IEscrowSrc.EscrowImmutables memory immutables = escrow.getImmutables();
        assertEq(immutables.hashlock, hashlock);
        assertEq(immutables.amount, amount);
        assertEq(immutables.maker, maker);
        assertEq(immutables.taker, taker);

        // Test withdrawal as taker (need to wait for proper timelock stage)
        uint256 takerBalanceBefore = taker.balance;
        uint256 makerBalanceBefore = maker.balance;
        
        // Skip some time to be in withdrawal stage (simplified - in real implementation we'd use proper timelocks)
        vm.warp(block.timestamp + 1);
        
        vm.startPrank(taker);
        escrow.withdraw(secret);
        vm.stopPrank();

        // Verify withdrawal
        assertTrue(escrow.isWithdrawn());
        assertEq(escrow.getRevealedSecret(), secret);
        
        // Verify balances (maker gets amount, taker gets safety deposit)
        assertEq(maker.balance, makerBalanceBefore + amount);
        assertEq(taker.balance, takerBalanceBefore + safetyDeposit);
    }

    function testPredictEscrowAddress() public {
        bytes32 hashlock = keccak256("test");
        
        IEscrowFactory.EscrowParams memory params = IEscrowFactory.EscrowParams({
            hashlock: hashlock,
            token: address(0),
            amount: 1 ether,
            maker: maker,
            taker: taker,
            safetyDeposit: 0.1 ether,
            timelocks: 0
        });

        // Predict address
        address predicted = factory.predictEscrowAddress(params);
        
        // Create actual escrow
        vm.deal(maker, 10 ether);
        vm.startPrank(maker);
        address actual = factory.createEscrow{value: 1.1 ether}(params);
        vm.stopPrank();

        // Addresses should match
        assertEq(predicted, actual);
    }
}