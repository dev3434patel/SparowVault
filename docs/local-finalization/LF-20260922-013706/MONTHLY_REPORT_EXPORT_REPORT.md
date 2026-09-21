# Monthly report / export

Prior R4 helpers (`reportEconomicMonth`, `accountMonthUnionFromDocuments`, `buildStatementExportBundle`) remain wired into statement review download.

This finalization run treats account-month CSV/JSON export as **PARTIAL_VERIFIED** pending fresh multi-PDF golden parse in `test:statements` / browser suite output under the run log.

Independent XLSX reader goldens: not newly expanded in this pass.
