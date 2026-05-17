---
name: reading-google-sheets
description: Use when the agent needs to access, fetch, inspect, or extract data from a Google Spreadsheet, or when the user mentions Google Sheets, spreadsheet data, cell values, sheet ranges, or anything involving reading from a Sheets URL or spreadsheet ID.
---

# Google Sheets Reader

Reads data from Google Sheets via the Sheets API v4 using a service account for auth.
**Script:** `./scripts/read-sheet.mjs`
**Auth:** JSON key file (service account) with scope `https://www.googleapis.com/auth/spreadsheets.readonly`

## When to Use
- To fetch tabular data from a Google Spreadsheet.
- To inspect sheet metadata (row/column counts, ranges).
- To list all available tabs in a workbook.
- To read specific cells or ranges (A1 notation).
- When the user provides a Google Sheets URL.

## Setup (one-time)
1. **Install dependency:** `npm install googleapis`
2. **Place key file:** Set `GCP_SERVICE_ACCOUNT_CREDENTIALS=/path/to/key.json`.
3. **Share spreadsheet:** Share with the service account's `client_email` as **Viewer**.

## Quick Reference

### Commands
| Action | Flags | Returns | Description |
|---|---|---|---|
| `describe_sheet` | `--range <A1>` | `{ title, rowCount, columnCount, dataRange }` | Get sheet metadata. |
| `list_sheets` | - | `{ spreadsheetTitle, sheets: [string] }` | List all tab names. |
| `read_all` | - | `{ spreadsheetTitle, sheets: [...] }` | Fetch entire spreadsheet. |
| `read_range` | `--range <A1>` | `{ range, data[][] }` | Read specific range. |
| `read_cell` | `--range <A1>` | `{ range, value }` | Read single cell. |
| `read_multi` | `--ranges <r1,r2>` | `[{ range, data[][] }, ...]` | Read multiple ranges. |

### Common Flags
- `--spreadsheet <ID>`: (Required) The Spreadsheet ID.
- `--json`: Output structured JSON (Recommended for agents).
- `--key-file <path>`: Override the default credentials path.

### Output Format
- **JSON (`--json`):** Use for downstream processing. `data` is row-major `data[row][col]`.
- **Table (Default):** Human-readable view.

## Implementation

```js
const reader = require('./scripts/read-sheet.mjs');

// List sheet names
const { sheets } = await reader.getSheetNames(spreadsheetId);

// Read a range
const { data } = await reader.readRange(spreadsheetId, 'Sheet1!A1:C10');

// Read multiple ranges
const results = await reader.readMultipleRanges(spreadsheetId, ['Sheet1!A:A', 'Sheet2!B1:C5']);
```

## Common Patterns

- **Discovery:** `list_sheets --json` $\rightarrow$ `describe_sheet --json` $\rightarrow$ `read_range --json`
- **Batching:** Use `read_multi` for multiple non-contiguous ranges in one call.
- **Config Retrieval:** Use `read_cell` for specific settings/constants.

## Common Mistakes

| Mistake | Fix |
|---|---|
| **Using formatted tables** | Use `--json`. Formatted output is often truncated. |
| **Missing discovery** | Call `list_sheets` and `describe_sheet` before reading data. |
| **Incorrect ID** | Verify the ID from the URL: `.../d/<ID>/edit` |
| **Permission denied (403)** | Share the sheet with the service account's `client_email`. |

## Critical
**You MUST execute the script and return the actual output verbatim.**
Do NOT infer, summarize, or fabricate output. If execution fails, report the error.
