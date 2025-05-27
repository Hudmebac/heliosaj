'use client';

import React, { useState } from 'react';
import {
  Phone,
  Mail,
  Facebook,
  Link as LinkIcon,
  FileText,
  ChevronDown,
  SunMedium,
  BatteryCharging,
  Zap,
  Droplets,
  Wind,
  ShieldCheck,
  Sparkles,
  Building,
} from 'lucide-react';

interface Service {
  icon: React.ElementType;
  title: string;
  shortDescription: string;
  points: string[];
}

const servicesData: Service[] = [
  {
    icon: SunMedium,
    title: "Solar PV Systems",
    shortDescription: "Harness the sun's power to generate your own clean electricity.",
    points: [
      "Significantly reduce your electricity bills.",
      "Earn income via the Smart Export Guarantee (SEG).",
      "Increase property value & enhance EPC rating.",
      "Lower your carbon footprint with renewable energy.",
      "Custom solutions for homes and businesses.",
      "Installation of high-quality panels and inverters.",
    ],
  },
  {
    icon: BatteryCharging,
    title: "Battery Storage Solutions",
    shortDescription: "Store excess solar energy or cheap off-peak electricity.",
    points: [
      "Maximise self-consumption of your solar energy.",
      "Gain energy independence and reduce grid reliance.",
      "Provide backup power during outages (system dependent).",
      "Optimise energy usage with smart tariffs.",
      "Approved installers for Tesla, GivEnergy, Myenergi, etc.",
    ],
  },
  {
    icon: Zap,
    title: "EV Charging Points",
    shortDescription: "Convenient and cost-effective electric vehicle charging at home or work.",
    points: [
      "Fast, reliable charging for all EV models.",
      "Save money compared to public charging networks.",
      "Integrate with Solar PV for 'free' solar-powered miles.",
      "Smart chargers with app control and scheduling.",
      "OZEV grant assistance where applicable.",
    ],
  },
  {
    icon: Droplets,
    title: "Solar Thermal Systems",
    shortDescription: "Utilise solar energy to heat your water efficiently.",
    points: [
      "Substantially cut your water heating bills.",
      "Reduce reliance on traditional boilers.",
      "Lower your household's carbon emissions.",
      "Works with evacuated tubes or flat plate collectors.",
      "Provides a consistent supply of hot water.",
    ],
  },
  {
    icon: Wind,
    title: "Air Source Heat Pumps (ASHPs)",
    shortDescription: "Efficiently heat your home and water using renewable air energy.",
    points: [
      "Highly efficient heating, even in low temperatures.",
      "Lower carbon emissions than fossil fuel boilers.",
      "Potential for government incentives (e.g., Boiler Upgrade Scheme).",
      "Suitable for well-insulated new builds and retrofits.",
      "Provides both space heating and hot water.",
    ],
  },
];

const ServiceCard: React.FC<Service> = ({ icon: Icon, title, shortDescription, points }) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg dark:shadow-slate-800/50 p-6 flex flex-col h-full hover:shadow-xl dark:hover:shadow-slate-600/60 transition-shadow duration-300">
    <div className="flex items-center mb-4">
      <Icon className="h-10 w-10 text-orange-500 mr-4" /> {/* Orange icon works well on dark too */}
      <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
    </div>
    <p className="text-slate-600 dark:text-slate-400 mb-4 text-sm leading-relaxed">{shortDescription}</p>
    <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300 flex-grow">
      {points.map((point, index) => (
        <li key={index} className="flex items-start">
          <ChevronDown className="h-4 w-4 text-orange-500 mr-2 mt-0.5 transform -rotate-90 flex-shrink-0" />
          <span>{point}</span>
        </li>
      ))}
    </ul>
  </div>
);

interface Stage {
  icon: React.ElementType;
  title: string;
  description: string;
}

const StageCard: React.FC<Stage> = ({ icon: Icon, title, description }) => (
  <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4 shadow-md flex flex-col">
    <div className="flex items-center mb-2">
      <Icon className="h-6 w-6 text-orange-500 mr-3 flex-shrink-0" /> {/* Orange icon */}
      <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h4>
    </div>
    <p className="text-slate-600 dark:text-slate-300 text-sm flex-grow">{description}</p>
  </div>
);

