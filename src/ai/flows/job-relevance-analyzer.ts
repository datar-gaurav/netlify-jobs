'use server';
/**
 * @fileOverview Analyzes the relevance of a job description to a user's resume using AI.
 *
 * - analyzeJobRelevance - A function that analyzes job relevance.
 * - AnalyzeJobRelevanceInput - The input type for the analyzeJobRelevance function.
 * - AnalyzeJobRelevanceOutput - The return type for the analyzeJobRelevance function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const AnalyzeJobRelevanceInputSchema = z.object({
  jobDescription: z.string().describe('The description of the job posting.'),
  resume: z.string().describe('The user\'s resume.'),
});
export type AnalyzeJobRelevanceInput = z.infer<typeof AnalyzeJobRelevanceInputSchema>;

const AnalyzeJobRelevanceOutputSchema = z.object({
  relevanceScore: z.number().describe('A score indicating the relevance of the job to the resume (0-1).'),
  reason: z.string().describe('Explanation of why the job is relevant or not.'),
});
export type AnalyzeJobRelevanceOutput = z.infer<typeof AnalyzeJobRelevanceOutputSchema>;

export async function analyzeJobRelevance(input: AnalyzeJobRelevanceInput): Promise<AnalyzeJobRelevanceOutput> {
  return analyzeJobRelevanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeJobRelevancePrompt',
  input: {
    schema: z.object({
      jobDescription: z.string().describe('The description of the job posting.'),
      resume: z.string().describe('The user\'s resume.'),
    }),
  },
  output: {
    schema: z.object({
      relevanceScore: z.number().describe('A score indicating the relevance of the job to the resume (0-1).'),
      reason: z.string().describe('Explanation of why the job is relevant or not.'),
    }),
  },
  prompt: `You are an AI job relevance analyzer.  Given the job description and the user's resume, determine how relevant the job is to the applicant.  Provide a relevance score between 0 and 1, as well as a reason for the score. 0 means no relevance, and 1 means perfect relevance. Consider skills, experience, and keywords.

Job Description: {{{jobDescription}}}
Resume: {{{resume}}}`,
});

const analyzeJobRelevanceFlow = ai.defineFlow<
  typeof AnalyzeJobRelevanceInputSchema,
  typeof AnalyzeJobRelevanceOutputSchema
>(
  {
    name: 'analyzeJobRelevanceFlow',
    inputSchema: AnalyzeJobRelevanceInputSchema,
    outputSchema: AnalyzeJobRelevanceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
