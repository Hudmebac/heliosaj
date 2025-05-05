import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InfoPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Information Center</h1>

      <Tabs defaultValue="how-to" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="how-to">How-To Use</TabsTrigger>
          <TabsTrigger value="panels">Solar Panels</TabsTrigger>
          <TabsTrigger value="myths">Myth Busting</TabsTrigger>
          <TabsTrigger value="advice">General Advice</TabsTrigger>
        </TabsList>

        <TabsContent value="how-to">
          <Card>
            <CardHeader>
              <CardTitle>How to Use HelioHeggie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>Welcome to HelioHeggie! Here’s how to get the most out of the app:</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  <strong>Configure Settings:</strong> Go to the 'Settings' tab (gear icon). Enter your location (city/postcode or precise coordinates), the direction your panels face, and details about your solar system (either number/power of panels OR total system power). If you have a battery, enter its capacity. Accurate settings lead to better forecasts.
                </li>
                <li>
                  <strong>Check Dashboard:</strong> The 'Dashboard' (home icon) shows the estimated solar energy generation for today and tomorrow based on your settings and the latest weather forecast. A chart visualizes the expected power throughout the day.
                </li>
                 <li>
                  <strong>Manage Tariffs:</strong> Visit the 'Tariffs' tab (chart icon). Here you can view general tariff information. Soon, you'll be able to input your specific electricity rates and times for peak/off-peak periods.
                </li>
                <li>
                  <strong>Get Smart Charging Advice:</strong> In the 'Advisory' tab (lightning bolt icon), define your cheap electricity tariff times. Based on tomorrow's solar forecast and your battery size, the app will suggest whether charging your battery from the grid overnight is recommended.
                </li>
                <li>
                  <strong>Explore Info:</strong> Browse the other tabs here ('Solar Panels', 'Myth Busting', 'General Advice') for useful information about solar energy.
                </li>
                 <li>
                  <strong>Switch Themes:</strong> Use the Sun/Moon icon in the header to toggle between light and dark modes.
                </li>
              </ol>
               <p><strong>Tip:</strong> Keep your settings updated if you change your system or move!</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="panels">
          <Card>
            <CardHeader>
              <CardTitle>About Solar Panels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>Solar panels, or photovoltaic (PV) modules, convert sunlight directly into electricity.</p>
              <h3 className="font-semibold text-foreground">Technology Types:</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Monocrystalline:</strong> Made from single-crystal silicon, generally higher efficiency and sleek black appearance, but often more expensive.</li>
                <li><strong>Polycrystalline:</strong> Made from melted silicon fragments, slightly lower efficiency, often have a blue, speckled look, typically more affordable.</li>
                <li><strong>Thin-Film:</strong> Less common for residential, flexible and lightweight, lower efficiency but perform better in low light or high temperatures.</li>
              </ul>
               <h3 className="font-semibold text-foreground">Efficiency Factors:</h3>
               <ul className="list-disc list-inside space-y-1">
                 <li><strong>Sunlight Intensity (Irradiance):</strong> More sun = more power. Affected by time of day, season, weather (clouds), and location.</li>
                 <li><strong>Temperature:</strong> Panels lose efficiency slightly as they get hotter. Performance is rated at a standard test condition (STC) of 25°C.</li>
                 <li><strong>Shading:</strong> Even partial shading on one panel can significantly reduce the output of the entire string (or panel if using microinverters/optimizers).</li>
                 <li><strong>Angle and Orientation:</strong> The tilt angle and direction (azimuth) panels face affect how much direct sunlight they receive throughout the day and year. Optimal angles vary by latitude.</li>
                 <li><strong>Age (Degradation):</strong> Panels slowly lose efficiency over time, typically less than 0.5-1% per year. Warranties usually guarantee a certain output (e.g., 80-90%) after 25 years.</li>
                  <li><strong>Maintenance:</strong> Keeping panels clean from dirt, dust, snow, or leaves ensures maximum sunlight absorption.</li>
               </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="myths">
          <Card>
            <CardHeader>
              <CardTitle>Solar Energy Myth Busting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
               <h3 className="font-semibold text-foreground">Myth: Solar panels don't work in cold or cloudy weather.</h3>
               <p><strong>Fact:</strong> Solar panels work based on light, not heat. They can actually be more efficient in cooler temperatures. While heavy cloud cover reduces output significantly, they still generate electricity on overcast days, just less than on bright sunny days.</p>

               <h3 className="font-semibold text-foreground">Myth: Solar panels require a lot of maintenance.</h3>
               <p><strong>Fact:</strong> Solar panels are very durable and generally require minimal maintenance. Usually, rainfall is enough to keep them clean. In very dusty areas or after long dry spells, occasional rinsing might be beneficial. There are no moving parts, reducing the chance of mechanical failure.</p>

               <h3 className="font-semibold text-foreground">Myth: Getting solar panels is too expensive.</h3>
               <p><strong>Fact:</strong> While the upfront cost can be significant, the price of solar panels has dropped dramatically over the years. Many find that the long-term savings on electricity bills, potential feed-in tariffs, and increased property value make it a worthwhile investment. Payback periods vary depending on location, system size, and electricity costs.</p>

               <h3 className="font-semibold text-foreground">Myth: Solar panels will damage my roof.</h3>
               <p><strong>Fact:</strong> When installed correctly by certified professionals, solar panels should not damage your roof. Installers use mounting systems designed to prevent leaks and distribute weight properly. In fact, the panels can even offer some protection to the underlying roof area.</p>

                 <h3 className="font-semibold text-foreground">Myth: Solar energy is only useful during the day.</h3>
               <p><strong>Fact:</strong> While panels generate electricity during daylight, coupling them with a battery storage system allows you to store excess energy generated during the day for use at night or during power outages. Even without a battery, grid-tied systems often allow you to feed excess power back to the grid (sometimes for credit) and draw power when needed.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advice">
          <Card>
            <CardHeader>
              <CardTitle>General Solar Advice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
               <h3 className="font-semibold text-foreground">Optimize Energy Usage:</h3>
                <ul className="list-disc list-inside space-y-1">
                    <li>Shift high-consumption activities (washing machine, dishwasher, EV charging) to daytime hours when your panels are generating the most power, especially if you don't have a battery or export tariff.</li>
                    <li>Understand your electricity tariff. If you have time-of-use rates, maximize self-consumption during peak price hours and consider using grid power or stored battery power during off-peak times.</li>
                </ul>

               <h3 className="font-semibold text-foreground">Battery Management:</h3>
                 <ul className="list-disc list-inside space-y-1">
                    <li>Set battery reserve levels wisely. Keeping a small reserve (e.g., 10-20%) can be useful for short power outages, but setting it too high reduces the capacity available for daily savings.</li>
                    <li>Consider smart charging based on forecasts (like this app helps with!). If a cloudy day is predicted and you have cheap overnight electricity, charging the battery from the grid might be cheaper than buying expensive peak power the next day.</li>
                 </ul>

               <h3 className="font-semibold text-foreground">System Monitoring:</h3>
                 <ul className="list-disc list-inside space-y-1">
                    <li>Regularly check your inverter's monitoring app or web portal. Look for consistent generation patterns. A sudden drop in output could indicate an issue (e.g., shading, fault, dirt).</li>
                    <li>Compare your actual generation to estimates (like those from this app!) over time. This helps understand system performance and identify potential discrepancies.</li>
                 </ul>

               <h3 className="font-semibold text-foreground">Maintenance Checks:</h3>
                 <ul className="list-disc list-inside space-y-1">
                   <li>Visually inspect panels occasionally for excessive dirt, leaves, bird droppings, or damage.</li>
                   <li>Ensure trees or new structures aren't causing new shading issues.</li>
                   <li>While generally low-maintenance, consider a professional inspection every few years, especially for wiring and mounting integrity.</li>
                 </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
