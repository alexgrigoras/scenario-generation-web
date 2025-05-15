
"use client";

import type React from 'react';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, Lightbulb, LineChart, FileText, Loader2 } from "lucide-react";
import Logo from "@/components/logo";
import TimeSeriesChart from "@/components/time-series-chart";
import { parseCsvForTimeSeries, type TimeSeriesDataPoint } from "@/lib/csv-parser";
import { generateForecastAction, summarizeResultsAction } from "./actions";
import type { ScenarioForecastOutput } from '@/ai/flows/generate-scenario-forecast';
import type { SummarizeScenarioResultsInput, SummarizeScenarioResultsOutput } from '@/ai/flows/summarize-scenario-results';

export default function ScenarioSagePage() {
  const { toast } = useToast();

  const [historicalDataCsv, setHistoricalDataCsv] = useState<string | null>(null);
  const [historicalDataPoints, setHistoricalDataPoints] = useState<TimeSeriesDataPoint[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  const [scenarioName, setScenarioName] = useState<string>("Default Scenario");
  const [priceChangeDescription, setPriceChangeDescription] = useState<string>("");
  
  const [forecastOutput, setForecastOutput] = useState<ScenarioForecastOutput | null>(null);
  const [forecastedDataPoints, setForecastedDataPoints] = useState<TimeSeriesDataPoint[]>([]);
  
  const [scenarioSummary, setScenarioSummary] = useState<SummarizeScenarioResultsOutput | null>(null);
  
  const [isGeneratingForecast, setIsGeneratingForecast] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const csvContent = e.target?.result as string;
        setHistoricalDataCsv(csvContent);
        try {
          const parsedData = parseCsvForTimeSeries(csvContent, 'demand');
          if (parsedData.length === 0 && csvContent.trim() !== "") {
            toast({ title: "Warning", description: "CSV parsed, but no valid data points found. Check headers: 'timestamp', 'demand'.", variant: "destructive" });
          }
          setHistoricalDataPoints(parsedData);
        } catch (error) {
          toast({ title: "Error Parsing CSV", description: (error as Error).message, variant: "destructive" });
          setHistoricalDataPoints([]);
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

    setIsGeneratingForecast(true);
    setForecastOutput(null);
    setForecastedDataPoints([]);

    const result = await generateForecastAction({ historicalData: historicalDataCsv, priceChangeScenario: priceChangeDescription });

    if ("error" in result) {
      toast({ title: "Forecast Generation Failed", description: result.error, variant: "destructive" });
    } else {
      setForecastOutput(result);
      try {
        // Assuming forecast CSV also uses 'timestamp' for date and 'demand' for value
        const parsedForecast = parseCsvForTimeSeries(result.forecastedData, 'demand');
         if (parsedForecast.length === 0 && result.forecastedData.trim() !== "") {
            toast({ title: "Warning", description: "Forecast CSV parsed, but no valid data points found. Check AI output format. Expected columns: 'timestamp', 'demand'.", variant: "destructive" });
          }
        setForecastedDataPoints(parsedForecast);
        toast({ title: "Success", description: "Forecast generated successfully!" });

        // Automatically try to summarize this single forecast
        handleSummarizeSingleScenario(result.summary || "No summary provided by AI.");

      } catch (error) {
        toast({ title: "Error Parsing Forecast CSV", description: (error as Error).message, variant: "destructive" });
        setForecastedDataPoints([]);
      }
    }
    setIsGeneratingForecast(false);
  };
  
  // Helper to use summarizeScenarioResults with the current forecast
  const handleSummarizeSingleScenario = async (forecastDetails: string) => {
    setIsSummarizing(true);
    const singleScenarioForSummary: SummarizeScenarioResultsInput = {
      scenarios: [
        {
          scenarioName: scenarioName,
          projectedRevenueChange: 0, // Placeholder - AI flow doesn't provide this
          potentialStockoutRisk: "N/A", // Placeholder
          details: forecastDetails,
        },
      ],
    };

    const summaryResult = await summarizeResultsAction(singleScenarioForSummary);
    if ("error" in summaryResult) {
      toast({ title: "Scenario Summary Failed", description: summaryResult.error, variant: "destructive" });
      setScenarioSummary(null);
    } else {
      setScenarioSummary(summaryResult);
       toast({ title: "Info", description: "Single scenario analysis generated." });
    }
    setIsSummarizing(false);
  };


  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-background">
      <header className="w-full max-w-6xl mb-8">
        <Logo />
        <p className="text-muted-foreground mt-2">
          Leverage AI to understand the impact of price changes on demand.
        </p>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Data Upload & Scenario Input */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center"><UploadCloud className="mr-2 h-6 w-6 text-primary" /> Upload Historical Data</CardTitle>
              <CardDescription>Upload your historical data in CSV format. Ensure columns 'timestamp', 'item_id', 'store_id', 'demand', and 'price' exist.</CardDescription>
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
              <CardTitle className="flex items-center"><Lightbulb className="mr-2 h-6 w-6 text-primary" /> Define Scenario</CardTitle>
              <CardDescription>Specify the price change scenario you want to model.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="scenario-name">Scenario Name</Label>
                <Input 
                  id="scenario-name" 
                  value={scenarioName} 
                  onChange={(e) => setScenarioName(e.target.value)} 
                  placeholder="e.g., Q4 Price Increase" 
                />
              </div>
              <div>
                <Label htmlFor="price-change-description">Price Change Description</Label>
                <Textarea
                  id="price-change-description"
                  value={priceChangeDescription}
                  onChange={(e) => setPriceChangeDescription(e.target.value)}
                  placeholder="e.g., A 10% increase in price for product X starting next month."
                  rows={3}
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

        {/* Column 2: Visualization & Summaries */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center"><LineChart className="mr-2 h-6 w-6 text-primary" /> Data Visualization</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="initial" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="initial">Initial Demand</TabsTrigger>
                  <TabsTrigger value="forecasted" disabled={forecastedDataPoints.length === 0}>Forecasted Demand</TabsTrigger>
                </TabsList>
                <TabsContent value="initial">
                  {/* The TimeSeriesChart expects 'date' in its data points, which our updated parser still provides */}
                  <TimeSeriesChart data={historicalDataPoints} title="Historical Demand Data" barColor="hsl(var(--chart-1))" />
                </TabsContent>
                <TabsContent value="forecasted">
                  <TimeSeriesChart data={forecastedDataPoints} title="Forecasted Demand Data" barColor="hsl(var(--chart-2))" />
                </TabsContent>
              </Tabs>
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
          {(isSummarizing) && (
            <div className="flex items-center justify-center p-4 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing scenario...
            </div>
          )}
        </div>
      </main>
       <footer className="w-full max-w-6xl mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} ScenarioSage. Powered by Firebase Studio.</p>
      </footer>
    </div>
  );
}
