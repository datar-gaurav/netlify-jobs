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
  prompt: `Analyze the following job description and identify **at least 50 important keywords** and classify them as per output format mentioned below, which could be incorporated in resume to apply for the job. . These keywords should represent a comprehensive understanding of the role and should encompass. Focus on terms that are **crucial for understanding the detailed requirements and expectations** of this job. Be as specific as possible and break down broader concepts into more granular keywords where appropriate. Output keywords in format below: * **Core Technical Skills:** Programming languages, frameworks, libraries, databases, operating systems, specific software tools, hardware knowledge. * **Software Development Methodologies &amp; Practices:** Agile, Scrum, Waterfall, DevOps, CI/CD, Testing methodologies, Code review processes. * **Cloud Technologies &amp; Platforms:** Specific cloud providers (AWS, Azure, GCP), cloud services (EC2, S3, Kubernetes), serverless technologies. * **Industry-Specific Terminology:** Jargon, domain-specific concepts, relevant industry standards. * **Responsibilities &amp; Tasks:** Action verbs describing the duties and tasks involved in the role. * **Required Qualifications &amp; Experience:** Years of experience, educational degrees, certifications. * **Soft Skills &amp; Interpersonal Abilities:** Communication, teamwork, problem-solving, leadership, etc. * **Project Types &amp; Industry Verticals:** If mentioned, indicate the type of projects or industries the role is involved in (e.g., e-commerce, fintech, mobile applications). * **Level of Experience:** Entry-level, Mid-level, Senior, Lead, Managerial. * **Company Culture &amp; Values (if discernible):** Keywords reflecting the company's work environment and values.

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
