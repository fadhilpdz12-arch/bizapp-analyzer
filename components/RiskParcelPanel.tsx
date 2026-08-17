"use client";

import { useState } from "react";
import { RiskParcel } from "@/lib/types";

export default function RiskParcelPanel({
  parcels,
  thresholdDays,
}: {
  parcels: RiskParcel[];
  thresholdDays: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? parcels : parcels.slice(0, 12);
  const totalValue = parcels.reduce((s, p) => s + p.amount, 0);
  const critical = parcels.filter((p) => p.severity === "kritikal").length;

  return (
    <div className="ticket p-5 sm:p-6 fade-up">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
        <div>
          <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-content-300/50">
            Parcel Berisiko — Perlu Tindakan
          </p>
          <p className="text-[12.5px] text-content-300/50 mt-1.5 max-w-md leading-relaxed">
            Parcel PENDING yang tiada pergerakan melebihi {thresholdDays} hari. Call customer
            sebelum ia auto-return.
          </p>
        </div>
        <div className="text-right">
          <p className="font-display font-extrabold text-3xl text-stamp-amber leading-none">
            {parcels.length}
          </p>
          <p className="font-mono text-[10.5px] text-content-300/45 mt-1">
            RM {Math.round(totalValue).toLocaleString()} berisiko
          </p>
        </div>
      </div>

      {critical > 0 && (
        <div className="mt-3 mb-4 border border-stamp-red/35 bg-stamp-red/10 px-3.5 py-2.5 rounded-sm">
          <p className="font-mono text-[11.5px] text-stamp-red">
            {critical} parcel tahap kritikal — hampir pasti jadi return kalau tiada tindakan.
          </p>
        </div>
      )}

      {parcels.length === 0 ? (
        <p className="text-[13.5px] text-stamp-green mt-4">
          Tiada parcel tersangkut. Semua pending masih dalam tempoh normal.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto scroll-hint mt-4">
            <table className="w-full text-[12.5px] min-w-[620px]">
              <thead>
                <tr className="text-content-300/40 font-mono text-[9.5px] uppercase tracking-wider border-b border-surface-600">
                  <th className="text-left font-medium pb-2">Hari</th>
                  <th className="text-left font-medium pb-2">Pelanggan</th>
                  <th className="text-left font-medium pb-2">Telefon</th>
                  <th className="text-left font-medium pb-2">Tracking</th>
                  <th className="text-right font-medium pb-2">Nilai</th>
                  <th className="text-left font-medium pb-2">Kawasan</th>
                  <th className="text-left font-medium pb-2">Scan Akhir</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p, i) => (
                  <tr key={p.trackingNo + i} className="border-b border-surface-700/60 last:border-0">
                    <td className="py-2.5">
                      <span
                        className={`font-mono font-semibold ${
                          p.severity === "kritikal" ? "text-stamp-red" : "text-stamp-amber"
                        }`}
                      >
                        {p.daysStalled}h
                      </span>
                    </td>
                    <td className="py-2.5 text-content-100/90 truncate max-w-[150px]">{p.customerName}</td>
                    <td className="py-2.5">
                      <a
                        href={`https://wa.me/${p.phone.replace(/\D/g, "").replace(/^0/, "60")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-stamp-green hover:underline"
                      >
                        {p.phone || "—"}
                      </a>
                    </td>
                    <td className="py-2.5 font-mono text-content-300/55 text-[11.5px]">{p.trackingNo}</td>
                    <td className="py-2.5 text-right font-mono text-accent">{p.amount.toLocaleString()}</td>
                    <td className="py-2.5 text-content-300/55 truncate max-w-[130px]">{p.region}</td>
                    <td className="py-2.5 font-mono text-content-300/45">{p.lastScanLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {parcels.length > 12 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-4 font-mono text-[11px] uppercase tracking-wider text-accent hover:underline"
            >
              {showAll ? "Tunjuk kurang" : `Tunjuk semua ${parcels.length} parcel`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
