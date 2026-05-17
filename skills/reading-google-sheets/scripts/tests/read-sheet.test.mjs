import {describe, it, expect, vi, beforeEach} from 'vitest';
import {readCell, readRange, getSheetNames} from '../read-sheet.mjs';
import {google} from 'googleapis';

// Mock googleapis
vi.mock('googleapis', () => {
    const mockSheets = {
        spreadsheets: {
            get: vi.fn(),
            values: {
                get: vi.fn(),
                batchGet: vi.fn(),
            },
        },
    };
    return {
        google: {
            auth: {
                GoogleAuth: class {
                    constructor() {
                        this.getClient = vi.fn().mockResolvedValue({});
                    }
                },
            },
            sheets: vi.fn().mockReturnValue(mockSheets),
        },
    };
});

describe('read-sheet.mjs', () => {
    const mockSpreadsheetId = 'test-spreadsheet-id';
    let sheetsMock;

    beforeEach(() => {
        vi.clearAllMocks();
        sheetsMock = google.sheets();
    });

    it('getSheetNames should return sheet names and title', async () => {
        sheetsMock.spreadsheets.get.mockResolvedValue({
            data: {
                properties: {title: 'Test Sheet'},
                sheets: [
                    {properties: {title: 'Sheet1'}},
                    {properties: {title: 'Sheet2'}},
                ],
            },
        });

        const result = await getSheetNames(mockSpreadsheetId);

        expect(result).toEqual({
            spreadsheetTitle: 'Test Sheet',
            sheets: ['Sheet1', 'Sheet2'],
        });
        expect(sheetsMock.spreadsheets.get).toHaveBeenCalledWith({
            spreadsheetId: mockSpreadsheetId,
            fields: 'properties.title,sheets.properties.title',
        });
    });

    it('readRange should return data for a given range', async () => {
        sheetsMock.spreadsheets.values.get.mockResolvedValue({
            data: {
                range: 'Sheet1!A1:B2',
                values: [
                    ['A1', 'B1'],
                    ['A2', 'B2'],
                ],
            },
        });

        const result = await readRange(mockSpreadsheetId, 'Sheet1!A1:B2');

        expect(result).toEqual({
            range: 'Sheet1!A1:B2',
            data: [
                ['A1', 'B1'],
                ['A2', 'B2'],
            ],
        });
        expect(sheetsMock.spreadsheets.values.get).toHaveBeenCalledWith({
            spreadsheetId: mockSpreadsheetId,
            range: 'Sheet1!A1:B2',
            valueRenderOption: 'FORMATTED_VALUE',
            dateTimeRenderOption: 'FORMATTED_STRING',
        });
    });

    it('readCell should return a single cell value', async () => {
        sheetsMock.spreadsheets.values.get.mockResolvedValue({
            data: {
                range: 'Sheet1!B2',
                values: [['Target Value']],
            },
        });

        const result = await readCell(mockSpreadsheetId, 'Sheet1!B2');

        expect(result).toEqual({
            range: 'Sheet1!B2',
            value: 'Target Value',
        });
    });

    it('readCell should return null if cell is empty', async () => {
        sheetsMock.spreadsheets.values.get.mockResolvedValue({
            data: {
                range: 'Sheet1!B2',
                values: [[null]],
            },
        });

        const result = await readCell(mockSpreadsheetId, 'Sheet1!B2');

        expect(result).toEqual({
            range: 'Sheet1!B2',
            value: null,
        });
    });
});
