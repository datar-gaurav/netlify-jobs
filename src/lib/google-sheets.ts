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

      await addHeaders(spreadsheetId);
    } else {
      console.log(`✅ Sheet "${SHEET_TAB}" already exists.`);
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

  await addHeaders(spreadsheetId);
  console.log('✅ New spreadsheet created with headers.');

  return spreadsheetId;
}

async function addHeaders(spreadsheetId: string) {
  const sheets = await getSheetsAPI();
  const headerValues = [
    [
      'Employer',
      'Position',
      'Location',
      'Status',
      'Applied Date',
      'Relevance',
      'Job Description',
      'Resume',
      'Keywords',
      'Notes',
      'URL',
    ],
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_TAB}!A1:K1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: headerValues },
  });
}

export async function getJobPostings(): Promise<any[]> {
  if (!SHEET_ID) throw new Error('Sheet ID not set.');

  try {
    const sheets = await getSheetsAPI();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_TAB}!A1:K`,
    });

    const values = response?.data?.values || [];
    const headers = values[0] as string[];
    const rows = values.slice(1);

    return rows.map(row => {
      const obj: { [key: string]: any } = {};
      headers.forEach((h, i) => (obj[h] = row[i] || ''));
      return {
        ...obj,
        'Updated Resume': row[11] || '',
        'Updated Resume Analysis': row[12] || '',
      };
    });
  } catch (error) {
    console.error('Error getting job postings:', error);
    return [];
  }
}

export async function addJobToSheet(jobData: any) {
  if (!SHEET_ID) throw new Error('Sheet ID not set.');

  const keywordsString = jobData.keywords?.join(', ') || '';
  const updatedResume = jobData.updatedResume || '';
  const updatedResumeAnalysis = jobData.updatedResumeAnalysis || '';
  const latexResume = jobData.latexResume || '';
  const keywordAnalysis = jobData.keywordAnalysis || '';
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
      updatedResume,
      updatedResumeAnalysis,
      latexResume,
      jobData.url,
    ],
  ];

  try {
    const sheets = await getSheetsAPI();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_TAB}!A1:K1`,
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

      // Add other fields here as needed, ensure the order matches your sheet
      // Example: jobData.otherField || '',
    ],
  ];

  try {
    const sheets = await getSheetsAPI();
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_TAB}!A${rowIndex}:O${rowIndex}`, // Adjusted range to include new columns
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
      spreadsheetId: SHEET_ID,
      range: `${SHEET_TAB}!A${rowIndex}:K${rowIndex}`,
    });

    console.log(`🗑️ Job deleted at row ${rowIndex}`);
  } catch (error) {
    console.error('Error deleting job:', error);
    throw error;
  }
}