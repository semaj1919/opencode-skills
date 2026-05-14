---
name: google-sheets-ro
description: Read data from Google Sheets using a service account JSON key file. Use this skill whenever the agent needs to access, fetch, inspect, or extract data from a Google Spreadsheet — including reading an entire spreadsheet, a named sheet, a specific range, a single cell, or multiple ranges at once. Trigger this skill when the user mentions Google Sheets, spreadsheet data, cell values, sheet ranges, or anything involving reading from a Sheets URL or spreadsheet ID. Also trigger when the agent needs to pull structured tabular data from Google Drive that lives in Sheets format.
---

# Google Sheets Reader

Reads data from Google Sheets via the Sheets API v4 using a service account for auth.  
Script: `./scripts/read-sheet.mjs`  
Auth: JSON key file (service account) with scope `https://www.googleapis.com/auth/spreadsheets.readonly`

---

## Setup (one-time)

### 1. Install dependency
```bash
npm install googleapis
```

### 2. Place key file
Put the service account JSON key file at:
- Any path — then set `GCP_SERVICE_ACCOUNT_CREDENTIALS=/path/to/key.json`

### 3. Share the spreadsheet
In Google Sheets, share the spreadsheet with the service account's `client_email` (found in the JSON key file) as **Viewer**.

---

## Getting the Spreadsheet ID

Extract it from the spreadsheet URL:
```
https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit
```

---

## Actions

### `read_all` — Read the entire spreadsheet
Fetches every sheet in one batch request.

```bash
node ./scripts/read-sheet.mjs --spreadsheet <ID> --action read_all
```

Returns: `{ spreadsheetTitle, sheets: [{ title, range, data[][] }] }`

---

### `read_range` — Read a range (A1 notation)
```bash
node ./scripts/read-sheet.mjs --spreadsheet <ID> --action read_range --range "Sheet1!A1:D20"
# Or an entire sheet:
node ./scripts/read-sheet.mjs --spreadsheet <ID> --action read_range --range "Sheet1"
```

Returns: `{ range, data[][] }`

---

### `read_cell` — Read a single cell
```bash
node ./scripts/read-sheet.mjs --spreadsheet <ID> --action read_cell --range "Sheet1!B2"
```

Returns: `{ range, value }` — `value` is `null` if the cell is empty.

---

### `read_multi` — Read multiple ranges in one call
```bash
node ./scripts/read-sheet.mjs --spreadsheet <ID> --action read_multi --ranges "Sheet1!A:A,Sheet2!B1:C10"
```

Returns: `[{ range, data[][] }, ...]`

---

## Flags

| Flag | Description |
|---|---|
| `--spreadsheet <ID>` | Spreadsheet ID (required) |
| `--action <action>` | `read_all` \| `read_range` \| `read_cell` \| `read_multi` |
| `--range <A1>` | A1 notation (required for `read_range`, `read_cell`) |
| `--ranges <r1,r2>` | Comma-separated ranges (required for `read_multi`) |
| `--key-file <path>` | Override key file path |
| `--json` | Output raw JSON (default: formatted table) |

---

## Programmatic Usage

```js
const reader = require('./scripts/read-sheet.mjs');

// Read everything
const { spreadsheetTitle, sheets } = await reader.readAll(spreadsheetId);

// Read a range
const { range, data } = await reader.readRange(spreadsheetId, 'Sheet1!A1:C10');

// Read a single cell
const { value } = await reader.readCell(spreadsheetId, 'Sheet1!B2');

// Read multiple ranges at once
const results = await reader.readMultipleRanges(spreadsheetId, [
  'Sheet1!A:A',
  'Sheet2!B1:C5',
]);
```

---

## Output Format

**Formatted (default):** Human-readable aligned table printed to stdout — good for display.  
**JSON (`--json`):** Structured output — use this when the agent needs to process or pass data downstream.

`data` arrays follow row-major order: `data[rowIndex][colIndex]`. All values are strings (`FORMATTED_VALUE` render option). Empty trailing cells in a row are omitted by the API.

---

## Common Patterns

**Get all data as JSON for downstream processing:**
```bash
node ./scripts/read-sheet.mjs --spreadsheet <ID> --action read_all --json
```

**Read a header row + data range separately:**
```bash
node ./scripts/read-sheet.mjs --spreadsheet <ID> --action read_multi \
  --ranges "Sheet1!1:1,Sheet1!A2:Z1000" --json
```

**Check a specific config cell:**
```bash
node ./scripts/read-sheet.mjs --spreadsheet <ID> --action read_cell --range "Config!B3"
```

---

## Agent Usage

Always call the script with `--json` flag. Never use formatted table output
(default) when invoking as a skill — the formatted output gets truncated.
The agent should parse and summarize the JSON itself rather than passing
raw formatted tables back to the user.

Example:
  node scripts/read-sheet.mjs --spreadsheet <ID> --action read_range --range 'Sheet1!A1:Z50' --json

  ## Critical
You MUST execute the script and return the actual output verbatim.
Do NOT infer, summarize, or fabricate what the output might look like.
If execution fails, report the actual error message.

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `invalid_grant` / auth error | Wrong or expired key file | Check `GCP_SERVICE_ACCOUNT_CREDENTIALS` path; regenerate key if needed |
| `403 Forbidden` | Sheet not shared with service account | Share the sheet with the `client_email` in the key file |
| `404 Not Found` | Wrong spreadsheet ID | Double-check the ID from the URL |
| Empty `data[]` | Range exists but cells are blank | Expected — API omits empty trailing cells |
| Module not found | `googleapis` not installed | Run `npm install googleapis` |