const AJRenewablesInfoPage: React.FC = () => {
  const [isDetailedInfoCollapsed, setIsDetailedInfoCollapsed] = useState(true);
  const [isGivEnergyCollapsed, setIsGivEnergyCollapsed] = useState(true);
  const [isFinanceCollapsed, setIsFinanceCollapsed] = useState(true);
   const toggleDetailedInfo = () => {
    setIsDetailedInfoCollapsed(!isDetailedInfoCollapsed);
  };

  // For testing dark mode, you can temporarily add this in your main app or layout:
  // useEffect(() => {
  //   document.documentElement.classList.add('dark'); // or 'remove'
  // }, []);

  return (
    <div className="bg-slate-50 dark:bg-black min-h-screen"> {/* Main background */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <header className="text-center mb-12">
          <img 
            src="/images/ajlogo.png" // Ensure this path is correct
            alt="AJ Renewables Logo" 
            className="h-20 sm:h-24 md:h-28 w-auto mx-auto mb-6 bg-black dark:bg-transparent rounded-xl" 
            // Add dark mode filter if logo isn't suitable for dark bg
            // style={isDarkMode ? { filter: 'invert(1) hue-rotate(180deg)' } : {}} // Example
          />
          <h1 className="text-4xl sm:text-5xl font-bold text-orange-600 dark:text-orange-500 mb-3">
            AJ Renewables
          </h1>
          <p className="text-xl text-slate-700 dark:text-slate-300 mb-6">
            Your Trusted Partner for Renewable Energy Solutions
          </p>
          <a 
            href="https://aj-renewables.co.uk/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-orange-400 dark:hover:text-orange-300 hover:underline text-lg"
          >
            <LinkIcon className="h-5 w-5" />
            Visit Our Website
          </a>
        </header>

        {/* Services Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-semibold text-slate-800 dark:text-slate-100 mb-2 text-center">
            Our Renewable Energy Services
          </h2>
          <p className="text-center text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto">
            We offer a comprehensive suite of renewable energy solutions tailored to your home or business needs, helping you save money and reduce your carbon footprint.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {servicesData.map((service) => (
              <ServiceCard key={service.title} {...service} />
            ))}
          </div>
        </section>

        {/* More About AJ Renewables - Collapsible Section */}
        <section className="mb-16 bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-xl shadow-lg dark:shadow-slate-700/50">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={toggleDetailedInfo}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleDetailedInfo()}
            aria-expanded={!isDetailedInfoCollapsed}
            aria-controls="detailed-info-content stages-content"
          >
            <h2 className="text-2xl font-semibold text-orange-600 dark:text-orange-500">
              More About AJ Renewables
            </h2>
            <ChevronDown
              className={`h-7 w-7 text-orange-600 dark:text-orange-500 transform transition-transform duration-300 ${
                isDetailedInfoCollapsed ? '' : 'rotate-180'
              }`}
            />
          </div>
          
          {!isDetailedInfoCollapsed && (
            <div id="detailed-info-content" className="mt-6 space-y-6 text-slate-700 dark:text-slate-300">
              <div>
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center">
                  <Building className="h-6 w-6 mr-2 text-orange-500" />
                  Company Overview
                </h3>
                <p><strong>Name:</strong> AJ Renewables</p>
                <p><strong>Focus:</strong> A leading UK-based provider of bespoke renewable energy solutions.</p>
                <p><strong>Mission:</strong> To empower homeowners and businesses to reduce their carbon footprint, achieve energy savings, and secure their energy future through high-quality renewable technology installations. We are committed to expertise, quality workmanship, and complete customer satisfaction.</p>
                <p><strong>Service Areas:</strong> Fife and surrounding regions.</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center">
                  <ShieldCheck className="h-6 w-6 mr-2 text-orange-500" />
                  Accreditations & Peace of Mind
                </h3>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>MCS (Microgeneration Certification Scheme)</li>
                  <li>NICEIC (National Inspection Council for Electrical Installation Contracting)</li>
                  <li>RECC (Renewable Energy Consumer Code)</li>
                  <li>EPVS (Energy Performance Validation Scheme)</li>
                  <li>TrustMark Government Endorsed Quality</li>
                  <li>HIES (Home Insulation & Energy Systems Consumer Protection)</li>
                  <li>Manufacturer Approved Installer Status for leading brands (Tesla, GivEnergy, Myenergi, SolarEdge, etc.)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center">
                  <Sparkles className="h-6 w-6 mr-2 text-orange-500" />
                  Why Choose AJ Renewables?
                </h3>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li><strong>Extensive Experience & Expertise:</strong> Years of proven success in the renewables sector.</li>
                  <li><strong>Customer-Centric Approach:</strong> Tailored solutions, transparent communication, and dedicated post-installation support.</li>
                  <li><strong>Premium Quality Products:</strong> We use reliable, high-performance components from reputable manufacturers.</li>
                  <li><strong>Full Turnkey Service:</strong> From initial consultation and design to installation, commissioning, and handover.</li>
                  <li><strong>Free, No-Obligation Quotes:</strong> Detailed and transparent proposals.</li>
                  <li><strong>Local & Independent:</strong> Committed to serving our local communities with integrity.</li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
                  Stages
                </h3>
                <p className="text-slate-700 dark:text-slate-300 mb-6">GET YOUR FREE SOLAR DESIGN AND SEE YOUR ESTIMATED SOLAR SAVINGS</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {/* 2-column grid on medium screens and above */}
                  <StageCard
                    icon={Phone} // Using Phone icon for "Introduce Yourself"
                    title="Stage 1: INTRODUCE YOURSELF"
                    description="Fill out our quick form below, and one of our solar experts will give you a call within 24 hours to explain the process and get you booked in!"
                  />
                  <StageCard
                    icon={FileText} // Using FileText icon for "Remote survey & savings calculation"
                    title="Stage 2: Remote survey & savings calculation"
                    description="One of our senior solar advisors will call at a pre arranged time. We can now REMOTELY measure your roof space (no need for any longwinded site visit). We use your roof size, the direction your solar panels would face, current electricity usage and your current energy rates to work out your estimated savings and payback period for your specific system."
                  />
                  <StageCard
                    icon={Mail} // Using Mail icon for "RECEIVE YOUR QUOTE"
                    title="Stage 3: RECEIVE YOUR QUOTE"
                    description="After your initial consultation, you will receive a fully customised quotation for your solar panel installation. Don't worry, one of our specialists will talk you through your results. So you fully understand the figures and answer any questions you may have."
                  />
                  <StageCard
                    icon={SunMedium} // Using SunMedium icon for "PLUG INTO THE SUN"
                    title="Stage 4: PLUG INTO THE SUN"
                    description="Now it's time to book in your installation. One of our in-house installation teams will bring the project to life. With the online monitoring system, you can see exactly how your solar system is performing! You can also monitor your live house consumption to really get the best out of your new FREE energy."
                  />
                </div>
              </div>
            </div>
          )}
        </section>

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

        {/* Contact & Links Section */}
        <footer className="border-t border-slate-200 dark:border-slate-700 pt-10">
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-6 text-center">
            Get in Touch
          </h2>
          <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 text-slate-700 dark:text-slate-300">
            <a href="tel:08003680803" className="flex items-center gap-2 hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
              <Phone className="h-5 w-5" /> 0800 368 0803
            </a>
            <a href="mailto:enquiries@aj-renewables.com" className="flex items-center gap-2 hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
              <Mail className="h-5 w-5" /> enquiries@aj-renewables.com
            </a>
            <a href="https://www.facebook.com/ajrenewables" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
              <Facebook className="h-5 w-5" /> Facebook
            </a>
            <a 
              href="https://aj-renewables.co.uk/quote/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 transition-colors shadow-md hover:shadow-lg"
            >
              <FileText className="h-5 w-5" /> Get a Free Quote
            </a>
          </div>
          
          {/* Registered Office and Company Info */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
              <p className="text-base text-slate-700 dark:text-orange-400 mb-2">
                <strong>Registered Office Address:</strong> Unit 6, Lochgelly Business Park, Auchterderran Road, Lochgelly, Scotland, KY5 9HF
              </p>
              <p className="text-base text-slate-700 dark:text-orange-400">
                <strong>Company Number:</strong> SC691544
              </p>
          </div>

          {/* Finance & Regulation - Collapsible Section */}
          <div className="border-t border-slate-300 dark:border-slate-600 my-6 pt-6">
             <div
               className="flex items-center justify-between cursor-pointer"
               onClick={() => setIsFinanceCollapsed(!isFinanceCollapsed)}
               role="button"
               tabIndex={0}
               onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsFinanceCollapsed(!isFinanceCollapsed)}
               aria-expanded={!isFinanceCollapsed}
               aria-controls="finance-regulation-content"
             >
               <h3 className="text-lg font-semibold text-slate-800 dark:text-orange-400">
                 Finance & Regulation
               </h3>
               <ChevronDown className={`h-6 w-6 text-orange-600 dark:text-orange-500 transform transition-transform duration-300 ${isFinanceCollapsed ? '' : 'rotate-180'}`} />
            </div>
            {!isFinanceCollapsed && (
               <div id="finance-regulation-content" className="mt-4 space-y-3 text-sm text-slate-700 dark:text-orange-400 leading-relaxed">
                 <p>
                   A.J. Fire Protection and Electricals Ltd (t/a AJ Renewables) is an Introducer Appointed Representative
                   (Financial Services Register No. 1006977) of Phoenix Financial Consultants Limited (Phoenix).
                 </p>
                 <p>
                   Phoenix is a credit broker, not a lender. Phoenix is authorised and regulated by the Financial Conduct Authority (FRN: 539195),
                   and offers finance from its panel of lenders.
                 </p>
                 <p className="mt-2 font-bold">All finance subject to status and credit checks.</p>
               </div>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AJRenewablesInfoPage;
