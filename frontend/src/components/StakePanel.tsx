"use client";

import { useState, useEffect } from "react";
import { parseEther, formatEther } from "viem";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { STAKING_ADDRESS, STAKE_TOKEN_ADDRESS, STAKING_ABI, ERC20_ABI } from "@/lib/contracts";

interface Props {
  stkBalance: bigint | undefined;
  stakedAmount: bigint | undefined;
  onSuccess: () => void;
}

export function StakePanel({ stkBalance, stakedAmount, onSuccess }: Props) {
  const { address } = useAccount();
  const [amount, setAmount] = useState("");

  const parsed = (() => {
    try { return amount ? parseEther(amount) : 0n; } catch { return 0n; }
  })();

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: STAKE_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, STAKING_ADDRESS] : undefined,
    query: { enabled: !!address },
  });

  const needsApprove = parsed > 0n && (allowance ?? 0n) < parsed;

  const { writeContract: approve, data: approveTxHash, isPending: approvePending } = useWriteContract();
  const { writeContract: stake, data: stakeTxHash, isPending: stakePending } = useWriteContract();

  const { isLoading: approveLoading, isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isLoading: stakeLoading, isSuccess: stakeSuccess } = useWaitForTransactionReceipt({ hash: stakeTxHash });

  useEffect(() => {
    if (approveSuccess) refetchAllowance();
  }, [approveSuccess, refetchAllowance]);

  useEffect(() => {
    if (stakeSuccess) {
      setAmount("");
      onSuccess();
      refetchAllowance();
    }
  }, [stakeSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  const loading = approvePending || approveLoading || stakePending || stakeLoading;

  function handleAction() {
    if (!parsed || !address) return;
    if (needsApprove) {
      approve({ address: STAKE_TOKEN_ADDRESS, abi: ERC20_ABI, functionName: "approve", args: [STAKING_ADDRESS, parsed] });
    } else {
      stake({ address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: "stake", args: [parsed] });
    }
  }

  const btnLabel = loading ? "Waiting…" : needsApprove ? "Approve STK" : "Stake";

  return (
    <ActionCard title="Stake" subtitle={`Staked: ${stakedAmount !== undefined ? Number(formatEther(stakedAmount)).toFixed(2) : "—"} STK`}>
      <AmountInput value={amount} onChange={setAmount} max={stkBalance} placeholder="Amount to stake" />
      <ActionButton onClick={handleAction} disabled={!parsed || loading} loading={loading}>
        {btnLabel}
      </ActionButton>
    </ActionCard>
  );
}

// ─── Shared sub-components ───────────────────────────────────────────────────

export function ActionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-zinc-100">{title}</h3>
        {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function AmountInput({
  value,
  onChange,
  max,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  max: bigint | undefined;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        min="0"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "0.0"}
        className="w-full bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-2 pr-14 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
      />
      {max !== undefined && (
        <button
          type="button"
          onClick={() => onChange(formatEther(max))}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-violet-400 hover:text-violet-300"
        >
          MAX
        </button>
      )}
    </div>
  );
}

export function ActionButton({
  onClick,
  disabled,
  loading,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
