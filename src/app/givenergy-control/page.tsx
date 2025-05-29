'use client';

import React, { useState, useEffect } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { RefreshCw } from 'lucide-react';
// Placeholder types and data - replace with actual API calls and state management
interface SystemData {
  solarProduction: number;
  houseConsumption: number;
  batteryCharge: number;
  batteryChargeKWh: number;
  gridImportExport: number;
  batteryFlow: number; // Negative for discharge, positive for charge
  evChargerAmount: number;
}

const mockSystemData: SystemData = {
  solarProduction: 5.2,
  houseConsumption: 2.1,
  batteryChargeKWh: 8.5, // Example kWh value
  batteryCharge: 75,
  gridImportExport: -0.5, // Negative for export, positive for import
};

// Mock data structures for charts and diagrams
const mockEnergyFlowData = {
  houseConsumption: 2.5,
  solarProduction: 4.0,
  batteryFlow: -1.0, // Negative for discharge, positive for charge
  gridFlow: -0.5, // Negative for export, positive for import
};

const mockSolarChartData = [
  { hour: '8am', production: 1.2 },
  { hour: '9am', production: 3.5 },
  { hour: '10am', production: 5.8 },
  { hour: '11am', production: 7.1 },
  { hour: '12pm', production: 7.9 },
  { hour: '1pm', production: 6.5 },
  { hour: '2pm', production: 5.0 },
];

const mockBatteryChartData = [
  { time: '8am', charge: 60 },
  { time: '9am', charge: 65 },
  { time: '10am', charge: 70 },
  { time: '11am', charge: 75 },
  { time: '12pm', charge: 80 },
  { time: '1pm', charge: 78 },
  { time: '2pm', charge: 75 },
];

const mockGridChartData = [
  { time: '8am', flow: 0.2 },
  { time: '9am', flow: -0.1 },
  { time: '10am', flow: -0.3 },
  { time: '11am', flow: -0.5 },
  { time: '12pm', flow: 0.1 },
  { time: '1pm', flow: 0.3 },
  { time: '2pm', flow: 0.5 },
];

const mockEVChargerChartData = [
  { time: '8am', charging: 0 },
  { time: '9am', charging: 0 },
  { time: '10am', charging: 3.5 },
  { time: '11am', charging: 7.0 },
  { time: '12pm', charging: 7.0 },
  { time: '1pm', charging: 5.2 },
  { time: '2pm', charging: 0 },
];

