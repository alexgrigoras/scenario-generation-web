
"use client";

import React from 'react';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadCloud, Lightbulb, LineChart, FileText, Loader2, CalendarDays, DollarSign, Filter, ListChecks, History } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import Logo from "@/components/logo";
import TimeSeriesChart, { type CombinedDataPoint } from "@/components/time-series-chart";
import { useToast } from "@/hooks/use-toast";
import { parseCsvForTimeSeries, extractUniqueColumnValues, type TimeSeriesDataPoint } from "@/lib/csv-parser";
import { generateForecastAction, summarizeResultsAction } from "./actions";
import type { ScenarioForecastInput, ScenarioForecastOutput } from '@/ai/flows/generate-scenario-forecast';
import type { SummarizeScenarioResultsInput, SummarizeScenarioResultsOutput } from '@/ai/flows/summarize-scenario-results';

interface GeneratedScenario {
  id: string;
  name: string;
  priceChangeDescription: string;
  forecastLength: string;
  // apiInput: ScenarioForecastInput; // Could be useful for re-running, but keep it simple for now
  apiOutput: ScenarioForecastOutput; 
  // Store parsed points if we want to quickly re-render old charts, for now, charts show latest.
  // forecastedDemandPoints: TimeSeriesDataPoint[]; 
  // forecastedPricePoints: TimeSeriesDataPoint[];
}


