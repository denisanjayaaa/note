import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  Download,
  Plus,
  Trash2,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function CsvEditor() {
  const [data, setData] = useState<string[][]>([
    ["Name", "Job", "City"],
    ["Alice", "Developer", "Jakarta"],
    ["Bob", "Designer", "Bandung"],
    ["Charlie", "Manager", "Surabaya"],
  ]);
  const [pasteValue, setPasteValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const rows = text
        .split("\n")
        .map((r) =>
          r
            .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
            .map((c) => c.replace(/^"|"$/g, "").trim())
        )
        .filter((r) => r.length > 0 && r.some((c) => c));
      if (rows.length > 0) setData(rows);
    };
    reader.readAsText(file);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    if (!text) return;
    const rows = text
      .split(/\r?\n/)
      .map((r) => r.split("\t"))
      .filter((r) => r.length > 0 && r.some((c) => c));
    if (rows.length > 0) {
      setData(rows);
      setPasteValue("");
    }
  };

  const handleExport = () => {
    const csv = data
      .map((r) =>
        r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "workspace-data.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const addRow = () => {
    const cols = data[0]?.length || 3;
    setData([...data, Array(cols).fill("")]);
  };

  const addColumn = () => {
    setData(data.map((r) => [...r, ""]));
  };

  const updateCell = (row: number, col: number, value: string) => {
    const newData = data.map((r, ri) =>
      ri === row ? r.map((c, ci) => (ci === col ? value : c)) : r
    );
    setData(newData);
  };

  const deleteRow = (index: number) => {
    if (data.length <= 1) return;
    setData(data.filter((_, i) => i !== index));
  };

  const deleteColumn = (index: number) => {
    if (data[0]?.length <= 1) return;
    setData(data.map((r) => r.filter((_, ci) => ci !== index)));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-6xl space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <FileSpreadsheet size={24} className="text-emerald-600" />
            CSV Editor
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Import, paste, or edit tabular data
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5"
          >
            <Upload size={14} />
            Import
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            size="sm"
            onClick={handleExport}
            className="gap-1.5"
          >
            <Download size={14} />
            Export
          </Button>
        </div>
      </div>

      {/* Paste area */}
      <div className="rounded-lg border border-border bg-card p-4">
        <textarea
          value={pasteValue}
          onChange={(e) => setPasteValue(e.target.value)}
          onPaste={handlePaste}
          placeholder="Ctrl+V from Excel or Google Sheets..."
          rows={2}
          className="w-full resize-none rounded-md bg-muted/50 p-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={addRow}
          className="gap-1"
        >
          <Plus size={13} /> Row
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={addColumn}
          className="gap-1"
        >
          <Plus size={13} /> Column
        </Button>
      </div>

      {/* Data table */}
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="w-8 px-2 py-2"></th>
              {data[0]?.map((_, ci) => (
                <th key={ci} className="relative px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span className="truncate">Column {ci + 1}</span>
                    <button
                      onClick={() => deleteColumn(ci)}
                      className="shrink-0 rounded p-0.5 text-muted-foreground/40 hover:text-destructive"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, ri) => (
              <tr key={ri} className="border-b border-border last:border-b-0 hover:bg-accent/30">
                <td className="px-2 py-1.5">
                  <button
                    onClick={() => deleteRow(ri)}
                    className="rounded p-0.5 text-muted-foreground/40 hover:text-destructive"
                  >
                    <Trash2 size={11} />
                  </button>
                </td>
                {row.map((cell, ci) => (
                  <td key={ci} className="border-r border-border px-3 py-1.5 last:border-r-0">
                    <input
                      value={cell}
                      onChange={(e) => updateCell(ri, ci, e.target.value)}
                      className="w-full bg-transparent text-sm outline-none"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        {data.length} row{data.length !== 1 ? "s" : ""}
      </p>
    </motion.div>
  );
}
