import { useState } from "react";
import { formatCurrency } from "../../../shared/utils";

const LIME = "#c3f400";

export interface BulkRow {
  id: string;
  name: string;
  qty: number;
  unit: string;
  price: number;
}

interface BulkEntryTableProps {
  onCommit: (rows: BulkRow[]) => void;
  onCancel?: () => void;
}

const COMMON_UNITS = ["kg", "g", "L", "ml", "piece", "dozen", "packet"];

export default function BulkEntryTable({ onCommit, onCancel }: BulkEntryTableProps) {
  const [rows, setRows] = useState<BulkRow[]>([
    { id: "b-1", name: "", qty: 1, unit: "kg", price: 0 },
    { id: "b-2", name: "", qty: 1, unit: "piece", price: 0 },
    { id: "b-3", name: "", qty: 1, unit: "L", price: 0 },
  ]);
  const [pasteText, setPasteText] = useState("");
  const [showPasteBox, setShowPasteBox] = useState(false);

  const updateRow = (id: string, field: keyof BulkRow, value: any) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              [field]:
                field === "qty" || field === "price"
                  ? Math.max(0, parseFloat(value) || 0)
                  : value,
            }
          : r
      )
    );
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { id: `b-${Date.now()}-${Math.random()}`, name: "", qty: 1, unit: "kg", price: 0 },
    ]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };

  const handleParsePaste = () => {
    if (!pasteText.trim()) return;
    const lines = pasteText.split("\n");
    const parsedRows: BulkRow[] = [];

    for (const line of lines) {
      const clean = line.trim();
      if (!clean) continue;
      // Format: Name, Qty, Unit, Price OR tab-separated
      const parts = clean.includes("\t")
        ? clean.split("\t")
        : clean.includes(",")
        ? clean.split(",")
        : clean.split(/\s{2,}/);

      const name = parts[0]?.trim() || "Item";
      const qty = parseFloat(parts[1]?.trim() || "1") || 1;
      const unit = parts[2]?.trim() || "piece";
      const price = parseFloat(parts[3]?.trim() || "0") || 0;

      parsedRows.push({
        id: `p-${Date.now()}-${Math.random()}`,
        name,
        qty,
        unit,
        price,
      });
    }

    if (parsedRows.length > 0) {
      setRows(parsedRows);
      setPasteText("");
      setShowPasteBox(false);
    }
  };

  const totalAmount = rows.reduce((acc, r) => acc + (r.price || 0), 0);
  const validRows = rows.filter((r) => r.name.trim() && r.price > 0);

  const handleSubmit = () => {
    if (validRows.length === 0) {
      alert("Please specify at least one item with a name and price.");
      return;
    }
    onCommit(validRows);
  };

  return (
    <div
      className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl"
      style={{
        background: "rgba(24,28,14,0.85)",
        border: "1px solid rgba(195,244,0,0.25)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg" style={{ color: LIME }}>
              grid_on
            </span>
            <h3
              className="text-base font-black uppercase text-white tracking-wide"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Spreadsheet Bulk Entry
            </h3>
          </div>
          <p className="text-xs text-[#8e9379] mt-0.5 font-sans">
            Tabular high-velocity entry or paste rows directly from CSV/Sheets.
          </p>
        </div>

        <button
          onClick={() => setShowPasteBox(!showPasteBox)}
          className="px-3 py-1.5 rounded-xl border border-white/15 text-xs font-mono text-white/80 hover:bg-white/5 transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-sm">
            {showPasteBox ? "close" : "content_paste"}
          </span>
          {showPasteBox ? "Hide Paste Box" : "Paste CSV/TSV"}
        </button>
      </div>

      {showPasteBox && (
        <div className="mb-5 p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
          <label className="text-[10px] font-mono uppercase text-[#8e9379] block">
            Paste Lines (Format: Name, Qty, Unit, Price)
          </label>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Potato, 2, kg, 50&#10;Mustard Oil, 1, L, 160&#10;Bread, 1, piece, 35"
            rows={4}
            className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-lime-400"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={handleParsePaste}
              className="px-4 py-1.5 rounded-xl bg-lime-400 text-[#111508] font-mono text-xs font-bold hover:brightness-110"
            >
              Apply Rows
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 text-[10px] uppercase font-mono text-[#8e9379] border-b border-white/10">
              <th className="py-2.5 px-3 w-10">#</th>
              <th className="py-2.5 px-3">Item Name</th>
              <th className="py-2.5 px-3 w-24">Qty</th>
              <th className="py-2.5 px-3 w-28">Unit</th>
              <th className="py-2.5 px-3 w-32 text-right">Price (₹)</th>
              <th className="py-2.5 px-2 w-10 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((row, idx) => (
              <tr key={row.id} className="hover:bg-white/[0.02] transition">
                <td className="py-2 px-3 text-[10px] font-mono text-white/40">{idx + 1}</td>
                <td className="py-2 px-3">
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => updateRow(row.id, "name", e.target.value)}
                    placeholder="e.g. Potato"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-medium focus:border-lime-400 focus:outline-none"
                  />
                </td>
                <td className="py-2 px-3">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={row.qty || ""}
                    onChange={(e) => updateRow(row.id, "qty", e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-mono text-center focus:border-lime-400 focus:outline-none"
                  />
                </td>
                <td className="py-2 px-3">
                  <select
                    value={row.unit}
                    onChange={(e) => updateRow(row.id, "unit", e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-[#181c0e] border border-white/10 text-white text-xs font-mono focus:border-lime-400 focus:outline-none"
                  >
                    {COMMON_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 px-3 text-right">
                  <div className="relative inline-block w-full">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-lime-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={row.price || ""}
                      onChange={(e) => updateRow(row.id, "price", e.target.value)}
                      placeholder="0"
                      className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-lime-400/10 border border-lime-400/30 text-lime-400 text-xs font-mono font-bold text-right focus:border-lime-400 focus:outline-none"
                    />
                  </div>
                </td>
                <td className="py-2 px-2 text-center">
                  <button
                    onClick={() => removeRow(row.id)}
                    className="text-white/30 hover:text-red-400 transition"
                    title="Remove row"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Footer Controls */}
      <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-white/10">
        <button
          onClick={addRow}
          className="px-3.5 py-2 rounded-xl border border-dashed border-lime-400/40 text-lime-400 text-xs font-mono font-bold hover:bg-lime-400/5 transition flex items-center justify-center gap-1.5"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Add Row
        </button>

        <div className="flex items-center justify-between sm:justify-end gap-4">
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase text-[#8e9379] block">
              Total ({validRows.length} valid)
            </span>
            <span
              className="text-lg font-black"
              style={{ fontFamily: "'Syne', sans-serif", color: LIME }}
            >
              {formatCurrency(totalAmount)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-xl text-white/60 text-xs font-mono hover:text-white transition"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={validRows.length === 0}
              className="px-5 py-2.5 rounded-xl bg-lime-400 text-[#111508] text-xs font-bold uppercase tracking-wider font-mono hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Add {validRows.length} Items
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
