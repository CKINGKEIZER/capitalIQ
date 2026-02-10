"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import Papa from "papaparse";
import type { PeriodMode, Separator } from "@/lib/formulas";
import {
  parseNames,
  buildRows,
  serializeCsv,
  downloadCsv,
  generateCsvFromNames,
  type CsvRow,
} from "@/lib/csv";

const PERIOD_OPTIONS: { value: PeriodMode; label: string }[] = [
  { value: "IQ_FY", label: "Latest FY (IQ_FY)" },
  { value: "IQ_FQ", label: "Latest FQ (IQ_FQ)" },
  { value: "LTM", label: "Latest LTM (default period)" },
];

const SEP_OPTIONS: { value: Separator; label: string }[] = [
  { value: ";", label: '; (semicolon — Belgian/EU locale)' },
  { value: ",", label: ", (comma — US/UK locale)" },
];

export default function Home() {
  const [text, setText] = useState("");
  const [periodMode, setPeriodMode] = useState<PeriodMode>("IQ_FY");
  const [separator, setSeparator] = useState<Separator>(";");
  const [deduplicate, setDeduplicate] = useState(false);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive names and rows from current text + settings
  const names = useMemo(
    () => parseNames(text, deduplicate),
    [text, deduplicate],
  );

  const rows = useMemo(
    () => buildRows(names, periodMode, separator),
    [names, periodMode, separator],
  );

  const csvString = useMemo(() => serializeCsv(rows), [rows]);

  const previewRows = useMemo(() => rows.slice(0, 20), [rows]);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploadWarning(null);

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result;
        if (typeof content !== "string") return;

        const result = Papa.parse<Record<string, string>>(content, {
          header: true,
          skipEmptyLines: true,
        });

        if (!result.data.length) {
          setUploadWarning("CSV file is empty or could not be parsed.");
          return;
        }

        const headers = result.meta.fields ?? [];
        // Case-insensitive search for "companyname"
        const matchedHeader = headers.find(
          (h) => h.toLowerCase().replace(/[\s_-]/g, "") === "companyname",
        );

        let columnKey: string;
        if (matchedHeader) {
          columnKey = matchedHeader;
        } else {
          columnKey = headers[0];
          setUploadWarning(
            `No "companyname" column found. Using first column "${columnKey}" instead.`,
          );
        }

        const extracted = result.data
          .map((row) => (row[columnKey] ?? "").trim())
          .filter((v) => v.length > 0);

        setText(extracted.join("\n"));
      };

      reader.readAsText(file);
      // Reset so re-uploading the same file triggers onChange
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [],
  );

  const handleDownload = useCallback(() => {
    downloadCsv(csvString, "capital_iq_output.csv");
  }, [csvString]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(csvString);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = csvString;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }, [csvString]);

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">Capital IQ CSV Generator</h1>
      <p className="text-gray-600 mb-6 text-sm">
        Generate semicolon-delimited CSV files with S&amp;P Capital IQ Pro
        Office Excel plug-in formulas. Open the output in Excel with the CapIQ
        add-in to auto-populate data.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left panel: Input */}
        <div className="space-y-4">
          <div>
            <label
              htmlFor="company-input"
              className="block text-sm font-medium mb-1"
            >
              Company names (one per line)
            </label>
            <textarea
              id="company-input"
              className="w-full h-64 border border-gray-300 rounded-md p-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
              placeholder={"Apple Inc.\nMicrosoft Corporation\nAlphabet Inc."}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          {/* CSV upload */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Or upload a CSV file
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-gray-300 file:text-sm file:font-medium file:bg-white file:text-gray-700 hover:file:bg-gray-50 file:cursor-pointer"
            />
            {uploadWarning && (
              <p className="mt-1 text-sm text-amber-600">{uploadWarning}</p>
            )}
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="period-mode"
                className="block text-sm font-medium mb-1"
              >
                Period mode
              </label>
              <select
                id="period-mode"
                value={periodMode}
                onChange={(e) => setPeriodMode(e.target.value as PeriodMode)}
                className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="separator"
                className="block text-sm font-medium mb-1"
              >
                Formula argument separator
              </label>
              <select
                id="separator"
                value={separator}
                onChange={(e) => setSeparator(e.target.value as Separator)}
                className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {SEP_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={deduplicate}
                onChange={(e) => setDeduplicate(e.target.checked)}
                className="rounded border-gray-300"
              />
              Deduplicate company names
            </label>
          </div>

          {/* Info note */}
          <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
            <strong>Note:</strong> For ambiguous names, use a unique identifier
            instead (ticker, ISIN, CIQ company ID). The &quot;Treat input as
            identifier&quot; option below changes nothing in the output formulas
            — it is a reminder that your input is already an identifier, not a
            display name.
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="rounded border-gray-300" />
            Treat input as identifier (ticker / ISIN / CIQ ID), not name
          </label>
        </div>

        {/* Right panel: Preview + actions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">
              Preview{" "}
              <span className="text-gray-500">
                ({names.length} row{names.length !== 1 ? "s" : ""}
                {rows.length > 20 ? ", showing first 20" : ""})
              </span>
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                disabled={rows.length === 0}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {copySuccess ? "Copied!" : "Copy CSV to clipboard"}
              </button>
              <button
                onClick={handleDownload}
                disabled={rows.length === 0}
                className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Download CSV
              </button>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="border border-dashed border-gray-300 rounded-md p-8 text-center text-gray-400 text-sm">
              Paste company names or upload a CSV to see a preview.
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-md">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">
                      companyname
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      capital_iq_ticker
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      revenue_latest
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      ebit_latest
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      ebitda_latest
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr
                      key={i}
                      className={
                        i % 2 === 0
                          ? "bg-white"
                          : "bg-gray-50"
                      }
                    >
                      <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-1.5 font-medium max-w-[180px] truncate">
                        {row.companyname}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-green-700 max-w-[200px] truncate">
                        {row.capital_iq_ticker}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-green-700 max-w-[220px] truncate">
                        {row.revenue_latest}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-green-700 max-w-[200px] truncate">
                        {row.ebit_latest}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-green-700 max-w-[220px] truncate">
                        {row.ebitda_latest}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Raw CSV preview */}
          {rows.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                Show raw CSV
              </summary>
              <pre className="mt-2 p-3 bg-gray-100 rounded-md overflow-x-auto whitespace-pre text-[11px] max-h-64 overflow-y-auto">
                {csvString}
              </pre>
            </details>
          )}
        </div>
      </div>
    </main>
  );
}
