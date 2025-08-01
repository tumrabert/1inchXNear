// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
import {EscrowFactory} from "../src/EscrowFactory.sol";

contract DeployEscrowScript is Script {
    EscrowFactory public escrowFactory;

    function run() public {
        vm.startBroadcast();

        // Deploy EscrowFactory with msg.sender as owner (needs 1 wei for reference implementation)
        escrowFactory = new EscrowFactory{value: 1}(msg.sender);
        
        console.log("EscrowFactory deployed at:", address(escrowFactory));
        console.log("Factory owner:", escrowFactory.owner());

        vm.stopBroadcast();
    }
}