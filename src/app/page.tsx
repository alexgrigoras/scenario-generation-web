
"use client";

import React from 'react';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadCloud, Lightbulb, LineChart, FileText, Loader2, CalendarDays, DollarSign, Filter } from "lucide-react";

import Logo from "@/components/logo";
import TimeSeriesChart, { type CombinedDataPoint } from "@/components/time-series-chart";
import { useToast } from "@/hooks/use-toast";
import { parseCsvForTimeSeries, extractUniqueColumnValues, type TimeSeriesDataPoint } from "@/lib/csv-parser";
import { generateForecastAction, summarizeResultsAction } from "./actions";
import type { ScenarioForecastOutput } from '@/ai/flows/generate-scenario-forecast';
import type { SummarizeScenarioResultsInput, SummarizeScenarioResultsOutput } from '@/ai/flows/summarize-scenario-results';

const ScenarioSagePage: React.FC = () => {
  const { toast } = useToast();

  const [historicalDataCsv, setHistoricalDataCsvState] = React.useState<string | null>(null);
  const [fileName, setFileNameState] = React.useState<string | null>(null);

  // Item and Store Filters
  const [availableItemIds, setAvailableItemIdsState] = React.useState<string[]>([]);
  const [selectedItemId, setSelectedItemIdState] = React.useState<string | undefined>(undefined);
  const [availableStoreIds, setAvailableStoreIdsState] = React.useState<string[]>([]);
  const [selectedStoreId, setSelectedStoreIdState] = React.useState<string | undefined>(undefined);

  // Demand Data
  const [historicalDemandPoints, setHistoricalDemandPointsState] = React.useState<TimeSeriesDataPoint[]>([]);
  const [forecastedDemandPoints, setForecastedDemandPointsState] = React.useState<TimeSeriesDataPoint[]>([]);
  const [combinedDemandChartData, setCombinedDemandChartDataState] = React.useState<CombinedDataPoint[]>([]);
  const [demandChartTitle, setDemandChartTitleState] = React.useState<string>("Demand Data Overview");

  // Price Data
  const [historicalPricePoints, setHistoricalPricePointsState] = React.useState<TimeSeriesDataPoint[]>([]);
  const [forecastedPricePoints, setForecastedPricePointsState] = React.useState<TimeSeriesDataPoint[]>([]);
  const [combinedPriceChartData, setCombinedPriceChartDataState] = React.useState<CombinedDataPoint[]>([]);
  const [priceChartTitle, setPriceChartTitleState] = React.useState<string>("Price Data Overview");

  const [scenarioName, setScenarioNameState] = React.useState<string>("Default Scenario");
  const [priceChangeDescription, setPriceChangeDescriptionState] = React.useState<string>("");
  const [forecastLength, setForecastLengthState] = React.useState<string>("next 30 periods");

  const [forecastOutput, setForecastOutputState] = React.useState<ScenarioForecastOutput | null>(null);
  const [scenarioSummary, setScenarioSummaryState] = React.useState<SummarizeScenarioResultsOutput | null>(null);

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

        // Clear forecast when historical filters change, as forecast is for the whole dataset
        // but only if a filter is active, otherwise we keep the forecast to compare against different filtered views
        if(selectedItemId || selectedStoreId){
          setForecastedDemandPointsState([]);
          setForecastedPricePointsState([]);
          // setForecastOutputState(null); // Keep output summary
        }

      } catch (error) {
        toast({ title: "Error Parsing Filtered CSV", description: (error as Error).message, variant: "destructive" });
        setHistoricalDemandPointsState([]);
        setHistoricalPricePointsState([]);
      }
    }
  }, [historicalDataCsv, selectedItemId, selectedStoreId, toast]);


  // Effect for Demand Data Chart
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
    else if (forecastedDemandPoints.length > 0 && historicalDemandPoints.length > 0) title = "Demand Overview: Historical & Forecasted";
    else if (forecastedDemandPoints.length > 0 && historicalDemandPoints.length === 0) title = "Forecasted Demand Data";
    
    if (selectedItemId) title += ` (Item: ${selectedItemId})`;
    if (selectedStoreId) title += ` (Store: ${selectedStoreId})`;
    setDemandChartTitleState(title);

  }, [historicalDemandPoints, forecastedDemandPoints, selectedItemId, selectedStoreId]);

  // Effect for Price Data Chart
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
    else if (forecastedPricePoints.length > 0 && historicalPricePoints.length > 0) title = "Price Overview: Historical & Forecasted";
    else if (forecastedPricePoints.length > 0 && historicalPricePoints.length === 0) title = "Forecasted Price Data";

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
          setSelectedItemIdState(undefined); // Default to all items

          const stores = extractUniqueColumnValues(csvContent, 'store_id');
          setAvailableStoreIdsState(stores);
          setSelectedStoreIdState(undefined); // Default to all stores
          
          // Initial parse (useEffect will handle further parsing based on filters)
          const initialDemandData = parseCsvForTimeSeries(csvContent, 'demand', undefined, undefined);
           if (initialDemandData.length === 0 && csvContent.trim() !== "") {
            toast({ title: "Warning (Demand Data)", description: "CSV parsed, but no 'timestamp' or 'demand' data found. Check headers and content.", variant: "destructive" });
          }
          setHistoricalDemandPointsState(initialDemandData);
          
          const initialPriceData = parseCsvForTimeSeries(csvContent, 'price', undefined, undefined);
           if (initialPriceData.length === 0 && csvContent.trim() !== "") {
            toast({ title: "Warning (Price Data)", description: "CSV parsed, but no 'timestamp' or 'price' data found. Check headers and content.", variant: "destructive" });
          }
          setHistoricalPricePointsState(initialPriceData);

          setForecastedDemandPointsState([]);
          setForecastedPricePointsState([]);
          setForecastOutputState(null);
          setScenarioSummaryState(null);

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
    if (!priceChangeDescription.trim()) {
      toast({ title: "Error", description: "Please enter a price change scenario description.", variant: "destructive" });
      return;
    }
    if (!forecastLength.trim()) {
      toast({ title: "Error", description: "Please enter a forecast length.", variant: "destructive" });
      return;
    }

    setIsGeneratingForecastState(true);
    setForecastOutputState(null);
    // When generating a new forecast, it's based on the *entire* dataset.
    // So, we should clear any existing item/store specific forecasted points.
    setForecastedDemandPointsState([]);
    setForecastedPricePointsState([]);


    // Reset historical data to unfiltered for forecast generation context if needed by AI.
    // Currently, the AI takes the full CSV, so local filtering doesn't affect its input.
    // However, ensure the historical display reflects the current filter.
    // The useEffect for historical data already handles filtering for display.

    const result = await generateForecastAction({
      historicalData: historicalDataCsv, 
      priceChangeScenario: priceChangeDescription,
      forecastLength: forecastLength
    });

    if ("error" in result) {
      toast({ title: "Forecast Generation Failed", description: result.error, variant: "destructive" });
    } else {
      setForecastOutputState(result);
      try {
        // The AI's forecastedData CSV should contain 'timestamp', 'price', and 'demand'.
        // This forecast is for the *entire* dataset, not filtered by item/store.
        const parsedForecastDemand = parseCsvForTimeSeries(result.forecastedData, 'demand');
         if (parsedForecastDemand.length === 0 && result.forecastedData.trim() !== "") {
            toast({ title: "Warning (Forecast Demand)", description: "Forecast CSV parsed, but no valid demand data points found. Expected columns: 'timestamp', 'demand'.", variant: "destructive" });
          }
        setForecastedDemandPointsState(parsedForecastDemand);

        const parsedForecastPrice = parseCsvForTimeSeries(result.forecastedData, 'price');
         if (parsedForecastPrice.length === 0 && result.forecastedData.trim() !== "") {
            toast({ title: "Warning (Forecast Price)", description: "Forecast CSV parsed, but no valid price data points found. Expected columns: 'timestamp', 'price'.", variant: "destructive" });
          }
        setForecastedPricePointsState(parsedForecastPrice);

        toast({ title: "Success", description: "Forecast generated successfully!" });
        handleSummarizeSingleScenario(result.summary || "No summary provided by AI.");

      } catch (error) {
        toast({ title: "Error Parsing Forecast CSV", description: (error as Error).message, variant: "destructive" });
        setForecastedDemandPointsState([]);
        setForecastedPricePointsState([]);
      }
    }
    setIsGeneratingForecastState(false);
  };

  const handleSummarizeSingleScenario = async (forecastDetails: string) => {
    setIsSummarizingState(true);
    const singleScenarioForSummary: SummarizeScenarioResultsInput = {
      scenarios: [
        {
          scenarioName: scenarioName,
          projectedRevenueChange: 0, // Placeholder, AI summary focuses on qualitative text
          potentialStockoutRisk: "N/A", // Placeholder
          details: forecastDetails,
        },
      ],
    };

    const summaryResult = await summarizeResultsAction(singleScenarioForSummary);
    if ("error" in summaryResult) {
      toast({ title: "Scenario Summary Failed", description: summaryResult.error, variant: "destructive" });
      setScenarioSummaryState(null);
    } else {
      setScenarioSummaryState(summaryResult);
       toast({ title: "Info", description: "Single scenario analysis generated." });
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
              <CardTitle className="flex items-center"><Filter className="mr-2 h-5 w-5 text-primary" /> Filter Historical Data</CardTitle>
              <CardDescription>Select item and store to filter the historical charts. Forecast applies to the entire dataset.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="item-select">Item ID</Label>
                <Select value={selectedItemId || "all"} onValueChange={(value) => setSelectedItemIdState(value === "all" ? undefined : value)}>
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
                <Select value={selectedStoreId || "all"} onValueChange={(value) => setSelectedStoreIdState(value === "all" ? undefined : value)}>
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
              <CardTitle className="flex items-center"><Lightbulb className="mr-2 h-6 w-6 text-primary" /> Define Scenario</CardTitle>
              <CardDescription>Specify the scenario details for forecasting.</CardDescription>
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
                  placeholder="e.g., A 10% increase in price for product X starting next month."
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
                Generate Forecast
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center"><LineChart className="mr-2 h-6 w-6 text-primary" /> Demand Visualization</CardTitle>
            </CardHeader>
            <CardContent>
              <TimeSeriesChart data={combinedDemandChartData} title={demandChartTitle} />
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center"><DollarSign className="mr-2 h-6 w-6 text-primary" /> Price Visualization</CardTitle>
            </CardHeader>
            <CardContent>
              <TimeSeriesChart data={combinedPriceChartData} title={priceChartTitle} />
            </CardContent>
          </Card>

          {forecastOutput && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center"><FileText className="mr-2 h-6 w-6 text-primary" /> Forecast Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{forecastOutput.summary}</p>
              </CardContent>
            </Card>
          )}

          {scenarioSummary && (
             <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center"><FileText className="mr-2 h-6 w-6 text-primary" /> Scenario Analysis</CardTitle>
                 <CardDescription>Summary of the analyzed scenario.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <h4 className="font-semibold">Overall Summary:</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{scenarioSummary.summary}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Most Promising Aspect:</h4>
                   <p className="text-sm text-muted-foreground whitespace-pre-wrap">{scenarioSummary.mostPromisingScenario}</p>
                </div>
                 <div>
                  <h4 className="font-semibold">Riskiest Aspect:</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{scenarioSummary.riskiestScenario}</p>
                </div>
              </CardContent>
            </Card>
          )}
          {(isGeneratingForecast || isSummarizing) && (
            <div className="flex items-center justify-center p-4 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 
              {isGeneratingForecast ? "Generating forecast..." : "Analyzing scenario..."}
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
    
