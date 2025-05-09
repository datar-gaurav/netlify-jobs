'use server';

import { google } from 'googleapis';
import { JobPosting } from '@/services/external-job-boards';

let SHEET_ID: string | undefined = process.env.GOOGLE_SHEET_ID;
const SHEET_TAB = 'Applications';

async function getSheetsAPI() {
  try {
    const authClient = new google.auth.JWT(
      process.env.GOOGLE_CREDENTIALS_CLIENT_EMAIL,
      undefined,
      process.env.GOOGLE_CREDENTIALS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    await authClient.authorize();
    return google.sheets({ version: 'v4', auth: authClient });
  } catch (error) {
    console.error('Error creating Google Sheets API:', error);
    throw error;
  }
}

function getColumnLetter(index: number): string {
  let letter = '';
  while (index >= 0) {
    letter = String.fromCharCode((index % 26) + 65) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
}

export async function initializeSheet() {
  if (!process.env.GOOGLE_SHEET_ID) {
    console.log('GOOGLE_SHEET_ID not found, creating new sheet...');
    const id = await createSheet();
    SHEET_ID = id;
    return;
  }

  try {
    const sheets = await getSheetsAPI();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const response = await sheets.spreadsheets.get({ spreadsheetId });

    const sheetExists = response.data.sheets?.some(
      s => s.properties?.title === SHEET_TAB
    );

    if (!sheetExists) {
      console.log(`Sheet "${SHEET_TAB}" not found. Creating...`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: { properties: { title: SHEET_TAB } },
            },
          ],
        },
      });

      await addHeaders(spreadsheetId, SHEET_TAB);
    } else {
      console.log(`✅ Sheet "${SHEET_TAB}" already exists.`);
      await addHeaders(spreadsheetId, SHEET_TAB); // Ensure headers are updated
    }
  } catch (error) {
    console.error('Error initializing sheet:', error);
    throw error;
  }
}

async function createSheet(): Promise<string> {
  const sheets = await getSheetsAPI();

  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: 'JobTrack Pro - Job Applications' },
      sheets: [{ properties: { title: SHEET_TAB } }],
    },
    fields: 'spreadsheetId',
  });

  const spreadsheetId = response.data.spreadsheetId;
  if (!spreadsheetId) throw new Error('Spreadsheet ID was not generated.');

  process.env.GOOGLE_SHEET_ID = spreadsheetId;
  SHEET_ID = spreadsheetId;

  await addHeaders(spreadsheetId, SHEET_TAB);
  console.log('✅ New spreadsheet created with headers.');

  return spreadsheetId;
}

async function addHeaders(spreadsheetId: string, sheetName: string) {
  const sheets = await getSheetsAPI();
  const desiredHeaders = [
    'Employer', 'Position', 'Location', 'Status', 'Applied Date',
    'Relevance', 'Job Description', 'Resume', 'Keywords', 'Notes', 'URL',
    'Updated Resume', 'Updated Resume Analysis', 'Latex Resume',
    'Keyword Analysis', 'Final Resume', 'INITIAL_RESUME'
  ];

  try {
    const existingHeaders = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!1:1`,
    });

    const currentHeaders = existingHeaders.data.values?.[0] || [];

    for (let i = 0; i < desiredHeaders.length; i++) {
      if (!currentHeaders[i]) {
        const colLetter = getColumnLetter(i);
        const range = `${sheetName}!${colLetter}1`;

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[desiredHeaders[i]]] },
        });

        console.log(`✅ Added missing header "${desiredHeaders[i]}" at column ${colLetter}`);
      }
    }
  } catch (error) {
    console.error('Error adding headers:', error);
    throw error;
  }
}

export async function getJobPostings(): Promise<any[]> {
  if (!SHEET_ID) throw new Error('Sheet ID not set.');

  try {
    const sheets = await getSheetsAPI();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_TAB}!A1:R`, // 18 columns
    });

    const values = response?.data?.values || [];
    const headers = values[0] as string[];
    const rows = values.slice(1);

    return rows.map(row => {
      const obj: { [key: string]: any } = {};
      headers.forEach((h, i) => (obj[h] = row[i] || ''));
      return obj;
    });
  } catch (error) {
    console.error('Error getting job postings:', error);
    return [];
  }
}

export async function addJobToSheet(jobData: any) {
  if (!SHEET_ID) throw new Error('Sheet ID not set.');

  const keywordsString = jobData.keywords?.join(', ') || '';
  console.log(jobData)
  const values = [
    [
      jobData.employer,
      jobData.position,
      jobData.location,
      jobData.status,
      jobData.appliedDate,
      jobData.relevance,
      jobData.jobDescription,
      jobData.resume,
      keywordsString,
      jobData.notes,
      jobData.url,
      jobData.updatedResume || '',
      jobData.updatedResumeAnalysis || '',
      jobData.latexResume || '',
      jobData.keywordAnalysis || '',
      jobData.finalResume || '',      
      jobData.initialResume || '',
    ],
  ];

  try {
    const sheets = await getSheetsAPI();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID!,
      range: `${SHEET_TAB}!A1:Q1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    console.log('✅ Job added:', jobData.position, jobData.employer);
  } catch (error) {
    console.error('Error adding job:', error);
    throw error;
  }
}

export async function updateJobInSheet(jobData: any, rowIndex: number) {
  if (!SHEET_ID) throw new Error('Sheet ID not set.');

  const values = [
    [
      jobData.employer || '',
      jobData.position || '',
      jobData.location || '',
      jobData.status || '',
      jobData.appliedDate || '',
      jobData.relevance || '',
      jobData.jobDescription || '',
      jobData.resume || '',
      jobData.keywords?.join(', ') || '',
      jobData.notes || '',
      jobData.url || '',
      jobData.updatedResume || '',
      jobData.updatedResumeAnalysis || '',
      jobData.latexResume || '',
      jobData.keywordAnalysis || '',
      jobData.finalResume || '',
      jobData.initialResume || '',
    ]
  ];

  try {
    const sheets = await getSheetsAPI();
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID!,
      range: `${SHEET_TAB}!A${rowIndex}:Q${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    console.log(`✅ Job updated in row ${rowIndex}: ${jobData.position}`);
  } catch (error) {
    console.error('Error updating job:', error);
    throw error;
  }
}

export async function deleteJobFromSheet(rowIndex: number) {
  if (!SHEET_ID) throw new Error('Sheet ID not set.');

  try {
    const sheets = await getSheetsAPI();
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SHEET_ID!,
      range: `${SHEET_TAB}!A${rowIndex}:Q${rowIndex}`,
    });

    console.log(`🗑️ Job deleted at row ${rowIndex}`);
  } catch (error) {
    console.error('Error deleting job:', error);
    throw error;
  }
}