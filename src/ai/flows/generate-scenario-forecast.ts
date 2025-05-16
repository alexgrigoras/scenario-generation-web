
// src/ai/flows/generate-scenario-forecast.ts
'use server';
/**
 * @fileOverview Forecasts time series data based on a given price change scenario and forecast length.
 *               Can also use a custom future price series to forecast demand.
 *
 * - generateScenarioForecast - A function that takes historical data, a price change scenario,
 *   and a forecast length, then returns a forecasted time series. Can optionally take custom future prices.
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
      'A description of the price change scenario, e.g., a 10% increase in price for product X. Used for context if customFuturePricesCsv is provided.'
    ),
  forecastLength: z
    .string()
    .describe('The desired length or period for the forecast (e.g., "next 30 days", "for 6 weeks", "until end of Q4"). Used for context if customFuturePricesCsv is provided; the period is otherwise defined by custom prices.'),
  customFuturePricesCsv: z.string().optional().describe('Optional. A CSV string representing custom future prices, with columns "timestamp" and "price". If provided, the AI will use these exact prices for the future period and will forecast demand based on them. The `priceChangeScenario` will then be used for context only regarding the demand forecast.'),
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

You are provided with historical sales and pricing data.
Historical Data (CSV format with columns: timestamp, item_id, store_id, demand, price):
{{{historicalData}}}

{{#if customFuturePricesCsv}}
You have also been provided with a specific future price series.
Custom Future Prices (CSV format with columns: timestamp, price):
{{{customFuturePricesCsv}}}

Your task is to:
1. Use these EXACT future prices for the forecast period.
2. Forecast the 'demand' for the period covered by these custom future prices, considering the historical data and the impact of the specified prices.
3. Output a CSV containing 'timestamp', 'price' (from the custom future prices you were given), and your forecasted 'demand'.
4. Provide a summary of this forecast, highlighting how the specified prices are expected to impact demand.

Scenario Context (original description, for context only):
{{priceChangeScenario}}
Forecast Length (original, for context only, the period is now defined by the custom prices CSV):
{{forecastLength}}

{{else}}
You are given a description of a price change scenario and a desired forecast length.
Price Change Scenario:
{{priceChangeScenario}}

Forecast Length:
{{forecastLength}}

Your task is to:
1. Forecast both 'price' and 'demand' for the specified forecast length, taking into account the impact of the price change described in the scenario.
2. Output the forecasted time series data in CSV format, including columns for 'timestamp', 'price', and 'demand'. The 'timestamp' column in your output should match the format of the input 'timestamp' column and cover the period specified by the forecast length.
3. Also generate a short summary of the scenario.
{{/if}}

Use all relevant columns from the historical data (item_id, store_id, price, demand over timestamp) to inform your forecast.
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
