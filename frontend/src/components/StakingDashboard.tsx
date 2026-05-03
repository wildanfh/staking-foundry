"use client";

import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { formatEther } from "viem";
import { useEffect, useState, useRef } from "react";
import { STAKING_ADDRESS, STAKE_TOKEN_ADDRESS, REWARD_TOKEN_ADDRESS, STAKING_ABI, ERC20_ABI } from "@/lib/contracts";
import { StakePanel } from "./StakePanel";
import { WithdrawPanel } from "./WithdrawPanel";
import { ClaimPanel } from "./ClaimPanel";

function fmt(val: bigint | undefined, decimals = 4) {
  if (val === undefined) return "—";
  return Number(formatEther(val)).toFixed(decimals);
}

function useAnimatedReward(baseReward: bigint | undefined, ratePerSecond: bigint | undefined) {
  const [display, setDisplay] = useState<bigint>(0n);
  const startRef = useRef<{ ts: number; base: bigint }>({ ts: Date.now(), base: 0n });

  useEffect(() => {
    if (baseReward === undefined || ratePerSecond === undefined) return;
    startRef.current = { ts: Date.now(), base: baseReward };

    const id = setInterval(() => {
      const elapsed = BigInt(Math.floor((Date.now() - startRef.current.ts) / 1000));
      // pendingReward already includes staked amount implicitly — we just add seconds * rate on top
      // but we don't have stakedAmount here, so we keep it simple: smooth increment
      setDisplay(startRef.current.base + elapsed * ratePerSecond);
    }, 1000);

    setDisplay(baseReward);
    return () => clearInterval(id);
  }, [baseReward, ratePerSecond]);

  return display;
}

export function StakingDashboard() {
  const { address, isConnected } = useAccount();

  const { data: totalStaked, refetch: refetchTotal } = useReadContract({
    address: STAKING_ADDRESS,
    abi: STAKING_ABI,
    functionName: "totalStaked",
  });

  const { data: userInfo, refetch: refetchUser } = useReadContract({
    address: STAKING_ADDRESS,
    abi: STAKING_ABI,
    functionName: "users",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: pendingReward, refetch: refetchPending } = useReadContract({
    address: STAKING_ADDRESS,
    abi: STAKING_ABI,
    functionName: "pendingReward",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: ratePerSecond } = useReadContract({
    address: STAKING_ADDRESS,
    abi: STAKING_ABI,
    functionName: "rewardRatePerSecond",
  });

  const { data: balances } = useReadContracts({
    contracts: address
      ? [
          { address: STAKE_TOKEN_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf", args: [address] },
          { address: REWARD_TOKEN_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf", args: [address] },
        ]
      : [],
    query: { enabled: !!address },
  });

  const stakedAmount = userInfo?.[0];
  // For animated reward: per-staked-token rate × staked amount
  const userRatePerSecond =
    stakedAmount !== undefined && ratePerSecond !== undefined
      ? (stakedAmount * ratePerSecond) / 10n ** 18n
      : undefined;

  const animatedReward = useAnimatedReward(pendingReward, userRatePerSecond);

  const apr =
    ratePerSecond !== undefined
      ? (Number(ratePerSecond) * 31_536_000) / 1e18
      : null;

  const stkBalance = balances?.[0]?.result as bigint | undefined;
  const rwdBalance = balances?.[1]?.result as bigint | undefined;

  function refetchAll() {
    refetchTotal();
    refetchUser();
    refetchPending();
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="TVL" value={`${fmt(totalStaked, 2)} STK`} />
        <StatCard label="APR" value={apr !== null ? `${(apr * 100).toFixed(1)}%` : "—"} highlight />
        <StatCard label="Your Stake" value={`${fmt(stakedAmount, 2)} STK`} />
        <StatCard label="Pending Reward" value={`${fmt(animatedReward, 6)} RWD`} highlight />
      </div>

      {/* Wallet balances */}
      {isConnected && (
        <div className="flex gap-3 text-sm text-zinc-400">
          <span>Wallet: <span className="text-zinc-200">{fmt(stkBalance, 2)} STK</span></span>
          <span className="text-zinc-600">|</span>
          <span><span className="text-zinc-200">{fmt(rwdBalance, 4)} RWD</span></span>
        </div>
      )}

      {/* Action panels */}
      {isConnected ? (
        <div className="grid md:grid-cols-3 gap-4">
          <StakePanel
            stkBalance={stkBalance}
            stakedAmount={stakedAmount}
            onSuccess={refetchAll}
          />
          <WithdrawPanel
            stakedAmount={stakedAmount}
            onSuccess={refetchAll}
          />
          <ClaimPanel
            pendingReward={animatedReward}
            onSuccess={refetchAll}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-500">
          Connect your wallet to start staking
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-violet-500/30 bg-violet-500/5" : "border-zinc-800 bg-zinc-900/40"}`}>
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className={`text-lg font-semibold font-mono ${highlight ? "text-violet-300" : "text-zinc-100"}`}>
        {value}
      </p>
    </div>
  );
}
