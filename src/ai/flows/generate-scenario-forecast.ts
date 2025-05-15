
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
    .describe("Historical sales and pricing data in CSV format. Expected columns: 'timestamp', 'item_id', 'store_id', 'demand', 'price'."),
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
    .describe("The forecasted time series data in CSV format. Expected columns: 'timestamp', 'price', 'demand'."),
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
The historical data CSV contains columns: 'timestamp', 'item_id', 'store_id', 'demand', and 'price'. You should use all relevant columns from the historical data (item_id, store_id, price, demand over timestamp) to inform your forecast.

Your task is to generate a forecasted time series of demand, taking into account the impact of the price change described in the scenario.

Historical Data (CSV format with columns: timestamp, item_id, store_id, demand, price):
{{historicalData}}

Price Change Scenario:
{{priceChangeScenario}}

Output the forecasted time series data in CSV format, including columns for timestamp, price, and demand. The 'timestamp' column in your output should match the format of the input 'timestamp' column. Also generate a short summary of the scenario.
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
