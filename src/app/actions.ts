
"use server";

import { generateScenarioForecast, type ScenarioForecastInput, type ScenarioForecastOutput } from "@/ai/flows/generate-scenario-forecast";
import { summarizeScenarioResults, type SummarizeScenarioResultsInput, type SummarizeScenarioResultsOutput } from "@/ai/flows/summarize-scenario-results";

export async function generateForecastAction(
  input: ScenarioForecastInput // This type now includes customFuturePricesCsv?: string from the flow definition
): Promise<ScenarioForecastOutput | { error: string }> {
  try {
    // Basic validation
    if (!input.historicalData || input.historicalData.trim() === "") {
      return { error: "Historical data cannot be empty." };
    }
    if (!input.priceChangeScenario || input.priceChangeScenario.trim() === "") {
      return { error: "Price change scenario description cannot be empty." };
    }
    if (!input.forecastLength || input.forecastLength.trim() === "") {
      return { error: "Forecast length cannot be empty." };
    }
    if (input.customFuturePricesCsv !== undefined && input.customFuturePricesCsv.trim() === "") {
        return { error: "Custom future prices CSV was provided but is empty."};
    }

    const result = await generateScenarioForecast(input);
    return result;
  } catch (e) {
    console.error("Error in generateForecastAction:", e);
    return { error: e instanceof Error ? e.message : "An unknown error occurred during forecast generation." };
  }
}

export async function summarizeResultsAction(
  input: SummarizeScenarioResultsInput
): Promise<SummarizeScenarioResultsOutput | { error: string }> {
  try {
     // Basic validation
    if (!input.scenarios || input.scenarios.length === 0) {
      return { error: "No scenarios provided for summarization." };
    }
    input.scenarios.forEach(scenario => {
      if(!scenario.scenarioName || scenario.scenarioName.trim() === "") {
        throw new Error("Scenario name cannot be empty.");
      }
    });

    const result = await summarizeScenarioResults(input);
    return result;
  } catch (e) {
    console.error("Error in summarizeResultsAction:", e);
    return { error: e instanceof Error ? e.message : "An unknown error occurred during results summarization." };
  }
}
