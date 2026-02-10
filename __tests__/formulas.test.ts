import { describe, it, expect } from "vitest";
import {
  buildCiqFormula,
  periodArg,
  generateFormulas,
} from "../lib/formulas";

describe("buildCiqFormula", () => {
  it("builds a formula with period using semicolon separator", () => {
    expect(buildCiqFormula("A2", "IQ_TOTAL_REV", "IQ_FY", ";")).toBe(
      '=CIQ(A2;"IQ_TOTAL_REV";IQ_FY)',
    );
  });

  it("builds a formula with period using comma separator", () => {
    expect(buildCiqFormula("A2", "IQ_TOTAL_REV", "IQ_FY", ",")).toBe(
      '=CIQ(A2,"IQ_TOTAL_REV",IQ_FY)',
    );
  });

  it("builds a formula without period (LTM)", () => {
    expect(buildCiqFormula("A5", "IQ_EBITDA", null, ";")).toBe(
      '=CIQ(A5;"IQ_EBITDA")',
    );
  });

  it("builds ticker formula (no period) with comma separator", () => {
    expect(buildCiqFormula("A3", "IQ_COMPANY_TICKER", null, ",")).toBe(
      '=CIQ(A3,"IQ_COMPANY_TICKER")',
    );
  });
});

describe("periodArg", () => {
  it("returns IQ_FY for Latest FY", () => {
    expect(periodArg("IQ_FY")).toBe("IQ_FY");
  });

  it("returns IQ_FQ for Latest FQ", () => {
    expect(periodArg("IQ_FQ")).toBe("IQ_FQ");
  });

  it("returns null for LTM", () => {
    expect(periodArg("LTM")).toBeNull();
  });
});

describe("generateFormulas", () => {
  it("generates correct formulas for row 2 with IQ_FY and semicolon", () => {
    const result = generateFormulas(2, "IQ_FY", ";");
    expect(result.ticker).toBe('=CIQ(A2;"IQ_COMPANY_TICKER")');
    expect(result.revenue).toBe('=CIQ(A2;"IQ_TOTAL_REV";IQ_FY)');
    expect(result.ebit).toBe('=CIQ(A2;"IQ_EBIT";IQ_FY)');
    expect(result.ebitda).toBe('=CIQ(A2;"IQ_EBITDA";IQ_FY)');
  });

  it("generates correct formulas for row 5 with LTM and comma", () => {
    const result = generateFormulas(5, "LTM", ",");
    expect(result.ticker).toBe('=CIQ(A5,"IQ_COMPANY_TICKER")');
    expect(result.revenue).toBe('=CIQ(A5,"IQ_TOTAL_REV")');
    expect(result.ebit).toBe('=CIQ(A5,"IQ_EBIT")');
    expect(result.ebitda).toBe('=CIQ(A5,"IQ_EBITDA")');
  });

  it("generates FQ formulas correctly", () => {
    const result = generateFormulas(3, "IQ_FQ", ",");
    expect(result.revenue).toBe('=CIQ(A3,"IQ_TOTAL_REV",IQ_FQ)');
  });
});
