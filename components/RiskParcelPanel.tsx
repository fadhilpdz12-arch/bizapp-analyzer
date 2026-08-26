"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RiskParcel } from "@/lib/types";
import {
  RiskRecord,
  RiskStatus,
  RISK_STATUSES,
  blankRisk,
  loadRisk,
  saveRisk,
  riskKey,
  summariseRisk,
} from "@/lib/riskFollowup";
import { waLink } from "@/lib/winback";
import { sfxSuccess, sfxSave } from "@/lib/sfx";
import { recordActivity } from "@/lib/engagement";
import CountUp from "./CountUp";

const STATUS_STYLE: Record<RiskStatus, string> = {
  "Belum Hubungi": "text-content-300 border-surface-500 bg-surface-700",
  "Dah Hubungi — Akan Terima": "text-stamp-amber border-stamp-amber/40 bg-stamp-amber/10",
  "Minta Hantar Semula": "text-stamp-amber border-stamp-amber/40 bg-stamp-amber/10",
  "Tak Dapat Dihubungi": "text-stamp-red border-stamp-red/40 bg-stamp-red/10",
  "Selamat — Sampai": "text-stamp-green border-stamp-green/40 bg-stamp-green/10",
};

function rm(n: number) {
  return `RM ${Math.round(n).toLocaleString()}`;
}

/** A parcel that has stalled needs a nudge, not a sales pitch. */
function message(p: RiskParcel): string {
  return (
    `Salam ${p.customerName || "puan/tuan"}, saya dari Meldoria. ` +
    `Parcel ${p.product || "pesanan anda"} (${p.trackingNo}) nampak tersangkut ` +
    `${p.daysStalled} hari di pihak kurier. ` +
    `Boleh saya bantu semak, atau nak saya minta rider hantar semula?`
  );
}

