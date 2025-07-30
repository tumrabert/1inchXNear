// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title TimelocksLib
 * @dev Library for managing 7-stage timelock system compatible with 1inch Fusion+
 */
library TimelocksLib {
    enum Stage {
        SrcWithdrawal,      // 0: Private withdrawal on source chain
        SrcPublicWithdrawal, // 1: Public withdrawal on source chain
        SrcCancellation,    // 2: Private cancellation on source chain
        SrcPublicCancellation, // 3: Public cancellation on source chain
        DstWithdrawal,      // 4: Private withdrawal on destination chain
        DstPublicWithdrawal, // 5: Public withdrawal on destination chain
        DstCancellation     // 6: Cancellation on destination chain
    }

    struct Timelocks {
        uint32 srcWithdrawal;
        uint32 srcPublicWithdrawal;
        uint32 srcCancellation;
        uint32 srcPublicCancellation;
        uint32 dstWithdrawal;
        uint32 dstPublicWithdrawal;
        uint32 dstCancellation;
    }

    /**
     * @dev Pack timelock stages into uint64 for gas efficiency
     */
    function packTimelocks(Timelocks memory timelocks) internal pure returns (uint64) {
        return uint64(timelocks.srcWithdrawal) |
               (uint64(timelocks.srcPublicWithdrawal) << 32) |
               (uint64(timelocks.srcCancellation) << 64) |
               (uint64(timelocks.srcPublicCancellation) << 96) |
               (uint64(timelocks.dstWithdrawal) << 128) |
               (uint64(timelocks.dstPublicWithdrawal) << 160) |
               (uint64(timelocks.dstCancellation) << 192);
    }

    /**
     * @dev Unpack uint64 into timelock stages
     */
    function unpackTimelocks(uint64 packed) internal pure returns (Timelocks memory) {
        return Timelocks({
            srcWithdrawal: uint32(packed),
            srcPublicWithdrawal: uint32(packed >> 32),
            srcCancellation: uint32(packed >> 64),
            srcPublicCancellation: uint32(packed >> 96),
            dstWithdrawal: uint32(packed >> 128),
            dstPublicWithdrawal: uint32(packed >> 160),
            dstCancellation: uint32(packed >> 192)
        });
    }

    /**
     * @dev Get current stage based on time elapsed since deployment
     */
    function getCurrentStage(uint64 timelocks, uint256 deployedAt) internal view returns (Stage) {
        uint256 elapsed = block.timestamp - deployedAt;
        Timelocks memory unpacked = unpackTimelocks(timelocks);

        if (elapsed < unpacked.srcWithdrawal) return Stage.SrcWithdrawal;
        if (elapsed < unpacked.srcPublicWithdrawal) return Stage.SrcPublicWithdrawal;
        if (elapsed < unpacked.srcCancellation) return Stage.SrcCancellation;
        if (elapsed < unpacked.srcPublicCancellation) return Stage.SrcPublicCancellation;
        if (elapsed < unpacked.dstWithdrawal) return Stage.DstWithdrawal;
        if (elapsed < unpacked.dstPublicWithdrawal) return Stage.DstPublicWithdrawal;
        
        return Stage.DstCancellation;
    }

    /**
     * @dev Check if current stage allows withdrawal
     */
    function canWithdraw(uint64 timelocks, uint256 deployedAt, bool isPublic) internal view returns (bool) {
        Stage current = getCurrentStage(timelocks, deployedAt);
        
        if (isPublic) {
            return current == Stage.SrcPublicWithdrawal || current == Stage.DstPublicWithdrawal;
        } else {
            return current == Stage.SrcWithdrawal || current == Stage.DstWithdrawal;
        }
    }

    /**
     * @dev Check if current stage allows cancellation
     */
    function canCancel(uint64 timelocks, uint256 deployedAt, bool isPublic) internal view returns (bool) {
        Stage current = getCurrentStage(timelocks, deployedAt);
        
        if (isPublic) {
            return current == Stage.SrcPublicCancellation;
        } else {
            return current == Stage.SrcCancellation || current == Stage.DstCancellation;
        }
    }

    /**
     * @dev Create default timelock configuration (for testing)
     */
    function createDefaultTimelocks(uint32 baseDuration) internal pure returns (Timelocks memory) {
        return Timelocks({
            srcWithdrawal: baseDuration,
            srcPublicWithdrawal: baseDuration * 2,
            srcCancellation: baseDuration * 3,
            srcPublicCancellation: baseDuration * 4,
            dstWithdrawal: baseDuration * 5,
            dstPublicWithdrawal: baseDuration * 6,
            dstCancellation: baseDuration * 7
        });
    }
}