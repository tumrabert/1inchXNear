// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// All-in-one deployment file for Remix IDE
// This combines all necessary contracts for easy deployment

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Create2.sol";

// ========== INTERFACES ==========

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

    function withdraw(bytes32 secret) external;
    function cancel() external;
    function rescueFunds(address token, uint256 amount) external;
    function getImmutables() external view returns (EscrowImmutables memory);
    function isWithdrawn() external view returns (bool);
    function isCancelled() external view returns (bool);
    function getRevealedSecret() external view returns (bytes32);

    event Withdrawn(address indexed to, bytes32 secret);
    event Cancelled(address indexed by);
    event SecretRevealed(bytes32 indexed secret);
}

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

    function createEscrow(EscrowParams calldata params) external payable returns (address);
    function createEscrowBatch(EscrowParams[] calldata params) external payable returns (address[] memory);
    function predictEscrowAddress(EscrowParams calldata params) external view returns (address);

    event EscrowCreated(address indexed escrow, address indexed maker, address indexed taker, bytes32 hashlock);
}

// ========== TIMELOCK LIBRARY ==========

library TimelocksLib {
    enum Stage {
        SrcWithdrawal,
        SrcPublicWithdrawal,
        SrcCancellation,
        SrcPublicCancellation,
        DstWithdrawal,
        DstPublicWithdrawal,
        DstCancellation
    }

    function canWithdraw(uint64 timelocks, uint256 deployedAt, bool isPublic) internal view returns (bool) {
        if (timelocks == 0) return true; // Simplified for testing
        
        uint256 timeElapsed = block.timestamp - deployedAt;
        if (isPublic) {
            return timeElapsed >= 300; // 5 minutes for public withdrawal
        } else {
            return timeElapsed >= 0; // Immediate for private withdrawal
        }
    }

    function canCancel(uint64 timelocks, uint256 deployedAt, bool isPublic) internal view returns (bool) {
        if (timelocks == 0) return timeElapsed >= 600; // 10 minutes for cancellation
        
        uint256 timeElapsed = block.timestamp - deployedAt;
        return timeElapsed >= 1800; // 30 minutes for cancellation
    }

    function getCurrentStage(uint64 timelocks, uint256 deployedAt) internal view returns (Stage) {
        uint256 timeElapsed = block.timestamp - deployedAt;
        
        if (timeElapsed < 300) return Stage.SrcWithdrawal;
        if (timeElapsed < 600) return Stage.SrcPublicWithdrawal;
        return Stage.SrcCancellation;
    }
}

// ========== ESCROW SOURCE CONTRACT ==========

contract EscrowSrc is IEscrowSrc, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using TimelocksLib for uint64;

    bytes32 public immutable hashlock;
    address public immutable token;
    uint256 public immutable amount;
    address public immutable maker;
    address public immutable taker;
    uint256 public immutable safetyDeposit;
    uint64 public immutable timelocks;
    uint256 public immutable deployedAt;
    
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

        if (_token != address(0)) {
            IERC20(_token).safeTransferFrom(_maker, address(this), _amount);
        }
    }

    function withdraw(bytes32 secret) external override onlyTaker notWithdrawn notCancelled nonReentrant {
        require(keccak256(abi.encode(secret)) == hashlock, "Invalid secret");
        require(timelocks.canWithdraw(deployedAt, false), "Withdrawal not allowed");

        withdrawn = true;
        revealedSecret = secret;

        _transferTokens(maker, amount);
        _transferEther(taker, safetyDeposit);

        emit Withdrawn(maker, secret);
        emit SecretRevealed(secret);
    }

    function cancel() external override onlyTaker notWithdrawn notCancelled nonReentrant {
        require(timelocks.canCancel(deployedAt, false), "Cancellation not allowed");

        cancelled = true;
        _transferTokens(taker, amount);
        _transferEther(taker, safetyDeposit);

        emit Cancelled(taker);
    }

    function rescueFunds(address _token, uint256 _amount) external override onlyTaker {
        require(block.timestamp > deployedAt + 7 days, "Rescue not available yet");

        if (_token == address(0)) {
            _transferEther(taker, _amount);
        } else {
            IERC20(_token).safeTransfer(taker, _amount);
        }
    }

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

    function isWithdrawn() external view override returns (bool) {
        return withdrawn;
    }

    function isCancelled() external view override returns (bool) {
        return cancelled;
    }

    function getRevealedSecret() external view override returns (bytes32) {
        return revealedSecret;
    }

    function _transferTokens(address to, uint256 _amount) internal {
        if (token == address(0)) {
            _transferEther(to, _amount);
        } else {
            IERC20(token).safeTransfer(to, _amount);
        }
    }

    function _transferEther(address to, uint256 _amount) internal {
        require(address(this).balance >= _amount, "Insufficient balance");
        (bool success, ) = to.call{value: _amount}("");
        require(success, "ETH transfer failed");
    }

    receive() external payable {}
}

// ========== ESCROW FACTORY CONTRACT ==========

contract EscrowFactory is IEscrowFactory, Ownable {
    
    address public immutable escrowImplementation;
    mapping(address => bool) public isEscrow;
    address[] public allEscrows;

    modifier validParams(EscrowParams calldata params) {
        require(params.maker != address(0) && params.taker != address(0), "Invalid addresses");
        require(params.amount > 0, "Invalid amount");
        require(params.safetyDeposit > 0, "Invalid safety deposit");
        _;
    }

    constructor(address _owner) payable Ownable(_owner) {
        // Deploy a reference implementation
        escrowImplementation = address(new EscrowSrc{value: 1}(
            bytes32(0),
            address(0),
            1,
            address(this),
            address(this),
            1,
            0
        ));
    }

    function createEscrow(EscrowParams calldata params) 
        external 
        payable 
        override 
        validParams(params) 
        returns (address escrow) 
    {
        require(msg.value >= params.safetyDeposit, "Insufficient safety deposit");

        bytes32 salt = _generateSalt(params);

        escrow = address(new EscrowSrc{salt: salt, value: params.safetyDeposit}(
            params.hashlock,
            params.token,
            params.amount,
            params.maker,
            params.taker,
            params.safetyDeposit,
            params.timelocks
        ));

        isEscrow[escrow] = true;
        allEscrows.push(escrow);

        emit EscrowCreated(escrow, params.maker, params.taker, params.hashlock);
        return escrow;
    }

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

        for (uint256 i = 0; i < length; i++) {
            totalSafetyDeposit += params[i].safetyDeposit;
        }
        require(msg.value >= totalSafetyDeposit, "Insufficient total safety deposit");

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

    function escrowCount() external view returns (uint256) {
        return allEscrows.length;
    }

    function getEscrow(uint256 index) external view returns (address) {
        require(index < allEscrows.length, "Index out of bounds");
        return allEscrows[index];
    }

    function getAllEscrows() external view returns (address[] memory) {
        return allEscrows;
    }

    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "ETH transfer failed");
    }

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

    receive() external payable {}
}