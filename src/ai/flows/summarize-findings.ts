'use server';

/**
 * @fileOverview Summarizes the findings of the steganography detection engine.
 *
 * - summarizeFindings - A function that summarizes the findings.
 * - SummarizeFindingsInput - The input type for the summarizeFindings function.
 * - SummarizeFindingsOutput - The return type for the summarizeFindings function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { generateLocalSummary } from '@/lib/scan-summary';

const SummarizeFindingsInputSchema = z.object({
  findings: z.string().describe('The raw findings from the steganography detection engine.'),
  type: z.string().describe('The type of content analyzed (emoji/text/image).'),
  severity: z.string().describe('The severity level of the detected anomalies (Safe, Low, Medium, High, Critical).'),
});
export type SummarizeFindingsInput = z.infer<typeof SummarizeFindingsInputSchema>;

const SummarizeFindingsOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the steganography detection findings.'),
});
export type SummarizeFindingsOutput = z.infer<typeof SummarizeFindingsOutputSchema>;

export async function summarizeFindings(input: SummarizeFindingsInput): Promise<SummarizeFindingsOutput> {
  return summarizeFindingsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeFindingsPrompt',
  input: {schema: SummarizeFindingsInputSchema},
  output: {schema: SummarizeFindingsOutputSchema},
  prompt: `You are an expert cybersecurity analyst tasked with summarizing steganography detection findings.

  Given the raw findings, content type, and severity level, provide a concise and informative summary of the potential risks.

  Raw Findings: {{{findings}}}
  Content Type: {{{type}}}
  Severity Level: {{{severity}}}

  Summary:`,
});

const summarizeFindingsFlow = ai.defineFlow(
  {
    name: 'summarizeFindingsFlow',
    inputSchema: SummarizeFindingsInputSchema,
    outputSchema: SummarizeFindingsOutputSchema,
  },
  async input => {
    try {
      const resultPromise = prompt(input);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('API Timeout')), 1200));
      const { output } = await Promise.race([resultPromise, timeoutPromise]) as any;
      return output || { summary: generateLocalSummary(input) };
    } catch (e) {
      console.log("[AI Engine] Using local summary generator (API unavailable).");
      return { summary: generateLocalSummary(input) };
    }
  }
);