export default function RiskParcelPanel({
  parcels,
  thresholdDays,
}: {
  parcels: RiskParcel[];
  thresholdDays: number;
}) {
  const [map, setMap] = useState<Record<string, RiskRecord>>({});
  const [ready, setReady] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<RiskStatus | "semua">("semua");

  useEffect(() => {
    setMap(loadRisk());
    setReady(true);
  }, []);

  const summary = useMemo(() => summariseRisk(parcels, map), [parcels, map]);

  const visible = useMemo(() => {
    const list =
      filter === "semua"
        ? parcels
        : parcels.filter(
            (p) => (map[riskKey(p.trackingNo)]?.status ?? "Belum Hubungi") === filter
          );
    // Untouched parcels first — that's the work still to do.
    return [...list].sort((a, b) => {
      const sa = map[riskKey(a.trackingNo)]?.status ?? "Belum Hubungi";
      const sb = map[riskKey(b.trackingNo)]?.status ?? "Belum Hubungi";
      const rank = (s: string) => (s === "Belum Hubungi" ? 0 : s === "Selamat — Sampai" ? 2 : 1);
      return rank(sa) - rank(sb) || b.amount - a.amount;
    });
  }, [parcels, map, filter]);

  const shown = showAll ? visible : visible.slice(0, 12);

  const update = useCallback((p: RiskParcel, patch: Partial<RiskRecord>) => {
    const k = riskKey(p.trackingNo);
    setMap((prev) => {
      const base = prev[k] ?? blankRisk();
      const next = {
        ...prev,
        [k]: { ...base, ...patch, updatedAt: new Date().toISOString() },
      };
      if (!saveRisk(next)) return prev;

      if (patch.status === "Selamat — Sampai" && base.status !== "Selamat — Sampai") {
        sfxSuccess();
      } else if (patch.status) {
        sfxSave();
      }
      if (patch.status) recordActivity(0);
      return next;
    });
  }, []);

  if (!ready) {
    return (
      <div className="ticket p-6">
        <p className="text-content-300 text-[13px]">Memuatkan…</p>
      </div>
    );
  }

  if (parcels.length === 0) {
    return (
      <div className="ticket p-5 sm:p-6 fade-up">
        <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-content-300/50">
          Parcel Berisiko — Perlu Tindakan
        </p>
        <p className="text-stamp-green text-[13.5px] mt-3">
          Tiada parcel tersangkut. Semua pending masih dalam tempoh normal.
        </p>
      </div>
    );
  }

  return (
    <div className="ticket p-5 sm:p-6 fade-up">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-content-300/50">
            Parcel Berisiko — Perlu Tindakan
          </p>
          <p className="text-[12.5px] text-content-300/70 mt-1.5 max-w-md leading-relaxed">
            Parcel PENDING yang tiada pergerakan melebihi {thresholdDays} hari. Hubungi
            customer sebelum ia auto-return.
          </p>
        </div>
        <div className="text-right">
          <p className="font-display font-extrabold text-3xl text-stamp-amber leading-none">
            <CountUp value={summary.pending} />
          </p>
          <p className="font-mono text-[10.5px] text-content-300/60 mt-1">
            belum dihubungi · {rm(summary.pendingValue)}
          </p>
        </div>
      </div>

      {/* Progress across the queue */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-surface-600">
        <Stat label="Jumlah" value={summary.total} />
        <Stat label="Dah Dihubungi" value={summary.contacted} tone="amber" />
        <Stat label="Selamat Sampai" value={summary.saved} tone="green" sub={rm(summary.savedValue)} />
        <Stat label="Tak Dapat Dihubungi" value={summary.unreachable} tone="red" />
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {(["semua", ...RISK_STATUSES] as const).map((s) => {
          const count =
            s === "semua"
              ? parcels.length
              : parcels.filter(
                  (p) => (map[riskKey(p.trackingNo)]?.status ?? "Belum Hubungi") === s
                ).length;
          if (s !== "semua" && count === 0) return null;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`font-mono text-[10.5px] uppercase tracking-wider px-2.5 py-1.5 rounded-lg border transition-colors ${
                filter === s
                  ? "border-accent text-accent-ink bg-accent-wash"
                  : "border-surface-600 text-content-300 hover:bg-surface-700"
              }`}
            >
              {s === "semua" ? "Semua" : s} ({count})
            </button>
          );
        })}
      </div>

      <div className="space-y-2 mt-4">
        {shown.map((p) => {
          const k = riskKey(p.trackingNo);
          const rec = map[k] ?? blankRisk();
          const isOpen = open === k;
          const link = waLink(p.phone, message(p));

          return (
            <div key={k} className="border border-surface-600 rounded-xl overflow-hidden">
              <div className="px-3.5 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <span
                    className={`font-mono text-[9px] uppercase tracking-wider border rounded-full px-1.5 py-1 whitespace-nowrap shrink-0 ${
                      p.severity === "kritikal"
                        ? "text-stamp-red border-stamp-red/40 bg-stamp-red/10"
                        : "text-stamp-amber border-stamp-amber/40 bg-stamp-amber/10"
                    }`}
                  >
                    {p.daysStalled}h
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13.5px] font-medium text-content-100">
                        {p.customerName}
                      </span>
                      <span
                        className={`font-mono text-[9px] uppercase tracking-wider border rounded-full px-1.5 py-0.5 ${STATUS_STYLE[rec.status]}`}
                      >
                        {rec.status}
                      </span>
                    </div>
                    <p className="text-[12px] text-content-300/80 mt-0.5">
                      {p.product} · {p.courierProvider}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pl-9 sm:pl-0">
                  <p className="font-mono text-[13.5px] font-semibold text-content-100 shrink-0">
                    {rm(p.amount)}
                  </p>
                  <div className="flex gap-1.5 shrink-0">
                    {link && (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          update(p, {
                            status: "Dah Hubungi — Akan Terima",
                            contactedAt: new Date().toISOString().slice(0, 10),
                          })
                        }
                        className="flex items-center bg-stamp-green/10 text-stamp-green border border-stamp-green/40 rounded-lg px-3 py-2 min-h-[36px] text-[12px] font-medium hover:bg-stamp-green/20 transition-colors"
                      >
                        WhatsApp
                      </a>
                    )}
                    <button
                      onClick={() => setOpen(isOpen ? null : k)}
                      className="btn-soft px-2.5"
                      aria-label="Butiran parcel"
                    >
                      {isOpen ? "▲" : "▼"}
                    </button>
                  </div>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-surface-600 bg-surface-950/40 px-3.5 py-4 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
                    <Meta label="Telefon" value={p.phone} mono />
                    <Meta label="Tracking" value={p.trackingNo} mono />
                    <Meta label="Ejen" value={p.agent || "—"} />
                    <Meta label="Kawasan" value={p.region || "—"} />
                  </div>

                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-wider text-content-300/50">
                      Imbasan terakhir
                    </p>
                    <p className="text-[12.5px] text-content-100/85 mt-0.5">
                      {p.lastScanLabel || "Tiada maklumat"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => update(p, { status: "Selamat — Sampai" })}
                      className="btn-soft text-stamp-green border-stamp-green/40 hover:bg-stamp-green/10"
                    >
                      ✓ Selamat — Sampai
                    </button>
                    <button
                      onClick={() => update(p, { status: "Minta Hantar Semula" })}
                      className="btn-soft"
                    >
                      Minta Hantar Semula
                    </button>
                    <button
                      onClick={() => update(p, { status: "Tak Dapat Dihubungi" })}
                      className="btn-soft"
                    >
                      Tak Dapat Dihubungi
                    </button>
                    <button
                      onClick={() => update(p, { status: "Belum Hubungi" })}
                      className="btn-soft"
                    >
                      Reset
                    </button>
                  </div>

                  <label className="block">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-content-300/50">
                      Catatan
                    </span>
                    <input
                      value={rec.note ?? ""}
                      onChange={(e) => update(p, { note: e.target.value })}
                      placeholder="Contoh: customer minta hantar hujung minggu"
                      className="input mt-1"
                    />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {visible.length > 12 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="btn-soft mt-3"
        >
          {showAll ? "Tunjuk kurang" : `Tunjuk semua ${visible.length} parcel`}
        </button>
      )}

      <p className="text-content-300/60 text-[11.5px] mt-4 leading-relaxed">
        Status disimpan dalam browser komputer ini. Menekan WhatsApp akan menandakan parcel
        sebagai sudah dihubungi secara automatik.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone = "ink",
}: {
  label: string;
  value: number;
  sub?: string;
  tone?: "ink" | "amber" | "green" | "red";
}) {
  const colour =
    tone === "amber" ? "text-stamp-amber"
    : tone === "green" ? "text-stamp-green"
    : tone === "red" ? "text-stamp-red"
    : "text-content-100";
  return (
    <div className="border border-surface-600 rounded-lg px-3 py-2.5">
      <p className="font-mono text-[9px] uppercase tracking-wider text-content-300/60">
        {label}
      </p>
      <p className={`font-display font-extrabold text-[1.3rem] leading-none mt-1 ${colour}`}>
        {value}
      </p>
      {sub && <p className="text-[10.5px] text-content-300/60 mt-1">{sub}</p>}
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-wider text-content-300/50">{label}</p>
      <p className={`mt-0.5 text-content-100/90 ${mono ? "font-mono text-[11.5px]" : "text-[12.5px]"}`}>
        {value}
      </p>
    </div>
  );
}
