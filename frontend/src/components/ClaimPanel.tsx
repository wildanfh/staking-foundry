"use client";

import { useEffect } from "react";
import { formatEther } from "viem";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { STAKING_ADDRESS, STAKING_ABI } from "@/lib/contracts";
import { ActionCard, ActionButton } from "./StakePanel";

interface Props {
  pendingReward: bigint;
  onSuccess: () => void;
}

export function ClaimPanel({ pendingReward, onSuccess }: Props) {
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess) onSuccess();
  }, [isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  const loading = isPending || isLoading;

  function handleClaim() {
    writeContract({
      address: STAKING_ADDRESS,
      abi: STAKING_ABI,
      functionName: "claim",
    });
  }

  return (
    <ActionCard title="Claim Rewards" subtitle="Rewards accrue in real-time">
      <div className="rounded-lg bg-zinc-800/40 border border-zinc-700/50 px-4 py-3 text-center">
        <p className="text-xs text-zinc-500 mb-1">Claimable</p>
        <p className="text-2xl font-mono font-bold text-violet-300">
          {Number(formatEther(pendingReward)).toFixed(6)}
        </p>
        <p className="text-xs text-zinc-500 mt-0.5">RWD</p>
      </div>
      <ActionButton
        onClick={handleClaim}
        disabled={pendingReward === 0n || loading}
        loading={loading}
      >
        Claim
      </ActionButton>
    </ActionCard>
  );
}