const ScenarioSagePage: React.FC = () => {
  const { toast } = useToast();

  const [historicalDataCsv, setHistoricalDataCsvState] = React.useState<string | null>(null);
  const [fileName, setFileNameState] = React.useState<string | null>(null);

  // Item and Store Filters
  const [availableItemIds, setAvailableItemIdsState] = React.useState<string[]>([]);
  const [selectedItemId, setSelectedItemIdState] = React.useState<string | undefined>(undefined);
  const [availableStoreIds, setAvailableStoreIdsState] = React.useState<string[]>([]);
  const [selectedStoreId, setSelectedStoreIdState] = React.useState<string | undefined>(undefined);

  // Demand Data for the latest forecast / historical view
  const [historicalDemandPoints, setHistoricalDemandPointsState] = React.useState<TimeSeriesDataPoint[]>([]);
  const [forecastedDemandPoints, setForecastedDemandPointsState] = React.useState<TimeSeriesDataPoint[]>([]); // For the latest forecast
  const [combinedDemandChartData, setCombinedDemandChartDataState] = React.useState<CombinedDataPoint[]>([]);
  const [demandChartTitle, setDemandChartTitleState] = React.useState<string>("Demand Data Overview");

  // Price Data for the latest forecast / historical view
  const [historicalPricePoints, setHistoricalPricePointsState] = React.useState<TimeSeriesDataPoint[]>([]);
  const [forecastedPricePoints, setForecastedPricePointsState] = React.useState<TimeSeriesDataPoint[]>([]); // For the latest forecast
  const [combinedPriceChartData, setCombinedPriceChartDataState] = React.useState<CombinedDataPoint[]>([]);
  const [priceChartTitle, setPriceChartTitleState] = React.useState<string>("Price Data Overview");

  // Inputs for the current scenario being defined
  const [scenarioName, setScenarioNameState] = React.useState<string>("Scenario 1");
  const [priceChangeDescription, setPriceChangeDescriptionState] = React.useState<string>("");
  const [forecastLength, setForecastLengthState] = React.useState<string>("next 30 days");

  // Output of the latest individual forecast
  const [latestForecastOutput, setLatestForecastOutputState] = React.useState<ScenarioForecastOutput | null>(null);
  
  // Storing all generated scenarios
  const [generatedScenarios, setGeneratedScenariosState] = React.useState<GeneratedScenario[]>([]);
  
  // Output of the multi-scenario summary
  const [multiScenarioSummary, setMultiScenarioSummaryState] = React.useState<SummarizeScenarioResultsOutput | null>(null);

  const [isGeneratingForecast, setIsGeneratingForecastState] = React.useState(false);
  const [isSummarizing, setIsSummarizingState] = React.useState(false);

  // Effect to parse historical data when CSV or filters change
  React.useEffect(() => {
    if (historicalDataCsv) {
      try {
        const demandData = parseCsvForTimeSeries(historicalDataCsv, 'demand', selectedItemId, selectedStoreId);
        setHistoricalDemandPointsState(demandData);

        const priceData = parseCsvForTimeSeries(historicalDataCsv, 'price', selectedItemId, selectedStoreId);
        setHistoricalPricePointsState(priceData);

        // When historical filters change, the currently displayed forecast (if any) might become less relevant
        // or disconnected if it was for a specific item/store combo not captured by the global forecast.
        // For now, we keep the latest forecast displayed, but its interpretation changes.
        // A more advanced version might clear or re-filter forecast if applicable.

      } catch (error) {
        toast({ title: "Error Parsing Filtered CSV", description: (error as Error).message, variant: "destructive" });
        setHistoricalDemandPointsState([]);
        setHistoricalPricePointsState([]);
      }
    }
  }, [historicalDataCsv, selectedItemId, selectedStoreId, toast]);


  // Effect for Demand Data Chart (latest forecast)
  React.useEffect(() => {
    const dataMap = new Map<string, CombinedDataPoint>();
    const sortedHistoricalData = [...historicalDemandPoints].sort((a, b) => {
      try {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (!isNaN(dateA) && !isNaN(dateB)) return dateA - dateB;
      } catch (e) { /* ignore */ }
      return a.date.localeCompare(b.date);
    });

    sortedHistoricalData.forEach(dp => {
      dataMap.set(dp.date, { date: dp.date, historical: dp.value });
    });

    forecastedDemandPoints.forEach(dp => {
      const existing = dataMap.get(dp.date);
      if (existing) {
        dataMap.set(dp.date, { ...existing, forecasted: dp.value });
      } else {
        dataMap.set(dp.date, { date: dp.date, forecasted: dp.value });
      }
    });

    if (sortedHistoricalData.length > 0 && forecastedDemandPoints.length > 0) {
      const lastHistoricalPoint = sortedHistoricalData[sortedHistoricalData.length - 1];
      const connectingPointData = dataMap.get(lastHistoricalPoint.date) || { date: lastHistoricalPoint.date };
      dataMap.set(lastHistoricalPoint.date, {
        ...connectingPointData,
        historical: lastHistoricalPoint.value,
        forecasted: lastHistoricalPoint.value, 
      });
    }

    const finalSortedData = Array.from(dataMap.values()).sort((a, b) => {
      try {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (!isNaN(dateA) && !isNaN(dateB)) return dateA - dateB;
      } catch (e) { /* ignore */ }
      return a.date.localeCompare(b.date);
    });
    
    setCombinedDemandChartDataState(finalSortedData);

    let title = "Demand Data Overview";
    if (historicalDemandPoints.length > 0 && forecastedDemandPoints.length === 0) title = "Historical Demand Data";
    else if (forecastedDemandPoints.length > 0 && historicalDemandPoints.length > 0) title = "Demand Overview: Historical & Latest Forecast";
    else if (forecastedDemandPoints.length > 0 && historicalDemandPoints.length === 0) title = "Latest Forecasted Demand Data";
    
    if (selectedItemId) title += ` (Item: ${selectedItemId})`;
    if (selectedStoreId) title += ` (Store: ${selectedStoreId})`;
    setDemandChartTitleState(title);

  }, [historicalDemandPoints, forecastedDemandPoints, selectedItemId, selectedStoreId]);

  // Effect for Price Data Chart (latest forecast)
  React.useEffect(() => {
    const dataMap = new Map<string, CombinedDataPoint>();
    const sortedHistoricalData = [...historicalPricePoints].sort((a, b) => {
      try {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (!isNaN(dateA) && !isNaN(dateB)) return dateA - dateB;
      } catch (e) { /* ignore */ }
      return a.date.localeCompare(b.date);
    });

    sortedHistoricalData.forEach(dp => {
      dataMap.set(dp.date, { date: dp.date, historical: dp.value });
    });

    forecastedPricePoints.forEach(dp => {
      const existing = dataMap.get(dp.date);
      if (existing) {
        dataMap.set(dp.date, { ...existing, forecasted: dp.value });
      } else {
        dataMap.set(dp.date, { date: dp.date, forecasted: dp.value });
      }
    });

    if (sortedHistoricalData.length > 0 && forecastedPricePoints.length > 0) {
      const lastHistoricalPoint = sortedHistoricalData[sortedHistoricalData.length - 1];
      const connectingPointData = dataMap.get(lastHistoricalPoint.date) || { date: lastHistoricalPoint.date };
      dataMap.set(lastHistoricalPoint.date, {
        ...connectingPointData,
        historical: lastHistoricalPoint.value,
        forecasted: lastHistoricalPoint.value,
      });
    }

    const finalSortedData = Array.from(dataMap.values()).sort((a, b) => {
      try {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (!isNaN(dateA) && !isNaN(dateB)) return dateA - dateB;
      } catch (e) { /* ignore */ }
      return a.date.localeCompare(b.date);
    });
    
    setCombinedPriceChartDataState(finalSortedData);
    
    let title = "Price Data Overview";
    if (historicalPricePoints.length > 0 && forecastedPricePoints.length === 0) title = "Historical Price Data";
    else if (forecastedPricePoints.length > 0 && historicalPricePoints.length > 0) title = "Price Overview: Historical & Latest Forecast";
    else if (forecastedPricePoints.length > 0 && historicalPricePoints.length === 0) title = "Latest Forecasted Price Data";

    if (selectedItemId) title += ` (Item: ${selectedItemId})`;
    if (selectedStoreId) title += ` (Store: ${selectedStoreId})`;
    setPriceChartTitleState(title);

  }, [historicalPricePoints, forecastedPricePoints, selectedItemId, selectedStoreId]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileNameState(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const csvContent = e.target?.result as string;
        setHistoricalDataCsvState(csvContent); 

        try {
          const items = extractUniqueColumnValues(csvContent, 'item_id');
          setAvailableItemIdsState(items);
          setSelectedItemIdState(undefined); 

          const stores = extractUniqueColumnValues(csvContent, 'store_id');
          setAvailableStoreIdsState(stores);
          setSelectedStoreIdState(undefined); 
          
          const initialDemandData = parseCsvForTimeSeries(csvContent, 'demand', undefined, undefined);
           if (initialDemandData.length === 0 && csvContent.trim() !== "") {
            toast({ title: "Warning (Demand Data)", description: "CSV parsed, but no 'timestamp' or 'demand' data found.", variant: "destructive" });
          }
          setHistoricalDemandPointsState(initialDemandData);
          
          const initialPriceData = parseCsvForTimeSeries(csvContent, 'price', undefined, undefined);
           if (initialPriceData.length === 0 && csvContent.trim() !== "") {
            toast({ title: "Warning (Price Data)", description: "CSV parsed, but no 'timestamp' or 'price' data found.", variant: "destructive" });
          }
          setHistoricalPricePointsState(initialPriceData);

          // Reset forecast related states
          setForecastedDemandPointsState([]);
          setForecastedPricePointsState([]);
          setLatestForecastOutputState(null);
          setGeneratedScenariosState([]); // Clear previous scenarios when new data is uploaded
          setMultiScenarioSummaryState(null);
          setScenarioNameState(`Scenario ${generatedScenarios.length + 1}`);


        } catch (error) {
           toast({ title: "Error Processing CSV", description: (error as Error).message, variant: "destructive" });
            setAvailableItemIdsState([]);
            setAvailableStoreIdsState([]);
            setHistoricalDemandPointsState([]);
            setHistoricalPricePointsState([]);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleGenerateForecast = async () => {
    if (!historicalDataCsv) {
      toast({ title: "Error", description: "Please upload historical data first.", variant: "destructive" });
      return;
    }
    if (!scenarioName.trim()) {
      toast({ title: "Error", description: "Please enter a scenario name.", variant: "destructive" });
      return;
    }
    if (!priceChangeDescription.trim()) {
      toast({ title: "Error", description: "Please enter a price change scenario description.", variant: "destructive" });
      return;
    }
    if (!forecastLength.trim()) {
      toast({ title: "Error", description: "Please enter a forecast length.", variant: "destructive" });
      return;
    }

    setIsGeneratingForecastState(true);
    setLatestForecastOutputState(null); 
    setForecastedDemandPointsState([]); 
    setForecastedPricePointsState([]);
    setMultiScenarioSummaryState(null); // Clear previous multi-summary

    const currentInputs: ScenarioForecastInput = {
      historicalData: historicalDataCsv, 
      priceChangeScenario: priceChangeDescription,
      forecastLength: forecastLength
    };

    const result = await generateForecastAction(currentInputs);

    if ("error" in result) {
      toast({ title: "Forecast Generation Failed", description: result.error, variant: "destructive" });
    } else {
      setLatestForecastOutputState(result);
      try {
        const parsedForecastDemand = parseCsvForTimeSeries(result.forecastedData, 'demand');
         if (parsedForecastDemand.length === 0 && result.forecastedData.trim() !== "") {
            toast({ title: "Warning (Forecast Demand)", description: "Forecast CSV parsed, but no valid demand data points found.", variant: "destructive" });
          }
        setForecastedDemandPointsState(parsedForecastDemand);

        const parsedForecastPrice = parseCsvForTimeSeries(result.forecastedData, 'price');
         if (parsedForecastPrice.length === 0 && result.forecastedData.trim() !== "") {
            toast({ title: "Warning (Forecast Price)", description: "Forecast CSV parsed, but no valid price data points found.", variant: "destructive" });
          }
        setForecastedPricePointsState(parsedForecastPrice);
        
        // Add to generated scenarios
        const newGeneratedScenario: GeneratedScenario = {
          id: new Date().toISOString() + Math.random().toString(), // simple unique id
          name: scenarioName,
          priceChangeDescription: priceChangeDescription,
          forecastLength: forecastLength,
          apiOutput: result,
        };
        setGeneratedScenariosState(prevScenarios => [...prevScenarios, newGeneratedScenario]);
        setScenarioNameState(`Scenario ${generatedScenarios.length + 2}`); // Prepare for next scenario
        setPriceChangeDescriptionState(""); // Optionally clear for next input


        toast({ title: "Success", description: `Forecast for "${newGeneratedScenario.name}" generated successfully!` });

      } catch (error) {
        toast({ title: "Error Parsing Forecast CSV", description: (error as Error).message, variant: "destructive" });
        setForecastedDemandPointsState([]);
        setForecastedPricePointsState([]);
      }
    }
    setIsGeneratingForecastState(false);
  };
  
  const handleSummarizeAllScenarios = async () => {
    if (generatedScenarios.length === 0) {
      toast({ title: "No Scenarios", description: "Please generate at least one scenario to summarize.", variant: "destructive" });
      return;
    }
    setIsSummarizingState(true);
    setMultiScenarioSummaryState(null);

    const scenariosForSummary: SummarizeScenarioResultsInput['scenarios'] = generatedScenarios.map(gs => ({
      scenarioName: gs.name,
      details: gs.apiOutput.summary,
      // projectedRevenueChange and potentialStockoutRisk are now optional in the flow
    }));

    const summaryResult = await summarizeResultsAction({ scenarios: scenariosForSummary });

    if ("error" in summaryResult) {
      toast({ title: "Scenario Summarization Failed", description: summaryResult.error, variant: "destructive" });
    } else {
      setMultiScenarioSummaryState(summaryResult);
      toast({ title: "Success", description: "All generated scenarios have been summarized." });
    }
    setIsSummarizingState(false);
  };


  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-background">
      <header className="w-full max-w-6xl mb-8">
        <Logo />
        <p className="text-muted-foreground mt-2">
          Leverage AI to understand the impact of price changes on demand and price evolution.
        </p>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center"><UploadCloud className="mr-2 h-6 w-6 text-primary" /> Upload Historical Data</CardTitle>
              <CardDescription>Upload CSV: 'timestamp', 'item_id', 'store_id', 'demand', 'price'.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="csv-upload">CSV File</Label>
                <Input id="csv-upload" type="file" accept=".csv" onChange={handleFileChange} className="text-sm file:mr-2 file:py-1.5 file:px-2 file:rounded-full file:border-0 file:text-xs file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                {fileName && <p className="text-xs text-muted-foreground">Uploaded: {fileName}</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center"><Filter className="mr-2 h-5 w-5 text-primary" /> Filter Historical Data View</CardTitle>
              <CardDescription>Select item/store to filter charts. Forecast applies to the entire dataset.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="item-select">Item ID</Label>
                <Select value={selectedItemId || "all"} onValueChange={(value) => setSelectedItemIdState(value === "all" ? undefined : value)} disabled={availableItemIds.length === 0}>
                  <SelectTrigger id="item-select">
                    <SelectValue placeholder="All Items" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Items</SelectItem>
                    {availableItemIds.map(id => <SelectItem key={id} value={id}>{id}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="store-select">Store ID</Label>
                <Select value={selectedStoreId || "all"} onValueChange={(value) => setSelectedStoreIdState(value === "all" ? undefined : value)} disabled={availableStoreIds.length === 0}>
                  <SelectTrigger id="store-select">
                    <SelectValue placeholder="All Stores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stores</SelectItem>
                    {availableStoreIds.map(id => <SelectItem key={id} value={id}>{id}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center"><Lightbulb className="mr-2 h-6 w-6 text-primary" /> Define & Generate Scenario</CardTitle>
              <CardDescription>Specify details for a new forecast scenario.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="scenario-name">Scenario Name</Label>
                <Input
                  id="scenario-name"
                  value={scenarioName}
                  onChange={(e) => setScenarioNameState(e.target.value)}
                  placeholder="e.g., Q4 Price Increase"
                />
              </div>
              <div>
                <Label htmlFor="price-change-description">Price Change Description</Label>
                <Textarea
                  id="price-change-description"
                  value={priceChangeDescription}
                  onChange={(e) => setPriceChangeDescriptionState(e.target.value)}
                  placeholder="e.g., A 10% increase in price for product X."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="forecast-length" className="flex items-center">
                  <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                  Forecast Length
                </Label>
                <Input
                  id="forecast-length"
                  value={forecastLength}
                  onChange={(e) => setForecastLengthState(e.target.value)}
                  placeholder="e.g., next 30 days, 1 quarter"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleGenerateForecast} disabled={isGeneratingForecast || !historicalDataCsv} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                {isGeneratingForecast ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LineChart className="mr-2 h-4 w-4" />}
                Generate & Add Scenario
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center"><LineChart className="mr-2 h-6 w-6 text-primary" /> Demand Visualization</CardTitle>
               <CardDescription>Shows historical demand and the latest generated forecast.</CardDescription>
            </CardHeader>
            <CardContent>
              <TimeSeriesChart data={combinedDemandChartData} title={demandChartTitle} />
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center"><DollarSign className="mr-2 h-6 w-6 text-primary" /> Price Visualization</CardTitle>
              <CardDescription>Shows historical prices and the latest generated forecast.</CardDescription>
            </CardHeader>
            <CardContent>
              <TimeSeriesChart data={combinedPriceChartData} title={priceChartTitle} />
            </CardContent>
          </Card>

          {latestForecastOutput && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center"><FileText className="mr-2 h-6 w-6 text-primary" /> Latest Forecast Summary</CardTitle>
                <CardDescription>AI-generated summary for the most recent scenario: "{generatedScenarios[generatedScenarios.length-1]?.name || 'Current'}"</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{latestForecastOutput.summary}</p>
              </CardContent>
            </Card>
          )}
          
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center"><History className="mr-2 h-6 w-6 text-primary" /> Scenario History & Bulk Summary</CardTitle>
              <CardDescription>Review past scenarios and generate a collective summary.</CardDescription>
            </CardHeader>
            <CardContent>
              {generatedScenarios.length === 0 ? (
                <p className="text-sm text-muted-foreground">No scenarios generated yet. Define and generate a scenario to see its history here.</p>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {generatedScenarios.map((scenario, index) => (
                    <AccordionItem value={`item-${index}`} key={scenario.id}>
                      <AccordionTrigger className="text-sm font-medium">
                        {index + 1}. {scenario.name}
                      </AccordionTrigger>
                      <AccordionContent className="space-y-2 text-xs">
                        <p><strong>Description:</strong> {scenario.priceChangeDescription}</p>
                        <p><strong>Forecast Length:</strong> {scenario.forecastLength}</p>
                        <p className="font-semibold mt-1">AI Summary:</p>
                        <p className="whitespace-pre-wrap text-muted-foreground bg-muted/50 p-2 rounded-md">{scenario.apiOutput.summary || "No summary provided."}</p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
            <CardFooter className="flex-col items-stretch space-y-4">
               <Button 
                onClick={handleSummarizeAllScenarios} 
                disabled={isSummarizing || generatedScenarios.length === 0} 
                className="w-full"
              >
                {isSummarizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListChecks className="mr-2 h-4 w-4" />}
                Summarize All Generated Scenarios
              </Button>
              {multiScenarioSummary && (
                <div className="mt-4 p-4 border-t">
                  <h4 className="font-semibold text-lg mb-2">Collective Scenario Analysis:</h4>
                  <div className="space-y-3">
                    <div>
                      <h5 className="font-semibold">Overall Summary:</h5>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{multiScenarioSummary.summary}</p>
                    </div>
                    <div>
                      <h5 className="font-semibold">Most Promising Scenario/Aspect:</h5>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{multiScenarioSummary.mostPromisingScenario}</p>
                    </div>
                    <div>
                      <h5 className="font-semibold">Riskiest Scenario/Aspect:</h5>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{multiScenarioSummary.riskiestScenario}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardFooter>
          </Card>


          {(isGeneratingForecast || isSummarizing) && !latestForecastOutput && !multiScenarioSummary && (
            <div className="flex items-center justify-center p-4 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 
              {isGeneratingForecast ? "Generating forecast..." : "Summarizing scenarios..."}
            </div>
          )}
        </div>
      </main>
       <footer className="w-full max-w-6xl mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} ScenarioSage. Powered by Firebase Studio.</p>
      </footer>
    </div>
  );
};

export default ScenarioSagePage;
    

