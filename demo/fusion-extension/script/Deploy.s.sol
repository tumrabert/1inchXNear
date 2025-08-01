// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/SimpleLimitOrderProtocol.sol";
import "../contracts/FusionNearExtension.sol";

contract DeployScript is Script {
    function run() external {
        // Load private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying from:", deployer);
        console.log("Deployer balance:", deployer.balance);
        
        vm.startBroadcast(deployerPrivateKey);

        // Deploy SimpleLimitOrderProtocol
        console.log("Deploying SimpleLimitOrderProtocol...");
        SimpleLimitOrderProtocol limitOrderProtocol = new SimpleLimitOrderProtocol();
        console.log("SimpleLimitOrderProtocol deployed to:", address(limitOrderProtocol));

        // Deploy FusionNearExtension
        console.log("Deploying FusionNearExtension...");
        FusionNearExtension fusionExtension = new FusionNearExtension();
        console.log("FusionNearExtension deployed to:", address(fusionExtension));

        vm.stopBroadcast();

        // Log deployment info
        console.log("");
        console.log("=== DEPLOYMENT SUMMARY ===");
        console.log("SimpleLimitOrderProtocol:", address(limitOrderProtocol));
        console.log("FusionNearExtension:", address(fusionExtension));
        console.log("");
        console.log("Explorer links:");
        console.log("SimpleLimitOrderProtocol: https://sepolia.etherscan.io/address/%s", address(limitOrderProtocol));
        console.log("FusionNearExtension: https://sepolia.etherscan.io/address/%s", address(fusionExtension));
    }
}