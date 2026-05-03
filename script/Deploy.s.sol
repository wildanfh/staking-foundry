// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {StakeToken} from "../src/StakeToken.sol";
import {RewardToken} from "../src/RewardToken.sol";
import {Staking} from "../src/Staking.sol";

contract Deploy is Script {
    // 10% APR: 0.10 / 31_536_000 * 1e18
    uint256 constant REWARD_RATE = 3_170_979_198;

    // pre-fund the staking contract with 1M reward tokens
    uint256 constant INITIAL_FUND = 1_000_000 * 1e18;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        StakeToken stk = new StakeToken(deployer);
        RewardToken rwd = new RewardToken(deployer);
        Staking staking = new Staking(address(stk), address(rwd), REWARD_RATE, deployer);

        // approve + fund
        rwd.approve(address(staking), INITIAL_FUND);
        staking.fundRewards(INITIAL_FUND);

        vm.stopBroadcast();

        console.log("StakeToken :", address(stk));
        console.log("RewardToken:", address(rwd));
        console.log("Staking    :", address(staking));
    }
}
