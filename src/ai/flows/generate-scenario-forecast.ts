// src/ai/flows/generate-scenario-forecast.ts
'use server';
/**
 * @fileOverview Forecasts time series data based on a given price change scenario.
 *
 * - generateScenarioForecast - A function that takes historical data and a price change scenario
 *   and returns a forecasted time series.
 * - ScenarioForecastInput - The input type for the generateScenarioForecast function.
 * - ScenarioForecastOutput - The return type for the generateScenarioForecast function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ScenarioForecastInputSchema = z.object({
  historicalData: z
    .string()
    .describe('Historical sales and pricing data in CSV format.'),
  priceChangeScenario: z
    .string()
    .describe(
      'A description of the price change scenario, e.g., a 10% increase in price for product X.'
    ),
});
export type ScenarioForecastInput = z.infer<typeof ScenarioForecastInputSchema>;

const ScenarioForecastOutputSchema = z.object({
  forecastedData: z
    .string()
    .describe('The forecasted time series data in CSV format.'),
  summary: z.string().describe('A summary of the forecasted scenario.'),
});
export type ScenarioForecastOutput = z.infer<typeof ScenarioForecastOutputSchema>;

export async function generateScenarioForecast(
  input: ScenarioForecastInput
): Promise<ScenarioForecastOutput> {
  return generateScenarioForecastFlow(input);
}

const prompt = ai.definePrompt({
  name: 'scenarioForecastPrompt',
  input: {schema: ScenarioForecastInputSchema},
  output: {schema: ScenarioForecastOutputSchema},
  prompt: `You are an expert business analyst specializing in forecasting sales based on pricing scenarios.

You are provided with historical sales and pricing data, and a description of a price change scenario.

Your task is to generate a forecasted time series of demand, taking into account the impact of the price change.

Historical Data:
{{historicalData}}

Price Change Scenario:
{{priceChangeScenario}}

Output the forecasted time series data in CSV format, including columns for date, price, and demand.  Also generate a short summary of the scenario.
`,
});

const generateScenarioForecastFlow = ai.defineFlow(
  {
    name: 'generateScenarioForecastFlow',
    inputSchema: ScenarioForecastInputSchema,
    outputSchema: ScenarioForecastOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
