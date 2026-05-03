// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {StakeToken} from "../src/StakeToken.sol";
import {RewardToken} from "../src/RewardToken.sol";
import {Staking} from "../src/Staking.sol";

contract StakingTest is Test {
    StakeToken stk;
    RewardToken rwd;
    Staking staking;

    address owner = address(this);
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    // 10% APR
    uint256 constant RATE = 3_170_979_198;

    function setUp() public {
        stk = new StakeToken(owner);
        rwd = new RewardToken(owner);
        staking = new Staking(address(stk), address(rwd), RATE, owner);

        // fund contract with rewards
        rwd.approve(address(staking), 1_000_000 ether);
        staking.fundRewards(1_000_000 ether);

        // give alice & bob some stake tokens
        stk.mint(alice, 10_000 ether);
        stk.mint(bob, 10_000 ether);
    }

    // ─── stake ───────────────────────────────────────────────────────────────

    function test_StakeSuccess() public {
        vm.startPrank(alice);
        stk.approve(address(staking), 1_000 ether);
        staking.stake(1_000 ether);
        vm.stopPrank();

        (uint256 amount,,) = staking.users(alice);
        assertEq(amount, 1_000 ether);
        assertEq(staking.totalStaked(), 1_000 ether);
    }

    function test_StakeZeroReverts() public {
        vm.prank(alice);
        vm.expectRevert("amount = 0");
        staking.stake(0);
    }

    // ─── withdraw ─────────────────────────────────────────────────────────────

    function test_WithdrawSuccess() public {
        _stakeAs(alice, 1_000 ether);
        vm.prank(alice);
        staking.withdraw(500 ether);

        (uint256 amount,,) = staking.users(alice);
        assertEq(amount, 500 ether);
    }

    function test_WithdrawMoreThanStakedReverts() public {
        _stakeAs(alice, 500 ether);
        vm.prank(alice);
        vm.expectRevert("bad amount");
        staking.withdraw(501 ether);
    }

    // ─── rewards ──────────────────────────────────────────────────────────────

    function test_RewardAccruesOverTime() public {
        _stakeAs(alice, 1_000 ether);

        // skip 1 day
        vm.warp(block.timestamp + 1 days);

        uint256 pending = staking.pendingReward(alice);
        // 1000 * 86400 * 3_170_979_198 / 1e18 ≈ 0.2739 RWD
        assertGt(pending, 0);
        console.log("Pending reward after 1 day:", pending);
    }

    function test_ClaimReward() public {
        _stakeAs(alice, 1_000 ether);
        vm.warp(block.timestamp + 30 days);

        uint256 before = rwd.balanceOf(alice);
        vm.prank(alice);
        staking.claim();
        uint256 after_ = rwd.balanceOf(alice);

        assertGt(after_ - before, 0);
    }

    function test_RewardResetsAfterClaim() public {
        _stakeAs(alice, 1_000 ether);
        vm.warp(block.timestamp + 1 days);

        vm.prank(alice);
        staking.claim();

        // rewardDebt should be 0 right after claim (no time passed)
        (,uint256 debt,) = staking.users(alice);
        assertEq(debt, 0);
    }

    // ─── multiple users ───────────────────────────────────────────────────────

    function test_MultipleUsers() public {
        _stakeAs(alice, 2_000 ether);
        _stakeAs(bob, 1_000 ether);

        vm.warp(block.timestamp + 7 days);

        uint256 alicePending = staking.pendingReward(alice);
        uint256 bobPending = staking.pendingReward(bob);

        // alice staked 2x → should earn 2x
        assertApproxEqRel(alicePending, 2 * bobPending, 1e15); // 0.1% tolerance
    }

    function test_MultipleUsersIndependentRewards() public {
        _stakeAs(alice, 1_000 ether);
        vm.warp(block.timestamp + 1 days);

        // bob stakes later — should not affect alice's reward calculation
        _stakeAs(bob, 1_000 ether);
        vm.warp(block.timestamp + 1 days);

        // alice: 2 days of 1000 tokens; bob: 1 day of 1000 tokens
        uint256 alicePending = staking.pendingReward(alice);
        uint256 bobPending = staking.pendingReward(bob);
        assertApproxEqRel(alicePending, 2 * bobPending, 1e15);
    }

    // ─── time simulation ──────────────────────────────────────────────────────

    function test_YearlyRewardApprox10Percent() public {
        _stakeAs(alice, 1_000 ether);
        vm.warp(block.timestamp + 365 days);

        uint256 pending = staking.pendingReward(alice);
        // 10% of 1000 ether ≈ 100 ether (allow 0.1% tolerance for integer division)
        assertApproxEqRel(pending, 100 ether, 1e15);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    function _stakeAs(address user, uint256 amount) internal {
        vm.startPrank(user);
        stk.approve(address(staking), amount);
        staking.stake(amount);
        vm.stopPrank();
    }
}
