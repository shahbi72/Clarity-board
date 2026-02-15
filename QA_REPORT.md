# QA Report
Date: 2026-02-15
Scope: Upload + parse + preview + dashboard pipeline for CSV/XLSX ingestion.

## Test Matrix
| Area | Scenario | Dataset / Size | Expected | Result |
|---|---|---|---|---|
| Unit parser | Header parsing, no-header fallback, delimiter detection, quoting/newlines | Synthetic + fixtures | Correct `txs` + metadata | Pass |
| Unit parser | International amounts (`EUR/GBP/JPY/INR`, symbol + ISO code) | Inline parser cases | Amount parsing succeeds | Pass |
| Unit parser | Large matrix normalization and stability | 50,000-row generated matrix | Stable parse metadata, no skips | Pass |
| Unit upload UI | Idle/error/success message helpers + warning helpers | Component tests | Correct status copy and thresholds | Pass |
| E2E upload | Small CSV happy path | `ecommerce-small-200.csv` (202 lines, 28,491 bytes) | Preview/table/KPIs update | Pass |
| E2E upload | Medium CSV performance UX | `ecommerce-medium-20000.csv` (20,190 lines, 2,840,260 bytes) | Progress shown, success, no freeze | Pass |
| E2E upload | Delimiter support | Semicolon + tab fixtures | Successful parse/render | Pass |
| E2E upload | Global currency CSV | `ecommerce-currency-codes.csv` (6 lines) | Parsed + dashboard count update | Pass |
| E2E upload | Oversize guardrail | `ecommerce-large-200000.csv` (201,940 lines, 28,412,360 bytes) | Non-blocking error state | Pass |
| E2E upload | Invalid CSV resilience | `ecommerce-invalid.csv` (4 lines) | Clean error + empty states | Pass |

Validation runs:
- `pnpm test`: 23/23 passed
- `pnpm test:e2e`: 7/7 passed

## Bugs Found And Fixes
| ID | Severity | Issue | Fix Applied |
|---|---|---|---|
| QA-001 | High | Amounts with ISO currency codes were skipped (e.g., `USD 1,250.00`) | Parser now normalizes ISO currency codes and currency symbols before numeric parsing. Added parser + E2E regressions. |
| QA-002 | Medium | E2E upload tests were flaky due to unstable readiness checks | Replaced brittle waits with deterministic upload-control readiness assertions. |
| QA-003 | Medium | E2E could run against stale build artifacts | Playwright server now builds before start to ensure current code is tested. |
| QA-004 | Low | Upload feedback too verbose / unclear for row outcomes | Added concise import line: `Imported {validRows} rows (skipped {skippedRows})`. |
| QA-005 | Low | Ambiguous date formats had no explicit user signal | Added non-blocking warning banner for high ambiguity ratio. |
| QA-006 | Low | Large-file parse wait lacked expectation-setting UX | Added non-blocking large-file hint for `>10MB` or `>50k` rows. |

## Risks And Mitigations
| Risk | Current Impact | Mitigation |
|---|---|---|
| 25MB hard upload cap vs enterprise 1M-row expectation | High | Add server-side ingestion with chunking/streaming and async job processing for large datasets. |
| Main-thread client parsing for large files | Medium | Move parsing to Web Worker (short-term) and/or backend parse pipeline (long-term). |
| DD/MM vs MM/DD ambiguity can still misclassify some dates | Medium | Add import-level date format override and sample preview confirmation before finalizing. |
| Tooling warning (`baseline-browser-mapping` stale) | Low | Update dependency in CI/toolchain maintenance cycle. |

## Readiness Score
**82 / 100**

Rationale:
- Strong functional coverage and stable E2E behavior for small/medium datasets.
- Global currency parsing and key UX warnings are now in place.
- Primary gap is enterprise-scale ingestion architecture (1M-row class workloads).
