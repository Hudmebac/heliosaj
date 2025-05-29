'use client';

import React, { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocalStorage } from '@/hooks/use-local-storage';
// Placeholder types and data - replace with actual API calls and state management
interface SystemData {
  solarProduction: number;
  houseConsumption: number;
  batteryCharge: number;
  gridImportExport: number;
}

const mockSystemData: SystemData = {
  solarProduction: 5.2,
  houseConsumption: 2.1,
  batteryCharge: 75,
  gridImportExport: -0.5, // Negative for export, positive for import
};

const GivEnergyControlPage: React.FC = () => {
  const [apiKey, setApiKey] = useLocalStorage('givenergy-api-key', '');
  const [serialNumber, setSerialNumber] = useLocalStorage('givenergy-serial-number', '');
  const [systemData, setSystemData] = useState<SystemData>(mockSystemData);
  const isLoggedIn = !!apiKey && !!serialNumber; // Consider logged in if both exist

  const handleSignIn = () => {
    // Implement actual authentication logic here
    console.log('Signing in with API Key:', apiKey);
  };

  const handleClearCredentials = () => {
    setApiKey('');
    setSerialNumber('');
    setIsLoggedIn(false);
    setSystemData({ solarProduction: 0, houseConsumption: 0, batteryCharge: 0, gridImportExport: 0 }); // Clear data on logout
  };

  // Placeholder function to update system data - replace with actual API calls
  const fetchSystemData = () => {
    console.log('Fetching latest system data...');
    // Simulate fetching updated data
    setSystemData({
      solarProduction: Math.random() * 10,
      houseConsumption: Math.random() * 5,
      batteryCharge: Math.random() * 100,
      gridImportExport: (Math.random() - 0.5) * 2,
    });
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-center mb-8">GivEnergy System Control</h1>

      <Tabs defaultValue="authentication" className="w-full max-w-2xl mx-auto">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="authentication">Authentication</TabsTrigger>
          <TabsTrigger value="dashboard" disabled={!isLoggedIn}>Dashboard</TabsTrigger>
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
                  <Button className="w-full" onClick={handleSignIn}>Sign In</Button>
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
        <TabsContent value="System Control" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>System Control</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>Solar Production: {systemData.solarProduction.toFixed(2)} kW</p>
              <p>House Consumption: {systemData.houseConsumption.toFixed(2)} kW</p>
              <p>Battery Charge: {systemData.batteryCharge.toFixed(1)} %</p>
              <p>Grid ({systemData.gridImportExport < 0 ? 'Export' : 'Import'}): {Math.abs(systemData.gridImportExport).toFixed(2)} kW</p>
              <Button className="w-full" onClick={fetchSystemData}>Refresh Data</Button>
              {/* Add more dashboard elements and controls here */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
export default GivEnergyControlPage;