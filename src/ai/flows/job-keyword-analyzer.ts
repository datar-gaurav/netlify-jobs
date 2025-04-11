'use server';
/**
 * @fileOverview Extracts keywords from a job description using AI.
 *
 * - analyzeJobDescription - A function that extracts keywords from a job description.
 * - AnalyzeJobDescriptionInput - The input type for the analyzeJobDescription function.
 * - AnalyzeJobDescriptionOutput - The return type for the analyzeJobDescription function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const AnalyzeJobDescriptionInputSchema = z.object({
  jobDescription: z.string().describe('The job description to analyze.'),
});
export type AnalyzeJobDescriptionInput = z.infer<typeof AnalyzeJobDescriptionInputSchema>;

const AnalyzeJobDescriptionOutputSchema = z.object({
  keywords: z.array(z.string()).describe('Keywords extracted from the job description.'),
});
export type AnalyzeJobDescriptionOutput = z.infer<typeof AnalyzeJobDescriptionOutputSchema>;

export async function analyzeJobDescription(input: AnalyzeJobDescriptionInput): Promise<AnalyzeJobDescriptionOutput> {
  return analyzeJobDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'jobKeywordAnalyzerPrompt',
  input: {
    schema: z.object({
      jobDescription: z.string().describe('The job description to analyze.'),
    }),
  },
  output: {
    schema: z.object({
      keywords: z.array(z.string()).describe('Keywords extracted from the job description.'),
    }),
  },
  prompt: `You are an expert in identifying keywords from job descriptions.

  Please extract the keywords from the following job description:

  {{jobDescription}}

  Please return a list of keywords that are most relevant to the job description.
  `,
});

const analyzeJobDescriptionFlow = ai.defineFlow<
  typeof AnalyzeJobDescriptionInputSchema,
  typeof AnalyzeJobDescriptionOutputSchema
>({
  name: 'analyzeJobDescriptionFlow',
  inputSchema: AnalyzeJobDescriptionInputSchema,
  outputSchema: AnalyzeJobDescriptionOutputSchema,
},
async input => {
  const {output} = await prompt(input);
  return output!;
});
