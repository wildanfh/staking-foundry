// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Staking
 * @notice Single-pool staking contract with linear reward accrual.
 *
 * Reward model:
 *   pendingReward = stakedAmount * (block.timestamp - lastUpdate) * rewardRatePerSecond / 1e18
 *
 * rewardRatePerSecond is expressed in reward-tokens per staked-token per second (scaled 1e18).
 * Example: 10% APR on 1 STK → rewardRate = 0.10 / 31_536_000 * 1e18 ≈ 3_170_979_198
 */
contract Staking is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ─── State ────────────────────────────────────────────────────────────────

    IERC20 public immutable stakeToken;
    IERC20 public immutable rewardToken;

    /// reward-tokens per staked-token per second, scaled 1e18
    uint256 public rewardRatePerSecond;

    uint256 public totalStaked;

    struct UserInfo {
        uint256 amount;      // staked balance
        uint256 rewardDebt;  // already-accounted reward (scaled 1e18)
        uint256 lastUpdate;  // timestamp of last interaction
    }

    mapping(address => UserInfo) public users;

    // ─── Events ───────────────────────────────────────────────────────────────

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 reward);
    event RewardRateUpdated(uint256 newRate);

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(
        address _stakeToken,
        address _rewardToken,
        uint256 _rewardRatePerSecond,
        address initialOwner
    ) Ownable(initialOwner) {
        require(_stakeToken != address(0) && _rewardToken != address(0), "zero address");
        stakeToken = IERC20(_stakeToken);
        rewardToken = IERC20(_rewardToken);
        rewardRatePerSecond = _rewardRatePerSecond;
    }

    // ─── Core ─────────────────────────────────────────────────────────────────

    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "amount = 0");
        _settleReward(msg.sender);

        stakeToken.safeTransferFrom(msg.sender, address(this), amount);
        users[msg.sender].amount += amount;
        totalStaked += amount;

        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        UserInfo storage u = users[msg.sender];
        require(amount > 0 && amount <= u.amount, "bad amount");
        _settleReward(msg.sender);

        u.amount -= amount;
        totalStaked -= amount;
        stakeToken.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    function claim() external nonReentrant {
        _settleReward(msg.sender);
        uint256 reward = users[msg.sender].rewardDebt;
        if (reward == 0) return;

        users[msg.sender].rewardDebt = 0;
        rewardToken.safeTransfer(msg.sender, reward);

        emit RewardClaimed(msg.sender, reward);
    }

    // ─── View ─────────────────────────────────────────────────────────────────

    function pendingReward(address user) external view returns (uint256) {
        UserInfo storage u = users[user];
        if (u.amount == 0) return u.rewardDebt;

        uint256 accrued = (u.amount * (block.timestamp - u.lastUpdate) * rewardRatePerSecond) / 1e18;
        return u.rewardDebt + accrued;
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setRewardRate(uint256 newRate) external onlyOwner {
        rewardRatePerSecond = newRate;
        emit RewardRateUpdated(newRate);
    }

    /// @notice Owner deposits reward tokens so the contract can pay stakers
    function fundRewards(uint256 amount) external onlyOwner {
        rewardToken.safeTransferFrom(msg.sender, address(this), amount);
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _settleReward(address user) internal {
        UserInfo storage u = users[user];
        if (u.amount > 0) {
            uint256 accrued = (u.amount * (block.timestamp - u.lastUpdate) * rewardRatePerSecond) / 1e18;
            u.rewardDebt += accrued;
        }
        u.lastUpdate = block.timestamp;
    }
}
