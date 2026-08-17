"use client";

import { useState } from "react";
import { MonthlyRecap } from "@/lib/types";
import StampBadge from "./StampBadge";

export default function MonthlyRecapPanel({ recaps }: { recaps: MonthlyRecap[] }) {
  const [active, setActive] = useState(0);
  if (recaps.length === 0) return null;
  const recap = recaps[active];

  return (
    <div className="ticket p-5 sm:p-6 fade-up">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-content-300/50">
          Recap Bulanan
        </p>
        <div className="flex gap-2">
          {recaps.map((r, i) => (
            <button
              key={r.monthKey}
              onClick={() => setActive(i)}
              className={`font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-sm border transition-colors ${
                i === active
                  ? "border-accent text-accent bg-accent/10"
                  : "border-surface-600 text-content-300/50 hover:text-content-100 hover:border-surface-500"
              }`}
            >
              {r.monthLabel}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto scroll-hint">
        <table className="w-full text-[13.5px] min-w-[480px]">
        <thead>
          <tr className="text-content-300/40 font-mono text-[10px] uppercase tracking-wider border-b border-surface-600">
            <th className="text-left font-medium pb-2">Status</th>
            <th className="text-right font-medium pb-2">Order</th>
            <th className="text-right font-medium pb-2">Total (RM)</th>
            <th className="text-right font-medium pb-2">Purata RM/Order</th>
            <th className="text-right font-medium pb-2">% Dari Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {recap.rows.map((row) => (
            <tr key={row.status} className="border-b border-surface-700/60 last:border-0">
              <td className="py-2.5">
                <StampBadge status={row.status} />
              </td>
              <td className="py-2.5 text-right font-mono text-content-300/70">{row.count}</td>
              <td className="py-2.5 text-right font-mono text-content-100/90">
                {row.totalAmount.toLocaleString()}
              </td>
              <td className="py-2.5 text-right font-mono text-content-300/70">
                {row.avgPerOrder.toLocaleString()}
              </td>
              <td className="py-2.5 text-right font-mono text-accent">{row.pctOfMonthOrders}%</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="ticket-tear">
            <td className="pt-3 font-mono text-[11px] text-content-300/45 uppercase">
              Jumlah — {recap.totalOrders} order
            </td>
            <td colSpan={3}></td>
            <td className="pt-3 text-right font-display font-bold text-lg text-content-100">
              RM {recap.totalSales.toLocaleString()}
            </td>
          </tr>
        </tfoot>
        </table>
      </div>
    </div>
  );
}
