
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
              <p>Welcome to HelioHeggie! Here’s a guide to getting the most out of the app:</p>
              <ol className="list-decimal list-inside space-y-3">
                <li>
                  <strong>Configure System Settings (Gear Icon <span aria-label="Settings icon">&#9881;</span>):</strong>
                  <ul className="list-disc list-inside space-y-1 pl-6 mt-1">
                    <li><strong>Location:</strong> Use the postcode lookup (UK) or manually enter your address/coordinates. Accurate latitude and longitude are crucial, especially for the "Open-Meteo" forecast source.</li>
                    <li><strong>Panel Direction:</strong> Select the direction your solar panels primarily face. This impacts generation estimates.</li>
                    <li><strong>Solar System Power:</strong> Input your panel count and wattage to estimate total power, then click "Apply to Total System Power", or directly enter your system's "Total System Power (kWp)". This kWp value is vital for forecasts.</li>
                    <li><strong>Battery:</strong> If you have one, enter its "Capacity (kWh)", "Max Charge Rate (kW)", and your "Preferred Overnight Battery Target (%)".</li>
                    <li><strong>Consumption:</strong> Optionally, provide your typical daily/hourly energy usage and fine-tune the hourly profile using sliders. This helps the Advisory page.</li>
                    <li><strong>Tariffs:</strong> Define your electricity tariff periods (name, times, rate, cheap status). This is essential for smart charging advice.</li>
                    <li>Save settings after making changes.</li>
                  </ul>
                </li>
                <li>
                  <strong>Select Weather Source (Header <span aria-label="Cloud and Sun icon">&#x26C5;</span> Source):</strong>
                  <ul className="list-disc list-inside space-y-1 pl-6 mt-1">
                    <li><strong>Open-Meteo (Default):</strong> Provides API-driven forecasts for today, tomorrow, and a 7-day week ahead view. Requires accurate location in Settings.</li>
                    <li><strong>Manual Input:</strong> Allows you to enter your own sunrise/sunset times and weather conditions for today and tomorrow. Useful if API is unavailable or for custom scenarios.</li>
                  </ul>
                </li>
                <li>
                  <strong>View Dashboard (Home Icon <span aria-label="Home icon">&#127968;</span>):</strong>
                  <ul className="list-disc list-inside space-y-1 pl-6 mt-1">
                    <li>Shows estimated solar generation for today and tomorrow based on your settings and selected weather source.</li>
                    <li>Charts visualize expected hourly generation. Hover for details.</li>
                    <li>The "Week Ahead" view (for Open-Meteo source on larger screens) gives a 7-day outlook.</li>
                    <li>Use the "Refresh Forecast" (for API) or "Edit Manual Forecast" button as needed.</li>
                  </ul>
                </li>
                <li>
                  <strong>Get Smart Charging Advice (Lightning Bolt Icon <span aria-label="Lightning bolt icon">&#x26A1;</span>):</strong>
                  <ul className="list-disc list-inside space-y-1 pl-6 mt-1">
                    <li>Input your current battery level and expected energy usage (daily/hourly).</li>
                    <li>Set EV charging needs if applicable (kWh, charge-by time, max rate).</li>
                    <li>The app provides "Today's Recommendation" and "Overnight Charging (for Tomorrow)" advice.</li>
                    <li>This advice considers your forecast, tariffs, battery state, consumption, and EV needs to suggest optimal grid charging times or reliance on solar/battery.</li>
                  </ul>
                </li>
                <li>
                  <strong>Explore Info (This Page - Info Icon <span aria-label="Info icon">&#x2139;</span>):</strong>
                  <ul className="list-disc list-inside space-y-1 pl-6 mt-1">
                    <li>Browse the tabs for more on solar panels, common myths, and general solar energy advice.</li>
                  </ul>
                </li>
                 <li>
                  <strong>Switch Themes (Header Sun/Moon/Contrast Icon):</strong> Toggle between Light, Dark, and High Contrast display modes for your preference.
                </li>
              </ol>
               <p className="pt-2"><strong>Key to Success:</strong> Accurate and up-to-date information in Settings (location, system power, tariffs) and on the Advisory page (current battery, consumption) will yield the most useful forecasts and recommendations. Remember to select your desired weather source in the header.</p>
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
                    <li>Consider smart charging based on forecasts (like this app helps with!). If a cloudy day is predicted and you have cheap overnight electricity, charging the battery from the grid might be cheaper than buying expensive peak power the next day. Use the Advisory page for this.</li>
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