const GivEnergyControlPage: React.FC = () => {
  const [apiKey, setApiKey] = useLocalStorage('givenergy-api-key', '');
  const [serialNumber, setSerialNumber] = useLocalStorage('givenergy-serial-number', '');
  const [systemData, setSystemData] = useState<SystemData>(mockSystemData);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Consider logged in if both exist
  const [activeTab, setActiveTab] = useState('home'); // New state for active tab

  useEffect(() => {
    // Update isLoggedIn state whenever apiKey or serialNumber changes
    setIsLoggedIn(!!apiKey && !!serialNumber);
  }, [apiKey, serialNumber]);
  const handleSignIn = () => {

    // Implement actual authentication logic here
    console.log('Signing in with API Key:', apiKey);
  };

  const handleClearCredentials = () => {
    setApiKey('');
    setSerialNumber('');
    setIsLoggedIn(false);
    setSystemData({ solarProduction: 0, houseConsumption: 0, batteryCharge: 0, batteryChargeKWh: 0, gridImportExport: 0, batteryFlow: 0, evChargerAmount: 0 }); // Clear data on logout
  };

  // Placeholder function to update system data - replace with actual API calls
  const fetchSystemData = () => {
    console.log('Fetching latest system data...');
    // Simulate fetching updated data
    setSystemData({
      solarProduction: Math.random() * 10,
      houseConsumption: Math.random() * 5,
      batteryCharge: parseFloat((Math.random() * 100).toFixed(1)), // Ensure percentage is float with one decimal
      batteryChargeKWh: parseFloat((Math.random() * 12).toFixed(2)), // Example max capacity 12kWh
      gridImportExport: (Math.random() - 0.5) * 2,
      batteryFlow: (Math.random() - 0.5) * 3, // Simulate charge/discharge
      evChargerAmount: Math.random() * 7, // Simulate EV charging amount
    });
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-center mb-8">GivEnergy System Control</h1>

      <Tabs defaultValue="authentication" value={activeTab} onValueChange={setActiveTab} className="w-full max-w-4xl mx-auto">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-5">
          <TabsTrigger value="authentication">
            {/* Placeholder Icon for Authentication */}
            <span>🔑</span> Authentication
          </TabsTrigger>
          <TabsTrigger value="home" disabled={!isLoggedIn}>
            {/* Placeholder Icon for Home */}
            <span>🏠</span> Home
          </TabsTrigger>
          <TabsTrigger value="solar" disabled={!isLoggedIn}>
            {/* Placeholder Icon for Solar */}
            <span>☀️</span> Solar
          </TabsTrigger>
          <TabsTrigger value="battery" disabled={!isLoggedIn}>
            {/* Placeholder Icon for Battery */}
            <span>🔋</span> Battery
          </TabsTrigger>
          <TabsTrigger value="grid" disabled={!isLoggedIn}>
            {/* Placeholder Icon for Grid */}
            <span>⚡</span> Grid
          </TabsTrigger>
          <TabsTrigger value="ev-charger" disabled={!isLoggedIn}>
            {/* Placeholder Icon for EV Charger */}
            <span>🚗⚡</span> EV Charger
          </TabsTrigger>

        </TabsList>
        <TabsContent value="authentication" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>GivEnergy API Authentication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isLoggedIn ? (
                <>
                  <p className="text-sm text-gray-600">
                    To connect to your GivEnergy system, you need to provide your API Key and Inverter Serial Number.
                    You can generate an API token from your GivEnergy Cloud account settings.
                  </p>
                  <p className="text-sm text-gray-600">
                    Follow this link to generate your API token: <a href="http://givenergy.cloud/account-settings/api-tokens" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">GivEnergy Cloud API Tokens</a>
      </p>
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input id="apiKey" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Enter your GivEnergy API Key" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serialNumber">Serial Number</Label>
                    <Input id="serialNumber" type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="Enter your Inverter Serial Number" />
                  </div>
                  <Button className="w-full" onClick={handleSignIn} disabled={!apiKey || !serialNumber}>Sign In</Button>
                </>
              ) : (
                <div className="text-center text-slate-500 dark:text-slate-400">
                  <p>Successfully connected to GivEnergy API. You can now view your system data.</p>
                  <Button onClick={handleClearCredentials} className="mt-4">Clear Credentials</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Home Section */}
        <TabsContent value="home" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Home Overview</CardTitle>
            </CardHeader>
 <CardContent className="space-y-4">
              <h3 className="text-xl font-semibold">Current Metrics</h3>
              <div className="flex justify-end">
                <Button variant="ghost" size="icon" onClick={fetchSystemData}>
 <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex justify-between">
                  <span className="font-bold text-lg">House Consumption:</span>
                  <span>
                    {systemData?.houseConsumption !== undefined ? systemData.houseConsumption.toFixed(2) : 'Loading...'} kW
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-lg">Solar Generation:</span>
                  <span>
                    {systemData?.solarProduction !== undefined ? systemData.solarProduction.toFixed(2) : 'Loading...'} kW
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-lg">Battery Level:</span>
                  <span>
                    {systemData?.batteryCharge !== undefined ? systemData.batteryCharge.toFixed(1) : 'Loading...'} % ({systemData?.batteryChargeKWh !== undefined ? systemData.batteryChargeKWh.toFixed(2) : 'Loading...'} kWh)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-lg">Grid Flow:</span>
                  <span>
                    {systemData?.gridImportExport !== undefined ? (systemData.gridImportExport < 0 ? 'Export' : 'Import') : 'Loading...'}: {systemData?.gridImportExport !== undefined ? Math.abs(systemData.gridImportExport).toFixed(2) : 'Loading...'} kW
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-lg">Battery Flow:</span>
                  <span>
                    {systemData?.batteryFlow !== undefined ? (systemData.batteryFlow < 0 ? 'Discharging' : 'Charging') : 'Loading...'}: {systemData?.batteryFlow !== undefined ? Math.abs(systemData.batteryFlow).toFixed(2) : 'Loading...'} kW
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-xl font-semibold mb-2">Energy Flows</h3>
                {/* Placeholder for Energy Flow Diagram */}
                <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center text-gray-500">
                  Placeholder for Energy Flow Diagram
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Solar Section */}
        <TabsContent value="solar" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Solar System</CardTitle>
              <div className="flex justify-end">
                <Button variant="ghost" size="icon" onClick={fetchSystemData}>
 <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Solar Current Output: {systemData?.solarProduction !== undefined ? systemData.solarProduction.toFixed(2) : 'Loading...'} kW
              </p>{/* Placeholder for Solar Generation Charts and Efficiency Metrics */}
              {/* Placeholder for Solar Generation Charts and Efficiency Metrics */}
              <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center text-gray-500">
                Placeholder for Solar Generation Charts ({mockSolarChartData.length} data points)
              </div>{/* Placeholder for Solar Generation Charts and Efficiency Metrics */}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Battery Section */}
        <TabsContent value="battery" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Battery Storage</CardTitle>
              <div className="flex justify-end">
                <Button variant="ghost" size="icon" onClick={fetchSystemData}>
 <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Battery Charge Level: {systemData?.batteryCharge !== undefined ? systemData.batteryCharge.toFixed(1) : 'Loading...'} % ({systemData?.batteryChargeKWh !== undefined ? systemData.batteryChargeKWh.toFixed(2) : 'Loading...'} kWh)
              </p>
              <p>
                Battery Flow: {systemData?.batteryFlow !== undefined ? (systemData.batteryFlow < 0 ? 'Discharging' : 'Charging') : 'Loading...'}: {systemData?.batteryFlow !== undefined ? Math.abs(systemData.batteryFlow).toFixed(2) : 'Loading...'} kW
              </p>{/* Placeholder for Charge/Discharge Rate Visuals and Usage Analytics */}
              {/* Placeholder for Charge/Discharge Rate Visuals and Usage Analytics */}
              <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center text-gray-500">
                Placeholder for Battery Charts ({mockBatteryChartData.length} data points)
              </div>{/* Placeholder for Charge/Discharge Rate Visuals and Usage Analytics */}
              {/* Add more dashboard elements and controls here */}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Grid Section */}
        <TabsContent value="grid" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Grid Status</CardTitle>
              <div className="flex justify-end">
                <Button variant="ghost" size="icon" onClick={fetchSystemData}>
 <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Import vs. Export: {systemData?.gridImportExport !== undefined ? (systemData.gridImportExport < 0 ? 'Export' : 'Import') : 'Loading...'}: {systemData?.gridImportExport !== undefined ? Math.abs(systemData.gridImportExport).toFixed(2) : 'Loading...'} kW
              </p>
              {/* Placeholder for Grid electricity usage trends and Price indicators */}
              <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center text-gray-500">
                Placeholder for Grid Charts ({mockGridChartData.length} data points)
              </div>
              {/* Placeholder for Grid electricity usage trends and Price indicators */}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EV Charger Section */}
        <TabsContent value="ev-charger" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>EV Charger</CardTitle>
              <div className="flex justify-end">
                <Button variant="ghost" size="icon" onClick={fetchSystemData}>
 <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Current Charging Power: {systemData?.evChargerAmount !== undefined ? systemData.evChargerAmount.toFixed(2) : 'Loading...'} kW
              </p>
              {/* Placeholder for Total energy transferred to EV and Charging session history */}
              {/* Placeholder for Total energy transferred to EV and Charging session history */}
              <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center text-gray-500">
                Placeholder for EV Charger Charts ({mockEVChargerChartData.length} data points)
              </div>{/* Placeholder for Total energy transferred to EV and Charging session history */}
              {/* Add more dashboard elements and controls here */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
export default GivEnergyControlPage;