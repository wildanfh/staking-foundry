// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title RewardToken — token reward yang diterima staker
contract RewardToken is ERC20, Ownable {
    constructor(address initialOwner) ERC20("Reward Token", "RWD") Ownable(initialOwner) {
        _mint(initialOwner, 10_000_000 * 10 ** decimals());
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
