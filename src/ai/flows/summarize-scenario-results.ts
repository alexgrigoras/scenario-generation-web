
'use server';

/**
 * @fileOverview Summarizes the results of multiple what-if scenarios, highlighting key metrics.
 *
 * - summarizeScenarioResults - A function that handles the summarization process.
 * - SummarizeScenarioResultsInput - The input type for the summarizeScenarioResults function.
 * - SummarizeScenarioResultsOutput - The return type for the summarizeScenarioResults function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeScenarioResultsInputSchema = z.object({
  scenarios: z
    .array(
      z.object({
        scenarioName: z.string().describe('The name of the scenario.'),
        projectedRevenueChange: z
          .number()
          .optional()
          .describe('The projected revenue change for the scenario (optional).'),
        potentialStockoutRisk: z
          .string()
          .optional()
          .describe('The potential stockout risk for the scenario (optional).'),
        details: z.string().optional().describe('Additional details about the scenario, typically the AI-generated summary of an individual forecast.'),
      })
    )
    .describe('An array of what-if scenarios and their results.'),
});
export type SummarizeScenarioResultsInput = z.infer<
  typeof SummarizeScenarioResultsInputSchema
>;

const SummarizeScenarioResultsOutputSchema = z.object({
  summary: z.string().describe('A comprehensive summary of all analyzed scenario results.'),
  mostPromisingScenario: z.string().describe('The name or description of the most promising scenario identified from the batch, and why.'),
  riskiestScenario: z.string().describe('The name or description of the riskiest scenario identified from the batch, and why.'),
});
export type SummarizeScenarioResultsOutput = z.infer<
  typeof SummarizeScenarioResultsOutputSchema
>;

export async function summarizeScenarioResults(
  input: SummarizeScenarioResultsInput
): Promise<SummarizeScenarioResultsOutput> {
  return summarizeScenarioResultsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeScenarioResultsPrompt',
  input: {schema: SummarizeScenarioResultsInputSchema},
  output: {schema: SummarizeScenarioResultsOutputSchema},
  prompt: `You are a business analyst tasked with summarizing the results of multiple what-if pricing scenarios.

  For each scenario, you will receive its name and a detailed text summary of its forecasted impact. Some scenarios might also include quantitative metrics like 'Projected Revenue Change' or 'Potential Stockout Risk'.

  Your goal is to provide a consolidated analysis that includes:
  1. An overall summary of all scenarios considered.
  2. Identification of the 'Most Promising Scenario' and a brief explanation of why, based on the provided details.
  3. Identification of the 'Riskiest Scenario' and a brief explanation of why, based on the provided details.

  Focus on the qualitative information in the 'details' field for each scenario, using any quantitative metrics as supplementary information if available.

  Scenarios:
  {{#each scenarios}}
  Scenario Name: {{this.scenarioName}}
  {{#if this.projectedRevenueChange}}
  Projected Revenue Change: {{this.projectedRevenueChange}}
  {{/if}}
  {{#if this.potentialStockoutRisk}}
  Potential Stockout Risk: {{this.potentialStockoutRisk}}
  {{/if}}
  {{#if this.details}}
  Details: {{{this.details}}}
  {{/if}}
  \n-------------------------\n
  {{/each}}
  \n
  Please structure your output in the following JSON format:
  {
  "summary": "...",
  "mostPromisingScenario": "...",
  "riskiestScenario": "..."
  }
  `,
});

const summarizeScenarioResultsFlow = ai.defineFlow(
  {
    name: 'summarizeScenarioResultsFlow',
    inputSchema: SummarizeScenarioResultsInputSchema,
    outputSchema: SummarizeScenarioResultsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

