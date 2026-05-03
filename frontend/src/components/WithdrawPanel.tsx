"use client";

import { useState, useEffect } from "react";
import { parseEther, formatEther } from "viem";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { STAKING_ADDRESS, STAKING_ABI } from "@/lib/contracts";
import { ActionCard, AmountInput, ActionButton } from "./StakePanel";

interface Props {
  stakedAmount: bigint | undefined;
  onSuccess: () => void;
}

export function WithdrawPanel({ stakedAmount, onSuccess }: Props) {
  const [amount, setAmount] = useState("");

  const parsed = (() => {
    try { return amount ? parseEther(amount) : 0n; } catch { return 0n; }
  })();

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess) {
      setAmount("");
      onSuccess();
    }
  }, [isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  const loading = isPending || isLoading;

  function handleWithdraw() {
    if (!parsed) return;
    writeContract({
      address: STAKING_ADDRESS,
      abi: STAKING_ABI,
      functionName: "withdraw",
      args: [parsed],
    });
  }

  return (
    <ActionCard
      title="Withdraw"
      subtitle={`Available: ${stakedAmount !== undefined ? Number(formatEther(stakedAmount)).toFixed(2) : "—"} STK`}
    >
      <AmountInput
        value={amount}
        onChange={setAmount}
        max={stakedAmount}
        placeholder="Amount to withdraw"
      />
      <ActionButton
        onClick={handleWithdraw}
        disabled={!parsed || !stakedAmount || parsed > (stakedAmount ?? 0n) || loading}
        loading={loading}
      >
        Withdraw
      </ActionButton>
    </ActionCard>
  );
}
