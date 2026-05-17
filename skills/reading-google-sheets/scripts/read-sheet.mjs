#!/usr/bin/env node
/**
 * Google Sheets Reader — Agent Skill for opencode
 *
 * Authentication: Service Account JSON key file
 * Scopes: https://www.googleapis.com/auth/spreadsheets.readonly
 *
 * Usage (CLI):
 *   node read-sheet.js --spreadsheet <ID> --action read_all
 *   node read-sheet.js --spreadsheet <ID> --action read_range  --range "Sheet1!A1:C10"
 *   node read-sheet.js --spreadsheet <ID> --action read_cell   --range "Sheet1!B2"
 *
 * Usage (require/import):
 *   const reader = require('./read-sheet');
 *   await reader.readAll(spreadsheetId);
 *   await reader.readRange(spreadsheetId, 'Sheet1!A1:C10');
 *   await reader.readCell(spreadsheetId, 'Sheet1!B2');
 */

'use strict';

import {google} from 'googleapis';
import path from 'path';
import {fileURLToPath} from 'url';

// ─── Configuration ────────────────────────────────────────────────────────────

const KEY_FILE = process.env.GCP_SERVICE_ACCOUNT_CREDENTIALS;

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Returns an authenticated Google Sheets API client.
 */
async function getSheetsClient() {
    const auth = new google.auth.GoogleAuth({
        keyFile: KEY_FILE,
        scopes: SCOPES,
    });

    const authClient = await auth.getClient();
    return google.sheets({version: 'v4', auth: authClient});
}

// ─── Core Functions ───────────────────────────────────────────────────────────

/**
 * Read every sheet in the spreadsheet.
 * Returns { spreadsheetTitle, sheets: [{ title, data[][] }] }
 */
async function readAll(spreadsheetId) {
    const sheets = await getSheetsClient();

    // Fetch spreadsheet metadata to get all sheet names
    const meta = await sheets.spreadsheets.get({spreadsheetId});
    const spreadsheetTitle = meta.data.properties.title;
    const sheetNames = meta.data.sheets.map((s) => s.properties.title);

    // Batch-fetch all sheets in one request
    const ranges = sheetNames.map((name) => name);
    const res = await sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges,
    });

    const result = (res.data.valueRanges || []).map((vr, i) => ({
        title: sheetNames[i],
        range: vr.range,
        data: vr.values || [],
    }));

    return {spreadsheetTitle, sheets: result};
}

/**
 * Read a specific range (e.g. "Sheet1!A1:D20" or just "Sheet1").
 * Returns { range, data[][] }
 */
async function readRange(spreadsheetId, range) {
    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
        valueRenderOption: 'FORMATTED_VALUE', // human-readable strings
        dateTimeRenderOption: 'FORMATTED_STRING',
    });

    return {
        range: res.data.range,
        data: res.data.values || [],
    };
}

/**
 * Read a single cell (e.g. "Sheet1!B2").
 * Returns { range, value } — value is null if the cell is empty.
 */
async function readCell(spreadsheetId, cellRef) {
    const {range, data} = await readRange(spreadsheetId, cellRef);
    const value = data.length > 0 && data[0].length > 0 ? data[0][0] : null;
    return {range, value};
}

/**
 * Read multiple ranges in a single API call.
 * Returns [{ range, data[][] }]
 */
async function readMultipleRanges(spreadsheetId, ranges) {
    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges,
        valueRenderOption: 'FORMATTED_VALUE',
        dateTimeRenderOption: 'FORMATTED_STRING',
    });

    return (res.data.valueRanges || []).map((vr) => ({
        range: vr.range,
        data: vr.values || [],
    }));
}

/**
 * Get all sheet names in the spreadsheet.
 * Returns { spreadsheetTitle, sheets: [string] }
 */
async function getSheetNames(spreadsheetId) {
    const sheets = await getSheetsClient();

    const meta = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'properties.title,sheets.properties.title',
    });

    return {
        spreadsheetTitle: meta.data.properties.title,
        sheets: meta.data.sheets.map((s) => s.properties.title),
    };
}

