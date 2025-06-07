'use client';

import React, { useState } from 'react';
import {
  Link as LinkIcon,
  ChevronDown,
} from 'lucide-react';

const GivEnergyInfoPage: React.FC = () => {
  const [isGivEnergyCollapsed, setIsGivEnergyCollapsed] = useState(true);

  return (
    <div className="bg-slate-50 dark:bg-black min-h-screen"> {/* Main background */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* GivEnergy Section */}
        <section className="mb-16 bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-xl shadow-lg dark:shadow-slate-700/50">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-orange-600 dark:text-orange-500">
              Featured Partner: GivEnergy {/* Keep the main heading */}
            </h2>
          </div>
          <div className="mt-6 flex flex-col md:flex-row items-center md:items-start gap-6 text-slate-700 dark:text-slate-300">
            <a
              href="https://givenergy.co.uk/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 mb-4 md:mb-0" // Add margin bottom for small screens
            >
              <img
                src="/images/givenergy-logo.png" // Ensure this path is correct
                alt="GivEnergy Logo"
                className="h-20 w-auto rounded-md bg-transparent mx-auto md:mx-0" // Center logo on small screens
              />
            </a>
            <div className="flex-grow">
              <p className="mb-4">
                GivEnergy is a leading UK manufacturer of energy storage systems, offering a range of high-performance battery storage solutions, inverters, and a comprehensive monitoring platform. Their innovative technology allows homeowners and businesses to store excess renewable energy (like solar) or cheaper off-peak grid electricity for later use, significantly impacting energy independence and cost savings.
              </p>

              <a
                href="https://givenergy.co.uk/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-orange-400 dark:hover:text-orange-300 hover:underline text-lg"
              >
                <LinkIcon className="h-5 w-5" />
                Learn More About GivEnergy
              </a>

              {/* Collapsible "More About GivEnergy" Section */}
              <div className="mt-6">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setIsGivEnergyCollapsed(!isGivEnergyCollapsed)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsGivEnergyCollapsed(!isGivEnergyCollapsed)}
                  aria-expanded={!isGivEnergyCollapsed}
                  aria-controls="givenergy-detailed-info"
                >
                  <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                    More About GivEnergy
                  </h3>
                  <ChevronDown
                    className={`h-6 w-6 text-orange-600 dark:text-orange-500 transform transition-transform duration-300 ${
                      isGivEnergyCollapsed ? '' : 'rotate-180'
                    }`}
                  />
                </div>

                {!isGivEnergyCollapsed && (
                  <div id="givenergy-detailed-info" className="mt-4 space-y-4 text-slate-700 dark:text-slate-300">
                    <div>
                      <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Core Focus:</h4>
                      <p>GivEnergy specialises in providing advanced energy storage solutions for residential and commercial applications. Their focus is on developing reliable, efficient, and user-friendly systems that empower users to take control of their energy usage and reduce their reliance on the grid.</p>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Key Product Categories:</h4>
                      <ul className="list-disc list-inside space-y-1 pl-4">
                        <li>
                          <strong>Battery Storage Systems:</strong> Offering a range of lithium-ion battery capacities suitable for various home and business sizes. These batteries integrate seamlessly with solar PV systems to store excess generation.
                        </li>
                        <li>
                          <strong>Hybrid Inverters:</strong> Devices that manage the flow of energy from solar panels, the grid, and the battery, optimising energy usage and allowing for features like self-consumption and grid export.
                        </li>
                        <li>
                          <strong>AC Coupled Inverters:</strong> Solutions to add battery storage to existing solar PV systems or to store cheaper off-peak electricity directly from the grid.
                        </li>
                         <li>
                          <strong>EV Chargers:</strong> Smart electric vehicle chargers that can integrate with their energy storage systems for optimised charging, potentially using stored solar energy.
                        </li>
                      </ul>
                    </div>

                     <div>
                      <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Monitoring Platform:</h4>
                      <p>GivEnergy provides a sophisticated online monitoring platform (accessible via web or mobile app) that gives users real-time data on their energy generation, consumption, battery charge/discharge status, and grid interaction. This platform allows for remote monitoring and control of the system.</p>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Key Features and Benefits:</h4>
                      <ul className="list-disc list-inside space-y-1 pl-4">
                        <li><strong>Energy Independence:</strong> Reduce reliance on potentially volatile grid electricity prices.</li>
                        <li><strong>Cost Savings:</strong> Maximise self-consumption of free solar energy and utilise cheaper off-peak electricity tariffs.</li>
                        <li><strong>Backup Power:</strong> Some systems can provide backup power during grid outages (ensure specific models support this).</li>
                        <li><strong>Smart Energy Management:</strong> Optimise energy flow based on time-of-use tariffs and household demand.</li>
                        <li><strong>Scalability:</strong> Systems can often be expanded by adding more battery capacity.</li>
                        <li><strong>UK Based:</strong> Design, manufacturing, and support based in the UK.</li>
                      </ul>
                    </div>

                     <div>
                      <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Target Audience:</h4>
                      <p>GivEnergy systems are suitable for homeowners and businesses looking to enhance their solar PV investment, reduce electricity bills, increase energy independence, and gain insights into their energy usage.</p>
                    </div>

                     <div>
                      <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Installation:</h4>
                      <p>GivEnergy systems should always be installed by accredited and trained professionals like AJ Renewables to ensure safety, compliance, and optimal performance.</p>
                    </div>

                     <div>
                      <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Things to Consider:</h4>
                      <p>System sizing is crucial to match energy usage and solar generation. Consult with a professional installer to determine the most suitable GivEnergy system for your specific needs.</p>
                    </div>

                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default GivEnergyInfoPage;