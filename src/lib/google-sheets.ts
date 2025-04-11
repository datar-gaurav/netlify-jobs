'use server';

import {google} from 'googleapis';
import {JobPosting} from '@/services/external-job-boards';

let SHEET_ID: string | undefined = process.env.GOOGLE_SHEET_ID;

export async function getSheetsAPI() {
  try {
    const authClient = new google.auth.JWT(
      process.env.GOOGLE_CREDENTIALS_CLIENT_EMAIL,
      undefined,
      process.env.GOOGLE_CREDENTIALS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    await authClient.authorize(); // force connection

    return google.sheets({ version: 'v4', auth: authClient });
  } catch (error) {
    console.error('❌ Failed to initialize Sheets API:', error);
    throw error;
  }
}

export async function initializeSheet() {
  if (!process.env.GOOGLE_SHEET_ID) {
    throw new Error(
      'GOOGLE_SHEET_ID is not defined in the environment variables.'
    );
  }

  try {
    const sheets = await getSheetsAPI();
    // Check if the spreadsheet exists
    try {
      await sheets.spreadsheets.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
      });
      console.log('Spreadsheet already exists.');
      return;
    } catch (getSheetError: any) {
      if (getSheetError.code === 404) {
        console.log('Spreadsheet does not exist, creating a new one...');
        const spreadsheetId = await createSheet();
        SHEET_ID = spreadsheetId;
      } else {
        console.error('Error getting sheet:', getSheetError);
        throw getSheetError;
      }
    }
  } catch (error: any) {
    console.error('Could not refresh access token:', error);
    return;
  }
}

async function createSheet(): Promise<string> {
  console.log('🔍 Checking credentials:', {
    type: process.env.GOOGLE_CREDENTIALS_TYPE,
    client_email: process.env.GOOGLE_CREDENTIALS_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_CREDENTIALS_PRIVATE_KEY?.slice(0, 30) + '...',
  });
  
  const sheets = await getSheetsAPI();
  const spreadsheet = {
    properties: {
      title: 'JobTrack Pro - Job Applications',
    },
    sheets: [
      {
        properties: {
          title: 'Applications',
        },
      },
    ],
  };

  try {
    const response = await sheets.spreadsheets.create({
      requestBody: spreadsheet,
      fields: 'spreadsheetId',
    });

    if (!response.data.spreadsheetId) {
      throw new Error('spreadsheetId not properly generated.');
    }

    console.log('Spreadsheet created with ID:', response.data.spreadsheetId);
    process.env.GOOGLE_SHEET_ID = response.data.spreadsheetId;
    SHEET_ID = response.data.spreadsheetId;

    // Add headers to the sheet
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
      spreadsheetId: response.data.spreadsheetId,
      range: 'Applications!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: headerValues,
      },
    });

    console.log('Spreadsheet headers added.');
    return response.data.spreadsheetId;
  } catch (error) {
    console.error('Error creating sheet:', error);
    throw error;
  }
}

export async function getJobPostings(): Promise<any[]> {
  if (!SHEET_ID) {
    throw new Error(
      'GOOGLE_SHEET_ID is not defined in the environment variables.'
    );
  }

  try {
    const sheets = await getSheetsAPI();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Applications!A1:K', // Adjust range to include all columns
    });

    const values = response?.data?.values || [];
    const headers = values[0] as string[];
    const jobPostings = values.slice(1).map(row => {
      const job: {[key: string]: any} = {};
      headers.forEach((header, index) => {
        job[header] = row[index] || '';
      });
      return job;
    });

    return jobPostings;
  } catch (error) {
    console.error('Error getting job postings:', error);
    return [];
  }
}

export async function addJobToSheet(jobData: any) {
  if (!SHEET_ID) {
    throw new Error(
      'GOOGLE_SHEET_ID is not defined in the environment variables.'
    );
  }

  try {
    const sheets = await getSheetsAPI();
      if (!SHEET_ID) {
          throw new Error('Spreadsheet ID is not properly initialized.');
      }
	  // Format keywords as comma-separated string
	  const keywordsString = jobData.keywords ? jobData.keywords.join(', ') : '';
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
      ],
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Applications!A1:K1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: values,
      },
    });

    console.log('Job added to sheet:', jobData.position, jobData.employer);
  } catch (error) {
    console.error('Error adding job to sheet:', error);
    throw error;
  }
}

export async function updateJobInSheet(jobData: any, rowIndex: number, keywords: string[]) {
  if (!SHEET_ID) {
    throw new Error(
      'GOOGLE_SHEET_ID is not defined in the environment variables.'
    );
  }

  try {
    const sheets = await getSheetsAPI();
    const range = `Applications!A${rowIndex}:K${rowIndex}`; // Adjust range to include all columns
	  // Format keywords as comma-separated string
	  const keywordsString = jobData.keywords ? jobData.keywords.join(', ') : '';
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
      ],
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: values,
      },
    });

    console.log(
      'Job updated in sheet:',
      jobData.position,
      jobData.employer,
      'at row:',
      rowIndex
    );
  } catch (error) {
    console.error('Error updating job in sheet:', error);
    throw error;
  }
}

export async function deleteJobFromSheet(rowIndex: number) {
    if (!SHEET_ID) {
        throw new Error(
            'GOOGLE_SHEET_ID is not defined in the environment variables.'
        );
    }

    try {
        const sheets = await getSheetsAPI();
        await sheets.spreadsheets.values.clear({
            spreadsheetId: SHEET_ID,
            range: `Applications!A${rowIndex}:K${rowIndex}`, // Clear all columns in the row
        });
        console.log(`Job deleted from sheet at row: ${rowIndex}`);
    } catch (error) {
        console.error('Error deleting job from sheet:', error);
        throw error;
    }
}