/**
 * Describe the structure and content of a sheet.
 * @returns { sheet: string, empty: boolean, totalRows: number, totalColumns: number, dataStartRow: number, dataEndRow: number, dataStartCol: number, dataEndCol: number, actualDataRange: string, hasHeaderRow: boolean, columns: [{ index, header, nonEmptyCount, inferredType, sample[], actualStartRow: number, actualEndRow: number, actualColumnIndex: number }] }
 */
async function describeSheet(spreadsheetId, sheetName) {
    const {data} = await readRange(spreadsheetId, sheetName);

    if (!data.length) return {sheet: sheetName, empty: true};

    // Find the actual data boundaries in a single pass through all data
    let dataStartRow = Infinity;
    let dataEndRow = -1;
    let dataStartCol = Infinity;
    let dataEndCol = -1;
    let maxColumnIndex = -1;

    // Single pass to determine all boundaries
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (
            row.some(
                (cell) => cell !== undefined && cell !== null && cell !== '',
            )
        ) {
            // This row contains data
            dataStartRow = Math.min(dataStartRow, i);
            dataEndRow = Math.max(dataEndRow, i);

            // Check columns in this row for data
            for (let j = 0; j < row.length; j++) {
                if (row[j] !== undefined && row[j] !== null && row[j] !== '') {
                    dataStartCol = Math.min(dataStartCol, j);
                    dataEndCol = Math.max(dataEndCol, j);
                    maxColumnIndex = Math.max(maxColumnIndex, j);
                }
            }
        }
    }

    const totalColumns = maxColumnIndex + 1;
    const actualColumns = dataEndCol - dataStartCol + 1;

    // If no data found
    if (dataStartRow === Infinity) {
        return {
            sheet: sheetName,
            empty: true,
            totalRows: data.length,
            totalColumns: data[0] ? data[0].length : 0,
            dataStartRow: 0,
            dataEndRow: 0,
            dataStartCol: 0,
            dataEndCol: 0,
            columns: [],
            actualDataRange: `${sheetName}!A1:A1`,
            hasHeaderRow: false,
        };
    }

    // If we have a header row, treat it as such (but make it flexible)
    // We'll analyze the first row that has content to determine if it's a header or data
    let headers = [];
    let rowsData = [];

    // Determine if we have a header row by checking whether first meaningful row looks like headers
    let hasHeader = false;
    if (dataStartRow < dataEndRow) {
        const firstDataRow = data[dataStartRow];

        // Check if the first row of actual data seems like it could be headers
        // If most cells are non-numeric text values, treat as header row
        let textCells = 0;
        let totalCells = 0;

        for (
            let i = 0;
            i < Math.min(firstDataRow.length, dataStartRow + 10);
            i++
        ) {
            // Check first 10 cells to avoid noise
            const cell = firstDataRow[i];
            if (cell !== undefined && cell !== null && cell !== '') {
                totalCells++;
                // If it's not a number or looks like a date/time, treat as text
                if (
                    isNaN(cell) ||
                    cell.toString().includes('/') ||
                    cell.toString().includes('-')
                ) {
                    textCells++;
                }
            }
        }

        // If more than 60% of non-empty cells in first row are text-like, assume header
        if (totalCells > 0 && textCells / totalCells > 0.6) {
            hasHeader = true;
            headers = firstDataRow.map((cell) => cell || '');
            rowsData = data.slice(dataStartRow + 1, dataEndRow + 1);
        } else {
            // First row is data, so all rows are data
            headers = Array(actualColumns)
                .fill('')
                .map((_, i) => `(col ${i + 1})`);
            rowsData = data.slice(dataStartRow, dataEndRow + 1);
        }
    } else {
        // Only one row of data - treat as data
        headers = Array(actualColumns)
            .fill('')
            .map((_, i) => `(col ${i + 1})`);
        rowsData = data.slice(dataStartRow, dataEndRow + 1);
    }

    // Create column analysis based on actual data (not assuming first row is header)
    const columns = [];

    for (let i = 0; i < actualColumns; i++) {
        const colIndex = dataStartCol + i;
        const values = [];

        for (let j = 0; j < rowsData.length; j++) {
            const cellValue = rowsData[j][colIndex];
            if (
                cellValue !== undefined &&
                cellValue !== null &&
                cellValue !== ''
            ) {
                values.push(cellValue);
            }
        }

        // Infer type based on actual data in column
        let inferredType = 'text';
        if (values.length > 0) {
            const numeric = values.filter(
                (v) => !isNaN(v.toString().replace(/[$,%]/g, '')),
            );
            inferredType =
                numeric.length / values.length > 0.8 ? 'numeric' : 'text';
        }

        columns.push({
            index: i,
            header: headers[i] || `(col ${i + 1})`,
            nonEmptyCount: values.length,
            inferredType: inferredType,
            sample: values.slice(0, 3),
            actualStartRow: dataStartRow + (hasHeader ? 1 : 0) + 1,
            actualEndRow: dataEndRow + 1,
            actualColumnIndex: colIndex,
        });
    }

    return {
        sheet: sheetName,
        empty: false,
        totalRows: data.length,
        totalColumns: totalColumns,
        dataStartRow: dataStartRow + 1, // Convert to 1-based index
        dataEndRow: dataEndRow + 1, // Convert to 1-based index
        dataStartCol: dataStartCol + 1, // Convert to 1-based index
        dataEndCol: dataEndCol + 1, // Convert to 1-based index
        columns: columns,
        actualDataRange: `${sheetName}!${columnLetter(dataStartCol)}${dataStartRow + 1}:${columnLetter(dataEndCol)}${dataEndRow + 1}`,
        hasHeaderRow: hasHeader,
    };
}

