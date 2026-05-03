"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";
import { baseSepolia } from "wagmi/chains";

export function ConnectButton() {
  const { address, isConnected, chain } = useAccount();
  const { connect, isPending: connecting, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching, error: switchError } = useSwitchChain();

  const isWrongNetwork = isConnected && chain?.id !== baseSepolia.id;

  // Wrong network — show switch button
  if (isWrongNetwork) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={() => switchChain({ chainId: baseSepolia.id })}
          disabled={switching}
          className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
        >
          {switching ? "Switching…" : "Switch to Base Sepolia"}
        </button>
        {switchError && (
          <p className="text-xs text-red-400">{switchError.message}</p>
        )}
      </div>
    );
  }

  // Connected + correct network
  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          {chain?.name ?? "Base Sepolia"}
        </span>
        <span className="text-sm text-zinc-400 font-mono">
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="text-sm px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // Not connected
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={() => connect({ connector: injected(), chainId: baseSepolia.id })}
        disabled={connecting}
        className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
      >
        {connecting ? "Connecting…" : "Connect Wallet"}
      </button>
      {connectError && (
        <p className="text-xs text-red-400">{connectError.message}</p>
      )}
    </div>
  );
}
