import { StakingDashboard } from "@/components/StakingDashboard";
import { ConnectButton } from "@/components/ConnectButton";

export const metadata = {
  title: "STK Staking",
  description: "Stake STK tokens and earn RWD rewards on Base",
};

export default function StakingPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Nav */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center text-xs font-bold">S</div>
          <span className="font-semibold text-sm">STK Staking</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500">Base</span>
        </div>
        <ConnectButton />
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-12 pb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Stake{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
            STK
          </span>{" "}
          · Earn{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
            RWD
          </span>
        </h1>
        <p className="mt-2 text-zinc-400 max-w-lg">
          Deposit STK tokens and earn RWD rewards in real-time at a fixed 10% APR. No lock-up. Withdraw anytime.
        </p>
      </section>

      {/* Dashboard */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <StakingDashboard />
      </section>
    </main>
  );
}