// HELPERS
/**
 * Converts a column index to its corresponding letter(s) in A1 notation.
 * @param {number} n - The column index (0-based).
 * @returns {string} The column letter(s).
 */
function columnLetter(n) {
    const letters = [];
    let num = n + 1;
    while (num > 0) {
        const rem = (num - 1) % 26;
        letters.unshift(String.fromCharCode(65 + rem));
        num = Math.floor((num - rem - 1) / 26);
    }
    return letters.join('');
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

function printHelp() {
    console.log(`
Google Sheets Reader — Agent Skill
 
Options:
  --spreadsheet <ID>   Spreadsheet ID (required)
  --action <action>    read_all | read_range | read_cell | read_multi | list_sheets | describe_sheet
  --range <A1>         A1 notation range/cell (required for read_range, read_cell, describe_sheet)
  --ranges <r1,r2>     Comma-separated ranges (required for read_multi)
  --json               Output raw JSON instead of formatted text
 
Examples:
  node read-sheet.js --spreadsheet <ID> --action read_all
  node read-sheet.js --spreadsheet <ID> --action read_range --range "Sheet1!A1:C10"
  node read-sheet.js --spreadsheet <ID> --action read_cell  --range "Sheet1!B2"
  node read-sheet.js --spreadsheet <ID> --action read_multi --ranges "Sheet1!A1:B5,Sheet2!C1:D3"
  node read-sheet.js --spreadsheet <ID> --action list_sheets
  node read-sheet.js --spreadsheet <ID> --action describe_sheet --range "Sheet1"
`);
}

function formatTable(data) {
    if (!data || data.length === 0) return '(empty)';
    const colWidths = [];
    for (const row of data) {
        row.forEach((cell, i) => {
            colWidths[i] = Math.max(colWidths[i] || 0, String(cell).length);
        });
    }
    return data
        .map((row) =>
            row.map((cell, i) => String(cell).padEnd(colWidths[i])).join(' │ '),
        )
        .join('\n');
}

async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        printHelp();
        process.exit(0);
    }

    if (!process.env.GCP_SERVICE_ACCOUNT_CREDENTIALS) {
        console.error(
            'No json key file provided in the env variable: GCP_SERVICE_ACCOUNT_CREDENTIALS.  Please set this first',
        );
        process.exit(2);
    }

    const get = (flag) => {
        const i = args.indexOf(flag);
        return i !== -1 ? args[i + 1] : null;
    };

    const spreadsheetId = get('--spreadsheet');
    const action = get('--action') || 'read_all';
    const range = get('--range');
    const rangesRaw = get('--ranges');
    const jsonOutput = args.includes('--json');

    if (!spreadsheetId) {
        console.error('Error: --spreadsheet <ID> is required.\n');
        printHelp();
        process.exit(1);
    }

    try {
        let result;

        switch (action) {
            case 'read_all': {
                result = await readAll(spreadsheetId);
                if (!jsonOutput) {
                    console.log(`\nSpreadsheet: ${result.spreadsheetTitle}`);
                    for (const sheet of result.sheets) {
                        console.log(`\n${'─'.repeat(60)}`);
                        console.log(`Sheet: ${sheet.title}  (${sheet.range})`);
                        console.log('─'.repeat(60));
                        console.log(formatTable(sheet.data));
                    }
                    return;
                }
                break;
            }

            case 'read_range': {
                if (!range) {
                    console.error('Error: --range is required for read_range.');
                    process.exit(1);
                }
                result = await readRange(spreadsheetId, range);
                if (!jsonOutput) {
                    console.log(`\nRange: ${result.range}`);
                    console.log(formatTable(result.data));
                    return;
                }
                break;
            }

            case 'read_cell': {
                if (!range) {
                    console.error('Error: --range is required for read_cell.');
                    process.exit(1);
                }
                result = await readCell(spreadsheetId, range);
                if (!jsonOutput) {
                    console.log(`\nCell: ${result.range}`);
                    console.log(`Value: ${result.value ?? '(empty)'}`);
                    return;
                }
                break;
            }

            case 'read_multi': {
                if (!rangesRaw) {
                    console.error(
                        'Error: --ranges is required for read_multi.',
                    );
                    process.exit(1);
                }
                const ranges = rangesRaw.split(',').map((r) => r.trim());
                result = await readMultipleRanges(spreadsheetId, ranges);
                if (!jsonOutput) {
                    for (const r of result) {
                        console.log(`\nRange: ${r.range}`);
                        console.log(formatTable(r.data));
                    }
                    return;
                }
                break;
            }

            case 'list_sheets': {
                result = await getSheetNames(spreadsheetId);
                if (!jsonOutput) {
                    console.log(`\nSpreadsheet: ${result.spreadsheetTitle}`);
                    console.log('\nSheets:');
                    result.sheets.forEach((name, i) =>
                        console.log(`  ${i + 1}. ${name}`),
                    );
                    return;
                }
                break;
            }

            case 'describe_sheet': {
                if (!range) {
                    console.error(
                        'Error: --range (sheet name) is required for describe_sheet.',
                    );
                    process.exit(1);
                }
                result = await describeSheet(spreadsheetId, range);
                if (!jsonOutput) {
                    console.log(`\nSheet: ${result.sheet}`);
                    if (result.empty) {
                        console.log('(empty sheet)');
                        return;
                    }
                    console.log(`Total Rows: ${result.totalRows}`);
                    console.log(`Total Columns: ${result.totalColumns}`);
                    console.log(`Actual Data Range: ${result.actualDataRange}`);
                    console.log(
                        `Has Header Row: ${result.hasHeaderRow ? 'Yes' : 'No'}`,
                    );
                    console.log(
                        `Data Start: Row ${result.dataStartRow}, Col ${result.dataStartCol}`,
                    );
                    console.log(
                        `Data End: Row ${result.dataEndRow}, Col ${result.dataEndCol}`,
                    );
                    console.log('\nColumns:');
                    result.columns.forEach((col) => {
                        console.log(
                            `  - ${col.header} (index: ${col.index}, type: ${col.inferredType}, non-empty: ${col.nonEmptyCount})`,
                        );
                        if (col.sample.length > 0) {
                            console.log(
                                `    Sample values: ${col.sample.join(', ')}`,
                            );
                        }
                    });
                    return;
                }
                break;
            }

            default:
                console.error(`Unknown action: ${action}`);
                printHelp();
                process.exit(1);
        }

        // JSON output path
        console.log(JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
        if (err.errors) console.error(JSON.stringify(err.errors, null, 2));
        process.exit(1);
    }
}

// Run CLI if called directly, otherwise export for programmatic use
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    main();
}

export {
    readAll,
    readRange,
    readCell,
    readMultipleRanges,
    getSheetNames,
    getSheetsClient,
    describeSheet,
};
