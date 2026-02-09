"use client";

import { useEffect, useState } from "react";
import { BookOpenCheck, Plus, Trash2, WandSparkles } from "lucide-react";
import {
  deleteExecutionPlaybook,
  fetchExecutionPlaybooks,
  saveExecutionPlaybook,
  type ExecutionPlaybook,
} from "../lib/execution-playbooks";

type ExecutionPlaybooksLabProps = {
  onApply: (playbook: ExecutionPlaybook) => void;
};

export default function ExecutionPlaybooksLab({ onApply }: ExecutionPlaybooksLabProps) {
  const [playbooks, setPlaybooks] = useState<ExecutionPlaybook[]>([]);
  const [name, setName] = useState("");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [quantity, setQuantity] = useState("10");
  const [slippage, setSlippage] = useState("8");
  const [stopDistance, setStopDistance] = useState("2");
  const [takeProfit, setTakeProfit] = useState("4");
  const [riskPct, setRiskPct] = useState("1");
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const result = await fetchExecutionPlaybooks();
      setPlaybooks(result.data);
    };
    load();
  }, []);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const result = await saveExecutionPlaybook({
      name,
      side,
      orderType,
      quantity: Number(quantity),
      baseSlippageBps: Number(slippage),
      stopDistancePct: Number(stopDistance),
      takeProfitPct: Number(takeProfit),
      riskPerTradePct: Number(riskPct),
      note,
    });
    setPlaybooks(result.data);

    if (!result.ok) {
      setError(result.detail || "Unable to save playbook.");
      return;
    }

    setName("");
    setNote("");
    setNotice("Execution playbook saved.");
  };

  const handleDelete = async (playbookId: string) => {
    const result = await deleteExecutionPlaybook(playbookId);
    setPlaybooks(result.data);
  };

  return (
    <section className="card-elevated rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="section-title text-base flex items-center gap-2">
          <BookOpenCheck size={16} />
          Execution Playbooks
        </h3>
        <span className="text-xs rounded-full px-2 py-0.5 badge-neutral">
          {playbooks.length} templates
        </span>
      </div>

      <p className="text-xs muted">
        Save reusable order templates with sizing, slippage, and risk defaults. Apply any playbook directly to the order ticket.
      </p>

      {(notice || error) && (
        <div
          className={`rounded-lg px-3 py-2 text-xs ${
            error
              ? "border border-red-300/55 bg-red-500/10 text-red-600 dark:text-red-300"
              : "border border-emerald-300/55 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          }`}
        >
          {error || notice}
        </div>
      )}

      <form onSubmit={handleCreate} className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2">
        <label className="text-xs space-y-1 sm:col-span-2">
          <div className="muted">Playbook Name</div>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Volatility Breakout Setup"
            className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
            required
          />
        </label>

        <label className="text-xs space-y-1">
          <div className="muted">Side</div>
          <select
            value={side}
            onChange={(event) => setSide(event.target.value as "buy" | "sell")}
            className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
          >
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
        </label>

        <label className="text-xs space-y-1">
          <div className="muted">Order Type</div>
          <select
            value={orderType}
            onChange={(event) => setOrderType(event.target.value as "market" | "limit")}
            className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
          >
            <option value="market">Market</option>
            <option value="limit">Limit</option>
          </select>
        </label>

        <label className="text-xs space-y-1">
          <div className="muted">Quantity</div>
          <input
            type="number"
            min={1}
            step={1}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
          />
        </label>

        <label className="text-xs space-y-1">
          <div className="muted">Slippage (bps)</div>
          <input
            type="number"
            min={0}
            step={1}
            value={slippage}
            onChange={(event) => setSlippage(event.target.value)}
            className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
          />
        </label>

        <label className="text-xs space-y-1">
          <div className="muted">Stop Distance %</div>
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={stopDistance}
            onChange={(event) => setStopDistance(event.target.value)}
            className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
          />
        </label>

        <label className="text-xs space-y-1">
          <div className="muted">Take Profit %</div>
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={takeProfit}
            onChange={(event) => setTakeProfit(event.target.value)}
            className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
          />
        </label>

        <label className="text-xs space-y-1 sm:col-span-2 xl:col-span-4">
          <div className="muted">Playbook Note</div>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="When this setup is valid and when to avoid it"
            className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
          />
        </label>

        <label className="text-xs space-y-1">
          <div className="muted">Risk / Trade %</div>
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={riskPct}
            onChange={(event) => setRiskPct(event.target.value)}
            className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
          />
        </label>

        <button
          type="submit"
          className="sm:col-span-2 xl:col-span-3 inline-flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white px-3 py-2 text-sm font-semibold"
        >
          <Plus size={13} />
          Save Playbook
        </button>
      </form>

      <div className="space-y-2">
        {playbooks.map((playbook) => (
          <div
            key={playbook.id}
            className="rounded-lg control-surface bg-white/75 dark:bg-black/25 px-3 py-2"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="text-sm font-semibold">{playbook.name}</div>
                <div className="text-xs muted">
                  {playbook.side.toUpperCase()} • {playbook.orderType.toUpperCase()} • Qty {playbook.quantity} • Stop{" "}
                  {playbook.stopDistancePct.toFixed(1)}% • TP {playbook.takeProfitPct.toFixed(1)}%
                </div>
              </div>
              <div className="inline-flex items-center gap-1">
                <button
                  onClick={() => onApply(playbook)}
                  className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-2)] text-white px-2.5 py-1 text-[11px] font-semibold"
                >
                  <WandSparkles size={11} />
                  Apply
                </button>
                <button
                  onClick={() => handleDelete(playbook.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-400/45 bg-red-500/10 text-red-600 dark:text-red-300 px-2.5 py-1 text-[11px]"
                >
                  <Trash2 size={11} />
                  Delete
                </button>
              </div>
            </div>
            {playbook.note && <div className="text-xs muted mt-1">{playbook.note}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}
