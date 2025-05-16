
"use client";

import * as React from 'react';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { UploadCloud, Lightbulb, LineChart, FileText, Loader2, CalendarDays, DollarSign, Filter, ListChecks, History, Edit3 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";


import Logo from "@/components/logo";
import TimeSeriesChart from "@/components/time-series-chart";
import type { ChartConfig } from '@/components/ui/chart';
import { useToast } from "@/hooks/use-toast";
import { parseCsvForTimeSeries, extractUniqueColumnValues, detectTimeSeriesFrequency, type TimeSeriesDataPoint } from "@/lib/csv-parser";
import { generateForecastAction, summarizeResultsAction } from "./actions";
import type { ScenarioForecastInput, ScenarioForecastOutput } from '@/ai/flows/generate-scenario-forecast';
import type { SummarizeScenarioResultsInput, SummarizeScenarioResultsOutput } from '@/ai/flows/summarize-scenario-results';

interface GeneratedScenario {
  id: string;
  name: string;
  priceChangeDescription: string;
  forecastLength: string; 
  apiOutput: ScenarioForecastOutput;
  isCustomPriceScenario?: boolean;
}

interface MultiScenarioChartDataPoint {
  date: string;
  historical?: number | null;
  [scenarioIdKey: string]: number | string | null | undefined; 
}

interface EditablePricePoint {
  date: string;
  price: number;
}


const ScenarioSagePage: React.FC = () => {
  const { toast } = useToast();

  const [historicalDataCsv, setHistoricalDataCsvState] = React.useState<string | null>(null);
  const [fileName, setFileNameState] = React.useState<string | null>(null);

  const [availableItemIds, setAvailableItemIdsState] = React.useState<string[]>([]);
  const [selectedItemId, setSelectedItemIdState] = React.useState<string | undefined>(undefined);
  const [availableStoreIds, setAvailableStoreIdsState] = React.useState<string[]>([]);
  const [selectedStoreId, setSelectedStoreIdState] = React.useState<string | undefined>(undefined);

  const [historicalDemandPoints, setHistoricalDemandPointsState] = React.useState<TimeSeriesDataPoint[]>([]);
  const [combinedDemandChartData, setCombinedDemandChartDataState] = React.useState<MultiScenarioChartDataPoint[]>([]);
  const [demandChartConfig, setDemandChartConfigState] = React.useState<ChartConfig>({});
  const [demandChartTitle, setDemandChartTitleState] = React.useState<string>("Demand Data Overview");

  const [historicalPricePoints, setHistoricalPricePointsState] = React.useState<TimeSeriesDataPoint[]>([]);
  const [combinedPriceChartData, setCombinedPriceChartDataState] = React.useState<MultiScenarioChartDataPoint[]>([]);
  const [priceChartConfig, setPriceChartConfigState] = React.useState<ChartConfig>({});
  const [priceChartTitle, setPriceChartTitleState] = React.useState<string>("Price Data Overview");

  const [scenarioName, setScenarioNameState] = React.useState<string>("Scenario 1");
  const [priceChangeDescription, setPriceChangeDescriptionState] = React.useState<string>("");
  const [forecastLengthInput, setForecastLengthInputState] = React.useState<number>(30); 
  const [maxForecastLength, setMaxForecastLengthState] = React.useState<number>(100); 
  const [detectedFrequency, setDetectedFrequencyState] = React.useState<'days' | 'months' | 'unknown'>('days');
  
  const [generatedScenarios, setGeneratedScenariosState] = React.useState<GeneratedScenario[]>([]);
  const [multiScenarioSummary, setMultiScenarioSummaryState] = React.useState<SummarizeScenarioResultsOutput | null>(null);

  const [isGeneratingForecast, setIsGeneratingForecastState] = React.useState(false);
  const [isSummarizing, setIsSummarizingState] = React.useState(false);

  const [editingScenario, setEditingScenarioState] = React.useState<GeneratedScenario | null>(null);
  const [editablePrices, setEditablePricesState] = React.useState<EditablePricePoint[]>([]);
  const [isReForecasting, setIsReForecastingState] = React.useState(false);


  React.useEffect(() => {
    if (historicalDataCsv) {
      try {
        const demandData = parseCsvForTimeSeries(historicalDataCsv, 'demand', selectedItemId, selectedStoreId);
        setHistoricalDemandPointsState(demandData);

        const priceData = parseCsvForTimeSeries(historicalDataCsv, 'price', selectedItemId, selectedStoreId);
        setHistoricalPricePointsState(priceData);

        const frequency = detectTimeSeriesFrequency(demandData.length > 0 ? demandData : priceData);
        setDetectedFrequencyState(frequency);

        const newMax = demandData.length > 0 ? demandData.length : (priceData.length > 0 ? priceData.length : 100) ;
        setMaxForecastLengthState(newMax);
        setForecastLengthInputState(prev => Math.max(1, Math.min(prev, newMax)));


      } catch (error) {
        toast({ title: "Error Parsing Filtered CSV", description: (error as Error).message, variant: "destructive" });
        setHistoricalDemandPointsState([]);
        setHistoricalPricePointsState([]);
        setMaxForecastLengthState(100); 
        setForecastLengthInputState(30); 
        setDetectedFrequencyState('days');
      }
    } else {
      setHistoricalDemandPointsState([]);
      setHistoricalPricePointsState([]);
      setMaxForecastLengthState(100);
      setForecastLengthInputState(30);
      setAvailableItemIdsState([]);
      setSelectedItemIdState(undefined);
      setAvailableStoreIdsState([]);
      setSelectedStoreIdState(undefined);
      setDetectedFrequencyState('days');
    }
  }, [historicalDataCsv, selectedItemId, selectedStoreId, toast]);

  React.useEffect(() => {
    const newDemandChartConfig: ChartConfig = {
      historical: { label: "Historical Demand", color: "hsl(var(--chart-1))" },
    };
    const newPriceChartConfig: ChartConfig = {
      historical: { label: "Historical Price", color: "hsl(var(--chart-1))" },
    };

    function getScenarioColorTheme(index: number): { theme: Record<'light' | 'dark', string> } {
      const baseHue = 190; 
      const hueIncrement = 40; 
      const saturationLight = 70;
      const lightnessLight = 50;
      const saturationDark = 65;
      const lightnessDark = 65;
      
      const currentHue = (baseHue + index * hueIncrement) % 360;
      const lightColor = `hsl(${currentHue}, ${saturationLight}%, ${lightnessLight}%)`; 
      const darkColor = `hsl(${currentHue}, ${saturationDark}%, ${lightnessDark}%)`;  
      return { theme: { light: lightColor, dark: darkColor } };
    }

    generatedScenarios.forEach((scenario, index) => {
      const scenarioColorTheme = getScenarioColorTheme(index);
      const labelSuffix = scenario.isCustomPriceScenario ? " (Custom Prices)" : "";
      newDemandChartConfig[scenario.id] = { 
        label: `${scenario.name}${labelSuffix} (Demand)`, 
        ...scenarioColorTheme 
      };
      newPriceChartConfig[scenario.id] = { 
        label: `${scenario.name}${labelSuffix} (Price)`, 
        ...scenarioColorTheme 
      };
    });

    setDemandChartConfigState(newDemandChartConfig);
    setPriceChartConfigState(newPriceChartConfig);

  }, [generatedScenarios]);


  React.useEffect(() => {
    const dataMap = new Map<string, MultiScenarioChartDataPoint>();
    const sortedHistoricalData = [...historicalDemandPoints].sort((a, b) => {
      try {
        const dateAVal = new Date(a.date).getTime();
        const dateBVal = new Date(b.date).getTime();
        if (!isNaN(dateAVal) && !isNaN(dateBVal)) return dateAVal - dateBVal;
      } catch (e) { /* ignore date parsing errors for sort, rely on string compare */ }
      return a.date.localeCompare(b.date);
    });

    sortedHistoricalData.forEach(dp => {
      dataMap.set(dp.date, { date: dp.date, historical: dp.value });
    });
    
    const lastHistoricalPoint = sortedHistoricalData.length > 0 ? sortedHistoricalData[sortedHistoricalData.length - 1] : null;

    generatedScenarios.forEach(scenario => {
      try {
        const scenarioDemandPoints = parseCsvForTimeSeries(scenario.apiOutput.forecastedData, 'demand');
        scenarioDemandPoints.forEach(dp => {
          const existing = dataMap.get(dp.date) || { date: dp.date };
          dataMap.set(dp.date, { ...existing, [scenario.id]: dp.value });
        });

        if (lastHistoricalPoint && scenarioDemandPoints.length > 0) {
           const connectingPointData = dataMap.get(lastHistoricalPoint.date) || { date: lastHistoricalPoint.date };
            dataMap.set(lastHistoricalPoint.date, {
                ...connectingPointData,
                [scenario.id]: lastHistoricalPoint.value, 
            });
        }
      } catch (error) {
        console.error(`Error parsing forecast CSV for scenario ${scenario.name} (demand):`, error);
        toast({ title: `Error Parsing Forecast (Demand) for ${scenario.name}`, description: (error as Error).message, variant: "destructive" });
      }
    });
    
    const finalSortedData = Array.from(dataMap.values()).sort((a, b) => {
      try {
        const dateAVal = new Date(a.date).getTime();
        const dateBVal = new Date(b.date).getTime();
        if (!isNaN(dateAVal) && !isNaN(dateBVal)) return dateAVal - dateBVal;
      } catch (e) { /* ignore */ }
      return a.date.localeCompare(b.date);
    });
    
    setCombinedDemandChartDataState(finalSortedData);

    let title = "Demand Overview";
    if (generatedScenarios.length > 0) title += `: Historical & ${generatedScenarios.length} Forecast(s)`;
    else if (historicalDemandPoints.length > 0) title = "Historical Demand Data";
    if (selectedItemId) title += ` (Item: ${selectedItemId})`;
    if (selectedStoreId) title += ` (Store: ${selectedStoreId})`;
    setDemandChartTitleState(title);

  }, [historicalDemandPoints, generatedScenarios, selectedItemId, selectedStoreId, toast]);


  React.useEffect(() => {
    const dataMap = new Map<string, MultiScenarioChartDataPoint>();
     const sortedHistoricalData = [...historicalPricePoints].sort((a, b) => {
      try {
        const dateAVal = new Date(a.date).getTime();
        const dateBVal = new Date(b.date).getTime();
        if (!isNaN(dateAVal) && !isNaN(dateBVal)) return dateAVal - dateBVal;
      } catch (e) { /* ignore */ }
      return a.date.localeCompare(b.date);
    });

    sortedHistoricalData.forEach(dp => {
      dataMap.set(dp.date, { date: dp.date, historical: dp.value });
    });

    const lastHistoricalPoint = sortedHistoricalData.length > 0 ? sortedHistoricalData[sortedHistoricalData.length - 1] : null;

    generatedScenarios.forEach(scenario => {
      try {
        const scenarioPricePoints = parseCsvForTimeSeries(scenario.apiOutput.forecastedData, 'price');
        scenarioPricePoints.forEach(dp => {
          const existing = dataMap.get(dp.date) || { date: dp.date };
          dataMap.set(dp.date, { ...existing, [scenario.id]: dp.value });
        });
        
        if (lastHistoricalPoint && scenarioPricePoints.length > 0) {
            const connectingPointData = dataMap.get(lastHistoricalPoint.date) || { date: lastHistoricalPoint.date };
            dataMap.set(lastHistoricalPoint.date, {
                ...connectingPointData,
                [scenario.id]: lastHistoricalPoint.value, 
            });
        }
      } catch (error) {
        console.error(`Error parsing forecast CSV for scenario ${scenario.name} (price):`, error);
        toast({ title: `Error Parsing Forecast (Price) for ${scenario.name}`, description: (error as Error).message, variant: "destructive" });
      }
    });

    const finalSortedData = Array.from(dataMap.values()).sort((a, b) => {
      try {
        const dateAVal = new Date(a.date).getTime();
        const dateBVal = new Date(b.date).getTime();
        if (!isNaN(dateAVal) && !isNaN(dateBVal)) return dateAVal - dateBVal;
      } catch (e) { /* ignore */ }
      return a.date.localeCompare(b.date);
    });
    
    setCombinedPriceChartDataState(finalSortedData);
    
    let title = "Price Overview";
    if (generatedScenarios.length > 0) title += `: Historical & ${generatedScenarios.length} Forecast(s)`;
    else if (historicalPricePoints.length > 0) title = "Historical Price Data";
    if (selectedItemId) title += ` (Item: ${selectedItemId})`;
    if (selectedStoreId) title += ` (Store: ${selectedStoreId})`;
    setPriceChartTitleState(title);

  }, [historicalPricePoints, generatedScenarios, selectedItemId, selectedStoreId, toast]);


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
            toast({ title: "Warning (Demand Data)", description: "CSV parsed, but no 'timestamp' or 'demand' data found, or data could not be filtered as expected.", variant: "destructive" });
          }
          
          const initialPriceData = parseCsvForTimeSeries(csvContent, 'price', undefined, undefined);
           if (initialPriceData.length === 0 && csvContent.trim() !== "") {
            toast({ title: "Warning (Price Data)", description: "CSV parsed, but no 'timestamp' or 'price' data found, or data could not be filtered as expected.", variant: "destructive" });
          }
          
          setGeneratedScenariosState([]); 
          setMultiScenarioSummaryState(null);
          setScenarioNameState(`Scenario 1`);

        } catch (error) {
           toast({ title: "Error Processing CSV", description: (error as Error).message, variant: "destructive" });
            setHistoricalDataCsvState(null); 
            setAvailableItemIdsState([]);
            setAvailableStoreIdsState([]);
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
    if (forecastLengthInput < 1) {
      toast({ title: "Error", description: "Forecast length must be at least 1.", variant: "destructive" });
      return;
    }

    setIsGeneratingForecastState(true);
    setMultiScenarioSummaryState(null); 

    const freqUnit = detectedFrequency === 'unknown' ? 'periods' : detectedFrequency;
    const formattedForecastLength = `next ${forecastLengthInput} ${freqUnit}`;

    const currentInputs: ScenarioForecastInput = {
      historicalData: historicalDataCsv, 
      priceChangeScenario: priceChangeDescription,
      forecastLength: formattedForecastLength
    };

    const result = await generateForecastAction(currentInputs);

    if ("error" in result) {
      toast({ title: "Forecast Generation Failed", description: result.error, variant: "destructive" });
    } else {
      try {
        if (!result.forecastedData || result.forecastedData.trim() === "") {
             toast({ title: "Warning: Empty Forecast", description: "Forecast generated, but the output data is empty. Charts may not update.", variant: "destructive" });
        }
        
        const newGeneratedScenario: GeneratedScenario = {
          id: `scenario${generatedScenarios.length + 1}`, 
          name: scenarioName,
          priceChangeDescription: priceChangeDescription,
          forecastLength: formattedForecastLength, 
          apiOutput: result,
        };
        setGeneratedScenariosState(prevScenarios => [...prevScenarios, newGeneratedScenario]);
        setScenarioNameState(`Scenario ${generatedScenarios.length + 2}`); 
        setPriceChangeDescriptionState(""); 

        toast({ title: "Success", description: `Forecast for "${newGeneratedScenario.name}" generated successfully!` });

      } catch (error) {
        toast({ title: "Error Processing Forecast Output", description: (error as Error).message, variant: "destructive" });
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

  // Helper to convert EditablePricePoint array to CSV string (timestamp,price)
  const pricePointsToCsvString = (points: EditablePricePoint[]): string => {
    const header = "timestamp,price";
    const rows = points.map(p => `${p.date},${p.price}`);
    return [header, ...rows].join('\n');
  };

  const handleOpenEditPriceDialog = (scenarioToEdit: GeneratedScenario) => {
    try {
      const priceForecast = parseCsvForTimeSeries(scenarioToEdit.apiOutput.forecastedData, 'price');
      setEditablePricesState(priceForecast.map(p => ({ date: p.date, price: p.value })));
      setEditingScenarioState(scenarioToEdit);
    } catch (error) {
      toast({ title: "Error preparing prices for editing", description: (error as Error).message, variant: "destructive" });
    }
  };

  const handlePriceInputChange = (index: number, newPrice: string) => {
    const updatedPrices = [...editablePrices];
    const priceVal = parseFloat(newPrice);
    // Allow empty string for temporary clearing, but it will be NaN
    if (newPrice === "" || !isNaN(priceVal)) {
      updatedPrices[index].price = newPrice === "" ? NaN : priceVal; // Store NaN if empty to indicate invalid
      setEditablePricesState(updatedPrices);
    }
  };
  
  const handleSaveChangesAndReforecast = async () => {
    if (!editingScenario || editablePrices.length === 0) {
      toast({ title: "Error", description: "No scenario or prices to re-forecast.", variant: "destructive" });
      return;
    }

    // Validate that all prices are valid numbers
    const hasInvalidPrice = editablePrices.some(p => isNaN(p.price));
    if (hasInvalidPrice) {
        toast({ title: "Invalid Prices", description: "Please ensure all price fields contain valid numbers.", variant: "destructive" });
        return;
    }


    setIsReForecastingState(true);
    const customPricesCsv = pricePointsToCsvString(editablePrices);
  
    const reforecastInput: ScenarioForecastInput & { customFuturePricesCsv?: string } = {
      historicalData: historicalDataCsv!, 
      priceChangeScenario: editingScenario.priceChangeDescription, 
      forecastLength: editingScenario.forecastLength, 
      customFuturePricesCsv: customPricesCsv,
    };
  
    const result = await generateForecastAction(reforecastInput);
    setIsReForecastingState(false);
  
    if ("error" in result) {
      toast({ title: "Re-forecast Failed", description: result.error, variant: "destructive" });
    } else {
      setGeneratedScenariosState(prevScenarios =>
        prevScenarios.map(sc =>
          sc.id === editingScenario.id
            ? { ...sc, apiOutput: result, isCustomPriceScenario: true, name: `${sc.name.replace(/ \(Custom Prices\)?$/, "")} (Custom Prices)` } 
            : sc
        )
      );
      toast({ title: "Success", description: `Demand re-forecasted for "${editingScenario.name}" with custom prices.` });
      setEditingScenarioState(null); 
    }
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
                <Label htmlFor="forecast-length-slider" className="flex items-center">
                  <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                  Forecast Length: {forecastLengthInput} {detectedFrequency === 'unknown' ? 'periods' : detectedFrequency}
                </Label>
                <Slider
                  id="forecast-length-slider"
                  min={1}
                  max={maxForecastLength}
                  step={1}
                  value={[forecastLengthInput]}
                  onValueChange={(value) => setForecastLengthInputState(value[0])}
                  disabled={!historicalDataCsv || (historicalDemandPoints.length === 0 && historicalPricePoints.length === 0)}
                  className="mt-2"
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
               <CardDescription>Shows historical demand and all generated forecasts.</CardDescription>
            </CardHeader>
            <CardContent>
              <TimeSeriesChart 
                data={combinedDemandChartData} 
                title={demandChartTitle} 
                chartConfig={demandChartConfig}
              />
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center"><DollarSign className="mr-2 h-6 w-6 text-primary" /> Price Visualization</CardTitle>
              <CardDescription>Shows historical prices and all generated forecasts.</CardDescription>
            </CardHeader>
            <CardContent>
               <TimeSeriesChart 
                data={combinedPriceChartData} 
                title={priceChartTitle} 
                chartConfig={priceChartConfig}
              />
            </CardContent>
          </Card>

          {generatedScenarios.length > 0 && generatedScenarios[generatedScenarios.length-1] && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center"><FileText className="mr-2 h-6 w-6 text-primary" /> Latest Forecast Summary</CardTitle>
                <CardDescription>AI-generated summary for the most recent scenario: "{generatedScenarios[generatedScenarios.length-1]?.name}"</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{generatedScenarios[generatedScenarios.length-1]?.apiOutput.summary}</p>
              </CardContent>
            </Card>
          )}
          
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center"><History className="mr-2 h-6 w-6 text-primary" /> Scenario History & Bulk Summary</CardTitle>
              <CardDescription>Review past scenarios and generate a collective summary. Edit scenario prices if needed.</CardDescription>
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
                        <Button variant="outline" size="sm" onClick={() => handleOpenEditPriceDialog(scenario)} className="mt-2 text-xs">
                           <Edit3 className="mr-1 h-3 w-3" /> Edit Prices & Re-forecast Demand
                        </Button>
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


          {(isGeneratingForecast || isSummarizing) && generatedScenarios.length === 0 && !multiScenarioSummary && (
            <div className="flex items-center justify-center p-4 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 
              {isGeneratingForecast ? "Generating forecast..." : "Summarizing scenarios..."}
            </div>
          )}
        </div>
      </main>

      {editingScenario && (
        <Dialog open={!!editingScenario} onOpenChange={(isOpen) => { if(!isOpen) setEditingScenarioState(null); }}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Prices for "{editingScenario.name}"</DialogTitle>
              <DialogDescription>
                Modify the future prices below. Demand will be re-forecasted based on these prices.
                Original AI forecast length: {editingScenario.forecastLength}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 py-4 max-h-[400px] overflow-y-auto pr-2">
              {editablePrices.map((point, index) => (
                <div key={point.date} className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor={`price-${index}`} className="text-right col-span-1 text-xs">
                    {point.date}
                  </Label>
                  <Input
                    id={`price-${index}`}
                    type="number"
                    value={isNaN(point.price) ? "" : point.price} // Show empty for NaN
                    onChange={(e) => handlePriceInputChange(index, e.target.value)}
                    className="col-span-2 h-8 text-sm"
                    step="0.01"
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingScenarioState(null)}>Cancel</Button>
              <Button onClick={handleSaveChangesAndReforecast} disabled={isReForecasting}>
                {isReForecasting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit3 className="mr-2 h-4 w-4" />}
                Re-forecast Demand
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

       <footer className="w-full max-w-6xl mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} ScenarioSage. Powered by Firebase Studio.</p>
      </footer>
    </div>
  );
};

export default ScenarioSagePage;
    
