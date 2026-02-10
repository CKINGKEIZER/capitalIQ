import { describe, it, expect } from "vitest";
import {
  escapeCell,
  parseNames,
  buildRows,
  serializeCsv,
  generateCsvFromText,
} from "../lib/csv";

describe("escapeCell", () => {
  it("returns plain text unchanged", () => {
    expect(escapeCell("Apple Inc.")).toBe("Apple Inc.");
  });

  it("wraps formulas in double quotes", () => {
    expect(escapeCell('=CIQ(A2;"IQ_TOTAL_REV";IQ_FY)')).toBe(
      '"=CIQ(A2;""IQ_TOTAL_REV"";IQ_FY)"',
    );
  });

  it("wraps formulas with comma separator in double quotes", () => {
    expect(escapeCell('=CIQ(A2,"IQ_TOTAL_REV",IQ_FY)')).toBe(
      '"=CIQ(A2,""IQ_TOTAL_REV"",IQ_FY)"',
    );
  });

  it("wraps values containing semicolons", () => {
    expect(escapeCell("hello;world")).toBe('"hello;world"');
  });

  it("doubles internal double quotes", () => {
    expect(escapeCell('She said "hello"')).toBe('"She said ""hello"""');
  });

  it("wraps values containing newlines", () => {
    expect(escapeCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("handles formula with no semicolons inside (comma sep, ticker)", () => {
    // Comma-separated formula still starts with = so should be quoted
    expect(escapeCell('=CIQ(A2,"IQ_COMPANY_TICKER")')).toBe(
      '"=CIQ(A2,""IQ_COMPANY_TICKER"")"',
    );
  });
});

describe("parseNames", () => {
  it("splits lines and trims whitespace", () => {
    expect(parseNames("  Apple Inc. \n  Microsoft  \n", false)).toEqual([
      "Apple Inc.",
      "Microsoft",
    ]);
  });

  it("removes empty lines", () => {
    expect(parseNames("Apple\n\n\nMicrosoft\n\n", false)).toEqual([
      "Apple",
      "Microsoft",
    ]);
  });

  it("does not deduplicate by default", () => {
    expect(parseNames("Apple\nApple\napple", false)).toEqual([
      "Apple",
      "Apple",
      "apple",
    ]);
  });

  it("deduplicates case-insensitively when enabled", () => {
    expect(parseNames("Apple\nApple\napple", true)).toEqual(["Apple"]);
  });

  it("handles CRLF line endings", () => {
    expect(parseNames("A\r\nB\r\nC", false)).toEqual(["A", "B", "C"]);
  });
});

describe("buildRows", () => {
  it("builds rows with correct Excel row numbers", () => {
    const rows = buildRows(["Apple", "Microsoft"], "IQ_FY", ";");
    expect(rows).toHaveLength(2);
    expect(rows[0].companyname).toBe("Apple");
    // Row 2 in Excel (header is row 1)
    expect(rows[0].capital_iq_ticker).toBe('=CIQ(A2;"IQ_COMPANY_TICKER")');
    expect(rows[0].revenue_latest).toBe('=CIQ(A2;"IQ_TOTAL_REV";IQ_FY)');
    // Row 3
    expect(rows[1].ebit_latest).toBe('=CIQ(A3;"IQ_EBIT";IQ_FY)');
  });
});

describe("serializeCsv", () => {
  it("produces correct header line", () => {
    const csv = serializeCsv([]);
    expect(csv).toBe(
      "companyname;capital_iq_ticker;revenue_latest;ebit_latest;ebitda_latest",
    );
  });

  it("produces correctly escaped semicolon-delimited rows", () => {
    const rows = buildRows(["Apple Inc."], "IQ_FY", ";");
    const csv = serializeCsv(rows);
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(2);

    // Data line: company name is plain, formulas are quoted
    const cells = parseCSVLine(lines[1], ";");
    expect(cells).toHaveLength(5);
    expect(cells[0]).toBe("Apple Inc.");
    // The ticker formula should be intact as a single cell
    expect(cells[1]).toBe('=CIQ(A2;"IQ_COMPANY_TICKER")');
  });
});

describe("generateCsvFromText (full pipeline)", () => {
  it("generates a complete CSV from text input", () => {
    const csv = generateCsvFromText(
      "Apple\nMicrosoft\nAlphabet",
      "IQ_FY",
      ";",
      false,
    );
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(4); // header + 3 data rows
    expect(lines[0]).toBe(
      "companyname;capital_iq_ticker;revenue_latest;ebit_latest;ebitda_latest",
    );
  });

  it("deduplicates when enabled", () => {
    const csv = generateCsvFromText(
      "Apple\nApple\napple",
      "IQ_FY",
      ",",
      true,
    );
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(2); // header + 1 row
  });

  it("handles comma separator correctly in output", () => {
    const csv = generateCsvFromText("Test Corp", "IQ_FY", ",", false);
    const lines = csv.split("\r\n");
    const dataCells = parseCSVLine(lines[1], ";");
    // With comma separator, formulas use commas
    expect(dataCells[1]).toBe('=CIQ(A2,"IQ_COMPANY_TICKER")');
    expect(dataCells[2]).toBe('=CIQ(A2,"IQ_TOTAL_REV",IQ_FY)');
  });

  it("handles 200 company names", () => {
    const names = Array.from({ length: 200 }, (_, i) => `Company ${i + 1}`);
    const csv = generateCsvFromText(names.join("\n"), "IQ_FY", ";", false);
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(201); // header + 200 rows
  });
});

/**
 * Helper: parse a semicolon-delimited CSV line respecting quoted fields.
 * This is intentionally simple and only handles the output format of our generator.
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        current += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === delimiter) {
        result.push(current);
        current = "";
        i++;
      } else {
        current += ch;
        i++;
      }
    }
  }
  result.push(current);
  return result;
}
