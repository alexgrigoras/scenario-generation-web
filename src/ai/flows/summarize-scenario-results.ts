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
          .describe('The projected revenue change for the scenario.'),
        potentialStockoutRisk: z
          .string()
          .describe('The potential stockout risk for the scenario.'),
        details: z.string().optional().describe('Additional details about the scenario.'),
      })
    )
    .describe('An array of what-if scenarios and their results.'),
});
export type SummarizeScenarioResultsInput = z.infer<
  typeof SummarizeScenarioResultsInputSchema
>;

const SummarizeScenarioResultsOutputSchema = z.object({
  summary: z.string().describe('A summary of the scenario results.'),
  mostPromisingScenario: z.string().describe('The most promising scenario.'),
  riskiestScenario: z.string().describe('The riskiest scenario.'),
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
  prompt: `You are a business analyst summarizing the results of what-if scenarios.

  Given the following scenarios, provide a summary highlighting the most promising and riskiest scenarios, including key metrics like projected revenue change and potential stockout risks.

  Scenarios:
  {{#each scenarios}}
  Scenario Name: {{this.scenarioName}}
  Projected Revenue Change: {{this.projectedRevenueChange}}
  Potential Stockout Risk: {{this.potentialStockoutRisk}}
  {{#if this.details}}
  Details: {{this.details}}
  {{/if}}
  \n
  {{/each}}
  \n
  Summary should include:
  * An overall summary of the scenarios.
  * Identification of the most promising scenario and why.
  * Identification of the riskiest scenario and why.
  \n
  Output in the following JSON format:
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
