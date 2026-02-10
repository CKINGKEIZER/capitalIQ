export type PeriodMode = "IQ_FY" | "IQ_FQ" | "LTM";
export type Separator = ";" | ",";

/**
 * Build a CIQ formula string.
 *
 * @param cellRef   - The Excel cell reference for the company identifier, e.g. "A2"
 * @param mnemonic  - The Capital IQ mnemonic, e.g. "IQ_TOTAL_REV"
 * @param period    - The period mode; null means no period argument (LTM default)
 * @param sep       - The formula argument separator (";" for Belgian locale, "," for US)
 */
export function buildCiqFormula(
  cellRef: string,
  mnemonic: string,
  period: string | null,
  sep: Separator,
): string {
  if (period) {
    return `=CIQ(${cellRef}${sep}"${mnemonic}"${sep}${period})`;
  }
  return `=CIQ(${cellRef}${sep}"${mnemonic}")`;
}

/**
 * Return the period argument string for the CIQ formula based on mode.
 */
export function periodArg(mode: PeriodMode): string | null {
  switch (mode) {
    case "IQ_FY":
      return "IQ_FY";
    case "IQ_FQ":
      return "IQ_FQ";
    case "LTM":
      return null;
  }
}

export interface FormulaSet {
  ticker: string;
  revenue: string;
  ebit: string;
  ebitda: string;
}

/**
 * Generate the full set of CIQ formulas for a given row.
 *
 * @param rowIndex  - 1-based Excel row number (data starts at row 2)
 * @param mode      - Period mode selection
 * @param sep       - Formula argument separator
 */
export function generateFormulas(
  rowIndex: number,
  mode: PeriodMode,
  sep: Separator,
): FormulaSet {
  const cellRef = `A${rowIndex}`;
  const period = periodArg(mode);

  return {
    ticker: buildCiqFormula(cellRef, "IQ_COMPANY_TICKER", null, sep),
    revenue: buildCiqFormula(cellRef, "IQ_TOTAL_REV", period, sep),
    ebit: buildCiqFormula(cellRef, "IQ_EBIT", period, sep),
    ebitda: buildCiqFormula(cellRef, "IQ_EBITDA", period, sep),
  };
}
