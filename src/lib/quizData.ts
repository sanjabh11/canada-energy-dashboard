/**
 * Quiz Data Library - Derived from Help Content
 * 
 * 10+ questions per module covering Canadian energy systems.
 * Questions are educational and based on the helpContent.ts database.
 */

export interface QuizQuestion {
    id: string;
    text: string;
    options: string[];
    correctAnswer: number; // 0-indexed
    explanation: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    topic: string;
}

export interface QuizModule {
    id: string;
    title: string;
    description: string;
    duration: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    category: string;
    questions: QuizQuestion[];
    passingScore: number;
    locked?: boolean;
}

/**
 * Module 1: Canadian Energy Systems 101
 * Based on: dashboard.overview, chart.ontario_demand, chart.provincial_generation
 */
const MODULE_1_QUESTIONS: QuizQuestion[] = [
    {
        id: 'm1-q1',
        text: 'What unit is electricity demand typically measured in?',
        options: ['Kilowatts (kW)', 'Megawatts (MW)', 'Joules (J)', 'Volts (V)'],
        correctAnswer: 1,
        explanation: 'Electricity demand is measured in Megawatts (MW). 1 MW can power about 400-900 homes.',
        difficulty: 'beginner',
        topic: 'chart.ontario_demand'
    },
    {
        id: 'm1-q2',
        text: 'Which province primarily uses hydroelectric power for electricity generation?',
        options: ['Alberta', 'Ontario', 'Quebec', 'Saskatchewan'],
        correctAnswer: 2,
        explanation: 'Quebec uses almost all hydro power for electricity generation due to its abundant rivers and dams.',
        difficulty: 'beginner',
        topic: 'chart.provincial_generation'
    },
    {
        id: 'm1-q3',
        text: 'What type of energy source produces the MOST electricity in Ontario?',
        options: ['Wind', 'Solar', 'Nuclear', 'Natural Gas'],
        correctAnswer: 2,
        explanation: 'Ontario uses mostly nuclear and hydro for electricity. Nuclear provides consistent, low-emission baseload power.',
        difficulty: 'beginner',
        topic: 'chart.provincial_generation'
    },
    {
        id: 'm1-q4',
        text: 'When does electricity demand typically peak during the day?',
        options: ['2-5 AM', '9-11 AM', '4-7 PM', '10 PM - Midnight'],
        correctAnswer: 2,
        explanation: 'Demand peaks from 4-7 PM when people return home from work, turn on lights, and cook dinner.',
        difficulty: 'beginner',
        topic: 'chart.ontario_demand'
    },
    {
        id: 'm1-q5',
        text: 'What happens to electricity demand on HOT summer days?',
        options: ['It decreases', 'It stays the same', 'It increases due to air conditioning', 'It fluctuates randomly'],
        correctAnswer: 2,
        explanation: 'On hot summer days, demand spikes because air conditioners work harder to cool buildings.',
        difficulty: 'beginner',
        topic: 'chart.weather_correlation'
    },
    {
        id: 'm1-q6',
        text: 'Which energy source produces ZERO emissions during operation?',
        options: ['Natural Gas', 'Coal', 'Wind', 'Diesel'],
        correctAnswer: 2,
        explanation: 'Wind power produces zero emissions during operation - it only uses kinetic energy from moving air.',
        difficulty: 'beginner',
        topic: 'chart.provincial_generation'
    },
    {
        id: 'm1-q7',
        text: 'How often does the Real-Time Dashboard update?',
        options: ['Every 5 seconds', 'Every 30 seconds', 'Every 5 minutes', 'Every hour'],
        correctAnswer: 1,
        explanation: 'The dashboard updates every 30 seconds to provide near-real-time visibility into energy systems.',
        difficulty: 'beginner',
        topic: 'dashboard.overview'
    },
    {
        id: 'm1-q8',
        text: 'What is "baseload power"?',
        options: ['Power used only at night', 'Minimum power needed 24/7', 'Emergency backup power', 'Solar power during the day'],
        correctAnswer: 1,
        explanation: 'Baseload is the minimum electricity demand that must be met 24/7. Nuclear and hydro are ideal for baseload.',
        difficulty: 'intermediate',
        topic: 'chart.provincial_generation'
    },
    {
        id: 'm1-q9',
        text: 'Why does electricity demand drop between 2-5 AM?',
        options: ['Power plants shut down', 'Most people are sleeping', 'Grid maintenance occurs', 'Prices are highest'],
        correctAnswer: 1,
        explanation: 'Overnight, demand drops to its lowest because most people are sleeping and minimal usage occurs.',
        difficulty: 'beginner',
        topic: 'chart.ontario_demand'
    },
    {
        id: 'm1-q10',
        text: 'What is the main disadvantage of solar power?',
        options: ['It produces emissions', 'It only works during daytime', 'It is very expensive', 'It damages the environment'],
        correctAnswer: 1,
        explanation: 'Solar power is renewable and clean, but it only works during daytime when the sun is shining.',
        difficulty: 'beginner',
        topic: 'chart.provincial_generation'
    },
    {
        id: 'm1-q11',
        text: 'What does "intermittent" mean for renewable energy?',
        options: ['Always available', 'Output varies with weather', 'Produces emissions', 'Requires fuel'],
        correctAnswer: 1,
        explanation: 'Intermittent means the power output varies based on conditions - wind turbines need wind, solar needs sunlight.',
        difficulty: 'intermediate',
        topic: 'chart.provincial_generation'
    },
    {
        id: 'm1-q12',
        text: 'Approximately how many homes can 1 MW of power supply?',
        options: ['10-50', '100-200', '400-900', '2,000-5,000'],
        correctAnswer: 2,
        explanation: '1 Megawatt can power approximately 400-900 homes depending on their average consumption.',
        difficulty: 'intermediate',
        topic: 'chart.ontario_demand'
    }
];

/**
 * Module 2: Alberta Grid Operations
 * Based on: chart.alberta_supply_demand, ai-datacentre.*, hydrogen.*
 */
const MODULE_2_QUESTIONS: QuizQuestion[] = [
    {
        id: 'm2-q1',
        text: 'Who operates Alberta\'s electrical grid?',
        options: ['IESO', 'AESO', 'BC Hydro', 'Enmax'],
        correctAnswer: 1,
        explanation: 'The Alberta Electric System Operator (AESO) operates Alberta\'s grid and manages the electricity market.',
        difficulty: 'beginner',
        topic: 'chart.alberta_supply_demand'
    },
    {
        id: 'm2-q2',
        text: 'What makes Alberta\'s electricity market unique?',
        options: ['Government-controlled prices', 'Prices change minute-by-minute (deregulated)', 'Only renewable energy', 'No imports allowed'],
        correctAnswer: 1,
        explanation: 'Alberta has a "deregulated" electricity market where prices change minute-by-minute based on supply and demand, like a stock market.',
        difficulty: 'intermediate',
        topic: 'chart.alberta_supply_demand'
    },
    {
        id: 'm2-q3',
        text: 'Why must electricity supply ALWAYS be slightly higher than demand?',
        options: ['To charge batteries', 'To maintain stable voltage and prevent blackouts', 'To keep prices low', 'To export power'],
        correctAnswer: 1,
        explanation: 'Supply must exceed demand to maintain stable voltage (like water pressure) and have reserves ready for sudden spikes.',
        difficulty: 'intermediate',
        topic: 'chart.alberta_supply_demand'
    },
    {
        id: 'm2-q4',
        text: 'What is the "interconnection queue" in Alberta?',
        options: ['Power outage list', 'Projects waiting to connect to the grid', 'Customer service line', 'Transmission schedule'],
        correctAnswer: 1,
        explanation: 'The AESO interconnection queue is a list of all energy projects waiting to connect to Alberta\'s electrical grid.',
        difficulty: 'intermediate',
        topic: 'ai-datacentre.queue'
    },
    {
        id: 'm2-q5',
        text: 'What is the Phase 1 limit for new large loads in Alberta?',
        options: ['500 MW', '1,200 MW', '3,000 MW', '10,000 MW'],
        correctAnswer: 1,
        explanation: 'In 2024, Alberta imposed a Phase 1 limit of 1,200 MW for new large load connections to prevent grid instability.',
        difficulty: 'intermediate',
        topic: 'ai-datacentre.phase1'
    },
    {
        id: 'm2-q6',
        text: 'When electricity demand is HIGH and supply is LIMITED, what happens to prices?',
        options: ['Prices decrease', 'Prices stay the same', 'Prices increase', 'Prices become negative'],
        correctAnswer: 2,
        explanation: 'High demand + limited supply = higher prices. This is basic supply and demand economics.',
        difficulty: 'beginner',
        topic: 'chart.alberta_supply_demand'
    },
    {
        id: 'm2-q7',
        text: 'What does "pool price" mean in Alberta?',
        options: ['Price of swimming pools', 'Real-time wholesale electricity price', 'Fixed monthly rate', 'Retail price'],
        correctAnswer: 1,
        explanation: 'The AESO pool price is the real-time wholesale electricity price that changes every 5 minutes.',
        difficulty: 'intermediate',
        topic: 'chart.alberta_supply_demand'
    },
    {
        id: 'm2-q8',
        text: 'Why is Alberta attractive for AI data centres?',
        options: ['Free land', 'Cheap electricity from natural gas', 'No regulations', 'Free cooling only'],
        correctAnswer: 1,
        explanation: 'Alberta offers cheap electricity from natural gas and renewables, making it attractive for energy-intensive data centres.',
        difficulty: 'intermediate',
        topic: 'ai-datacentre.overview'
    },
    {
        id: 'm2-q9',
        text: 'What percentage of Alberta\'s peak demand does the interconnection queue represent?',
        options: ['10%', '30%', 'Over 80%', '200%'],
        correctAnswer: 2,
        explanation: 'The queue is now over 80% of Alberta\'s peak demand (12,100 MW), requiring significant grid expansion.',
        difficulty: 'advanced',
        topic: 'ai-datacentre.queue'
    },
    {
        id: 'm2-q10',
        text: 'How long can it take for a project to complete the interconnection process?',
        options: ['1 month', '6 months', '2-5+ years', '10+ years'],
        correctAnswer: 2,
        explanation: 'The full interconnection process including studies and construction can take 2-5 years or more.',
        difficulty: 'intermediate',
        topic: 'ai-datacentre.queue'
    },
    {
        id: 'm2-q11',
        text: 'What is the RRO (Regulated Rate Option)?',
        options: ['A renewable energy source', 'Default electricity rate for consumers', 'A type of power plant', 'Grid maintenance fee'],
        correctAnswer: 1,
        explanation: 'The RRO is the default electricity rate offered to Alberta consumers who don\'t choose a competitive retailer.',
        difficulty: 'beginner',
        topic: 'chart.alberta_supply_demand'
    },
    {
        id: 'm2-q12',
        text: 'What happens during peak demand hours?',
        options: ['Power plants shut down', 'Prices typically increase', 'Voltage decreases', 'Grid operators take breaks'],
        correctAnswer: 1,
        explanation: 'During peak demand hours (typically 4-7 PM), prices increase because more expensive generators must run.',
        difficulty: 'beginner',
        topic: 'chart.alberta_supply_demand'
    }
];

/**
 * Module 3: Renewable Technologies
 * Based on: hydrogen.*, chart.provincial_generation, page.renewable-optimization
 */
const MODULE_3_QUESTIONS: QuizQuestion[] = [
    {
        id: 'm3-q1',
        text: 'What does "Green Hydrogen" mean?',
        options: ['Hydrogen stored in green tanks', 'Hydrogen made using renewable electricity', 'Hydrogen from green plants', 'Hydrogen mixed with chlorine'],
        correctAnswer: 1,
        explanation: 'Green hydrogen is made using renewable electricity (wind, solar, hydro) to split water. It produces ZERO emissions!',
        difficulty: 'beginner',
        topic: 'hydrogen.colors'
    },
    {
        id: 'm3-q2',
        text: 'What is the main byproduct of hydrogen production via electrolysis?',
        options: ['Carbon dioxide', 'Methane', 'Oxygen', 'Nitrogen'],
        correctAnswer: 2,
        explanation: 'Electrolysis splits water (H₂O) into hydrogen and oxygen. The only byproduct is pure oxygen!',
        difficulty: 'beginner',
        topic: 'hydrogen.production'
    },
    {
        id: 'm3-q3',
        text: 'What is "Blue Hydrogen"?',
        options: ['Hydrogen dyed blue', 'Hydrogen from natural gas with carbon capture', 'Hydrogen from ocean water', 'Hydrogen stored at low temperature'],
        correctAnswer: 1,
        explanation: 'Blue hydrogen is made from natural gas using Steam Methane Reforming (SMR), but the CO₂ is captured and stored.',
        difficulty: 'intermediate',
        topic: 'hydrogen.colors'
    },
    {
        id: 'm3-q4',
        text: 'How many liters of diesel does 1 kg of hydrogen equal in energy?',
        options: ['0.5 liters', '1.5 liters', '3 liters', '10 liters'],
        correctAnswer: 2,
        explanation: '1 kg of hydrogen contains about the same energy as 3 liters of diesel fuel.',
        difficulty: 'intermediate',
        topic: 'hydrogen.pricing'
    },
    {
        id: 'm3-q5',
        text: 'What is the approximate cost of green hydrogen today?',
        options: ['$0.50/kg', '$1-2/kg', '$4-7/kg', '$20/kg'],
        correctAnswer: 2,
        explanation: 'Green hydrogen currently costs $4-7/kg, but prices are dropping 8-10% annually as technology improves.',
        difficulty: 'intermediate',
        topic: 'hydrogen.pricing'
    },
    {
        id: 'm3-q6',
        text: 'Why is hydrogen important for "hard-to-decarbonize" sectors?',
        options: ['It\'s the cheapest option', 'Batteries don\'t work for steel, cement, shipping', 'It\'s required by law', 'It tastes good'],
        correctAnswer: 1,
        explanation: 'Heavy industries like steel, cement, and shipping can\'t easily use batteries due to their high energy needs and weight constraints.',
        difficulty: 'intermediate',
        topic: 'hydrogen.overview'
    },
    {
        id: 'm3-q7',
        text: 'What is "Grey Hydrogen"?',
        options: ['Old hydrogen', 'Hydrogen from natural gas WITHOUT carbon capture', 'Hydrogen from coal', 'Low-quality hydrogen'],
        correctAnswer: 1,
        explanation: 'Grey hydrogen is made from natural gas without carbon capture, producing ~10 kg CO₂ per kg of hydrogen.',
        difficulty: 'beginner',
        topic: 'hydrogen.colors'
    },
    {
        id: 'm3-q8',
        text: 'How much energy (kWh) is needed to produce 1 kg of green hydrogen?',
        options: ['5-10 kWh', '20-30 kWh', '50-55 kWh', '100+ kWh'],
        correctAnswer: 2,
        explanation: 'Electrolysis requires about 50-55 kWh of electricity per kilogram of hydrogen produced.',
        difficulty: 'advanced',
        topic: 'hydrogen.production'
    },
    {
        id: 'm3-q9',
        text: 'What is PEM electrolysis?',
        options: ['A type of battery', 'Proton Exchange Membrane water splitting', 'Petroleum extraction method', 'Power export management'],
        correctAnswer: 1,
        explanation: 'PEM (Proton Exchange Membrane) is a type of electrolyzer that splits water into hydrogen - it has faster response times than alkaline.',
        difficulty: 'advanced',
        topic: 'hydrogen.production'
    },
    {
        id: 'm3-q10',
        text: 'What is Canada\'s hydrogen production target for 2030?',
        options: ['100,000 tonnes/year', '500,000 tonnes/year', '2.5 million tonnes/year', '10 million tonnes/year'],
        correctAnswer: 2,
        explanation: 'Alberta aims to produce 2.5 million tonnes of hydrogen per year by 2030 as part of Canada\'s Hydrogen Strategy.',
        difficulty: 'intermediate',
        topic: 'hydrogen.overview'
    },
    {
        id: 'm3-q11',
        text: 'What advantage does Canada\'s cold climate provide for green hydrogen?',
        options: ['Hydrogen freezes better', 'Less cooling needed for data centres', 'More wind power available', 'All of the above'],
        correctAnswer: 3,
        explanation: 'Canada\'s cold climate provides free air cooling for electrolyzers, abundant wind power, and excellent conditions for data centres.',
        difficulty: 'intermediate',
        topic: 'hydrogen.overview'
    },
    {
        id: 'm3-q12',
        text: 'By what year is green hydrogen expected to reach price parity with blue hydrogen?',
        options: ['2025', '2030', '2040', '2050'],
        correctAnswer: 1,
        explanation: 'Green hydrogen is expected to reach parity with blue hydrogen ($2-3/kg) by 2030 as electrolyzer costs drop.',
        difficulty: 'intermediate',
        topic: 'hydrogen.pricing'
    }
];

/**
 * Module 4: Carbon Markets & Pricing (Premium)
 * Based on: page.climate-policy, carbon.*, ccus.*
 */
const MODULE_4_QUESTIONS: QuizQuestion[] = [
    {
        id: 'm4-q1',
        text: 'What does TIER stand for in Alberta carbon pricing?',
        options: ['Tax on Industrial Energy Resources', 'Technology Innovation and Emissions Reduction', 'Total Industrial Emission Rates', 'Tiered Industrial Energy Rebate'],
        correctAnswer: 1,
        explanation: 'TIER stands for Technology Innovation and Emissions Reduction - Alberta\'s industrial carbon pricing system.',
        difficulty: 'intermediate',
        topic: 'carbon.tier'
    },
    {
        id: 'm4-q2',
        text: 'What is a "carbon offset"?',
        options: ['A penalty for emissions', 'A credit for reducing emissions elsewhere', 'A type of fuel', 'An emissions tax'],
        correctAnswer: 1,
        explanation: 'A carbon offset is a credit for emission reductions made elsewhere that can be purchased to compensate for emissions.',
        difficulty: 'beginner',
        topic: 'carbon.offsets'
    },
    {
        id: 'm4-q3',
        text: 'What does CCUS stand for?',
        options: ['Canadian Carbon Utility System', 'Carbon Capture, Utilization and Storage', 'Climate Change Universal Standards', 'Clean Coal Upgrade Service'],
        correctAnswer: 1,
        explanation: 'CCUS stands for Carbon Capture, Utilization and Storage - technology to capture CO₂ from industrial sources.',
        difficulty: 'beginner',
        topic: 'ccus.overview'
    },
    {
        id: 'm4-q4',
        text: 'What is the federal carbon price in Canada for 2024?',
        options: ['$50/tonne', '$80/tonne', '$170/tonne', '$250/tonne'],
        correctAnswer: 1,
        explanation: 'The federal carbon price is rising $15/year and reached $80/tonne in 2024, scheduled to hit $170/tonne by 2030.',
        difficulty: 'intermediate',
        topic: 'carbon.pricing'
    },
    {
        id: 'm4-q5',
        text: 'Where is captured CO₂ stored in CCUS projects?',
        options: ['In the atmosphere', 'In depleted oil/gas reservoirs underground', 'In the ocean', 'In forests'],
        correctAnswer: 1,
        explanation: 'Captured CO₂ is typically stored in deep underground geological formations like depleted oil and gas reservoirs.',
        difficulty: 'intermediate',
        topic: 'ccus.storage'
    },
    {
        id: 'm4-q6',
        text: 'What is "emissions intensity"?',
        options: ['Total emissions per year', 'Emissions per unit of production', 'Type of emission', 'Emission speed'],
        correctAnswer: 1,
        explanation: 'Emissions intensity measures emissions per unit of production (e.g., tonnes CO₂ per barrel of oil or per MWh of electricity).',
        difficulty: 'intermediate',
        topic: 'carbon.intensity'
    },
    {
        id: 'm4-q7',
        text: 'What percentage of CO₂ can blue hydrogen production capture?',
        options: ['25-35%', '50-60%', '85-95%', '100%'],
        correctAnswer: 2,
        explanation: 'Blue hydrogen production captures 85-95% of CO₂ emissions using Carbon Capture and Storage technology.',
        difficulty: 'intermediate',
        topic: 'hydrogen.colors'
    },
    {
        id: 'm4-q8',
        text: 'What is "carbon leakage"?',
        options: ['CO₂ escaping from storage', 'Emissions moving to jurisdictions with no carbon price', 'Oil pipeline leaks', 'Forest carbon release'],
        correctAnswer: 1,
        explanation: 'Carbon leakage occurs when strict carbon policies cause businesses to move to regions with weaker rules, shifting rather than reducing emissions.',
        difficulty: 'advanced',
        topic: 'carbon.leakage'
    },
    {
        id: 'm4-q9',
        text: 'What is the Quest CCS project in Alberta?',
        options: ['A research study', 'Shell\'s operational CO₂ storage facility', 'A carbon trading platform', 'An emissions monitoring system'],
        correctAnswer: 1,
        explanation: 'Quest is Shell\'s operational CCS facility in Alberta that has captured and stored over 8 million tonnes of CO₂.',
        difficulty: 'advanced',
        topic: 'ccus.projects'
    },
    {
        id: 'm4-q10',
        text: 'How much does captured CO₂ add to the cost of hydrogen per kg?',
        options: ['$0.10', '$0.50-1.00', '$5.00', '$10.00'],
        correctAnswer: 1,
        explanation: 'Carbon capture adds approximately $0.50-1.00 per kg to the cost of hydrogen production.',
        difficulty: 'advanced',
        topic: 'hydrogen.pricing'
    },
    {
        id: 'm4-q11',
        text: 'What is Enhanced Oil Recovery (EOR)?',
        options: ['A new drilling method', 'Using CO₂ to extract more oil from wells', 'Renewable oil production', 'Oil spill cleanup'],
        correctAnswer: 1,
        explanation: 'EOR involves injecting CO₂ into oil reservoirs to extract additional oil while permanently storing the carbon underground.',
        difficulty: 'advanced',
        topic: 'ccus.utilization'
    },
    {
        id: 'm4-q12',
        text: 'What is Canada\'s net-zero emissions target year?',
        options: ['2030', '2040', '2050', '2060'],
        correctAnswer: 2,
        explanation: 'Canada has committed to achieving net-zero greenhouse gas emissions by 2050.',
        difficulty: 'beginner',
        topic: 'carbon.targets'
    }
];

/**
 * Module 5: Energy Resilience & Security
 * Based on: page.resilience, page.security, page.arctic-energy
 */
const MODULE_5_QUESTIONS: QuizQuestion[] = [
    {
        id: 'm5-q1',
        text: 'What is "energy resilience"?',
        options: ['Cheap energy', 'Ability to withstand and recover from disruptions', 'Maximum power output', 'Energy efficiency'],
        correctAnswer: 1,
        explanation: 'Energy resilience is the ability to prepare for, withstand, and recover from disruptions to energy systems.',
        difficulty: 'beginner',
        topic: 'page.resilience'
    },
    {
        id: 'm5-q2',
        text: 'What is a "microgrid"?',
        options: ['A small power meter', 'A local grid that can operate independently', 'A smart thermostat', 'A solar panel'],
        correctAnswer: 1,
        explanation: 'A microgrid is a local energy grid that can disconnect from the main grid and operate independently during emergencies.',
        difficulty: 'intermediate',
        topic: 'page.resilience'
    },
    {
        id: 'm5-q3',
        text: 'What lesson did the 2021 Texas blackouts teach about energy resilience?',
        options: ['Solar is unreliable', 'Diversified energy sources are essential', 'Wind power caused the problem', 'Nuclear plants are dangerous'],
        correctAnswer: 1,
        explanation: 'Texas showed what happens when systems aren\'t resilient - extreme cold + natural gas shortages = millions without power. Diversification helps prevent this.',
        difficulty: 'intermediate',
        topic: 'page.resilience'
    },
    {
        id: 'm5-q4',
        text: 'What is "redundancy" in energy systems?',
        options: ['Unnecessary equipment', 'Backup systems and multiple power paths', 'Old technology', 'Power waste'],
        correctAnswer: 1,
        explanation: 'Redundancy means having multiple power sources and transmission paths so that if one fails, others can take over.',
        difficulty: 'beginner',
        topic: 'page.resilience'
    },
    {
        id: 'm5-q5',
        text: 'Why are cyber attacks a threat to energy systems?',
        options: ['They slow down websites', 'They can disable power grid controls', 'They steal money', 'They affect social media only'],
        correctAnswer: 1,
        explanation: 'Cyber attacks on power grid control systems (SCADA) can disable generators, open circuits, and cause widespread blackouts.',
        difficulty: 'intermediate',
        topic: 'page.security'
    },
    {
        id: 'm5-q6',
        text: 'What is "smart grid" technology?',
        options: ['AI-powered robots', 'Automated systems that can reroute power during failures', 'Wireless electricity', 'Solar-powered grid'],
        correctAnswer: 1,
        explanation: 'Smart grids use automated systems with sensors and controls to detect problems and reroute power to prevent blackouts.',
        difficulty: 'intermediate',
        topic: 'page.resilience'
    },
    {
        id: 'm5-q7',
        text: 'What unique energy challenges do Arctic communities face?',
        options: ['Too much sunlight', 'Isolation and diesel dependence', 'Excess wind power', 'Overheating'],
        correctAnswer: 1,
        explanation: 'Arctic communities are often isolated and dependent on expensive diesel fuel delivered by barge or airplane.',
        difficulty: 'intermediate',
        topic: 'page.arctic-energy'
    },
    {
        id: 'm5-q8',
        text: 'How does energy storage improve grid resilience?',
        options: ['Saves money', 'Bridges supply gaps during outages', 'Heats homes', 'Reduces emissions'],
        correctAnswer: 1,
        explanation: 'Energy storage (like batteries) can provide power during generator failures or transmission problems, bridging gaps until normal supply resumes.',
        difficulty: 'intermediate',
        topic: 'page.resilience'
    },
    {
        id: 'm5-q9',
        text: 'What is "islanding" in microgrid operation?',
        options: ['Building on islands', 'Disconnecting from the main grid to operate independently', 'Power export', 'Peak shaving'],
        correctAnswer: 1,
        explanation: 'Islanding is when a microgrid disconnects from the main grid and operates independently using local generation.',
        difficulty: 'advanced',
        topic: 'page.resilience'
    },
    {
        id: 'm5-q10',
        text: 'What percentage of electricity does Quebec generate from hydropower?',
        options: ['50%', '75%', 'Over 95%', '100%'],
        correctAnswer: 2,
        explanation: 'Quebec generates over 95% of its electricity from hydropower, making it one of the cleanest grids in North America.',
        difficulty: 'beginner',
        topic: 'chart.provincial_generation'
    },
    {
        id: 'm5-q11',
        text: 'What is "N-1 reliability" in grid planning?',
        options: ['Having N minus 1 generators', 'Grid can survive any single component failure', 'Running at 99% capacity', 'Having one backup line'],
        correctAnswer: 1,
        explanation: 'N-1 reliability means the grid is designed to continue operating normally even if any single component (line, generator) fails.',
        difficulty: 'advanced',
        topic: 'page.resilience'
    },
    {
        id: 'm5-q12',
        text: 'What role do batteries play in renewable energy resilience?',
        options: ['They replace solar panels', 'They store excess power for when sun/wind aren\'t available', 'They generate electricity', 'They heat homes'],
        correctAnswer: 1,
        explanation: 'Batteries store excess renewable energy during sunny/windy periods for use when conditions are less favorable.',
        difficulty: 'beginner',
        topic: 'page.resilience'
    }
];

/**
 * Module 6: Indigenous Energy Partnerships
 * Based on: page.indigenous, metric.indigenous.*
 */
const MODULE_6_QUESTIONS: QuizQuestion[] = [
    {
        id: 'm6-q1',
        text: 'What does FPIC stand for?',
        options: ['Federal Power Integration Council', 'Free, Prior and Informed Consent', 'First Priority Investment Committee', 'Federal Provincial Indigenous Commission'],
        correctAnswer: 1,
        explanation: 'FPIC (Free, Prior and Informed Consent) is a right that allows Indigenous peoples to give or withhold consent to projects affecting their lands.',
        difficulty: 'intermediate',
        topic: 'page.indigenous'
    },
    {
        id: 'm6-q2',
        text: 'What is UNDRIP?',
        options: ['A UN energy fund', 'United Nations Declaration on the Rights of Indigenous Peoples', 'Universal Nuclear Development Rights Protocol', 'United Nations Disaster Recovery Plan'],
        correctAnswer: 1,
        explanation: 'UNDRIP is the United Nations Declaration on the Rights of Indigenous Peoples, which Canada has committed to implementing.',
        difficulty: 'intermediate',
        topic: 'page.indigenous'
    },
    {
        id: 'm6-q3',
        text: 'What is the "duty to consult"?',
        options: ['Hiring consultants', 'Government obligation to discuss projects with affected Indigenous communities', 'Private company policy', 'Environmental assessment'],
        correctAnswer: 1,
        explanation: 'Canada has a legal duty to consult with Indigenous communities on projects that may affect their lands, rights, or interests.',
        difficulty: 'beginner',
        topic: 'page.indigenous'
    },
    {
        id: 'm6-q4',
        text: 'What is Traditional Ecological Knowledge (TEK)?',
        options: ['Modern environmental science', 'Indigenous knowledge about local ecosystems developed over generations', 'Technology education programs', 'Environmental regulations'],
        correctAnswer: 1,
        explanation: 'TEK is Indigenous knowledge about local ecosystems, seasons, and species developed through generations of observation and relationship with the land.',
        difficulty: 'intermediate',
        topic: 'page.indigenous'
    },
    {
        id: 'm6-q5',
        text: 'What is a good consultation completion rate?',
        options: ['30-40%', '50-60%', '90-100%', 'Any rate is fine'],
        correctAnswer: 2,
        explanation: 'A 90-100% completion rate indicates excellent track record and strong relationships between proponents and communities.',
        difficulty: 'intermediate',
        topic: 'metric.indigenous.completion_rate'
    },
    {
        id: 'm6-q6',
        text: 'What is a "benefit-sharing agreement"?',
        options: ['Sharing profits equally', 'Contract ensuring Indigenous communities receive fair economic benefits from projects', 'Tax exemption', 'Land transfer'],
        correctAnswer: 1,
        explanation: 'Benefit-sharing agreements ensure Indigenous communities receive fair economic participation from energy development on their territories.',
        difficulty: 'intermediate',
        topic: 'page.indigenous'
    },
    {
        id: 'm6-q7',
        text: 'How long should a good consultation process take?',
        options: ['1-2 weeks', '1-2 months', '6-18 months', '5+ years'],
        correctAnswer: 2,
        explanation: 'Good consultations take 6-18 months. Rushing leads to poor outcomes - quality matters more than speed.',
        difficulty: 'intermediate',
        topic: 'chart.indigenous.consultation_status'
    },
    {
        id: 'm6-q8',
        text: 'What happens if consultation is incomplete?',
        options: ['Nothing', 'Project continues anyway', 'Legal challenges can stop projects', 'Fines are issued'],
        correctAnswer: 2,
        explanation: 'Under Canadian law, incomplete consultations can lead to legal challenges that may stop or delay projects.',
        difficulty: 'intermediate',
        topic: 'metric.indigenous.completion_rate'
    },
    {
        id: 'm6-q9',
        text: 'What is the TRC Call to Action #92 about?',
        options: ['School curriculum', 'Indigenous participation in energy decision-making', 'Healthcare', 'Sports'],
        correctAnswer: 1,
        explanation: 'TRC Call to Action #92 emphasizes the importance of Indigenous participation in energy and economic decision-making.',
        difficulty: 'advanced',
        topic: 'page.indigenous'
    },
    {
        id: 'm6-q10',
        text: 'What does an Indigenous-LED energy project mean?',
        options: ['Projects using LED lights', 'Projects owned and operated by Indigenous communities', 'Projects on Indigenous land', 'Projects near Indigenous communities'],
        correctAnswer: 1,
        explanation: 'Indigenous-led projects are owned and operated by Indigenous communities, ensuring they control the benefits and decisions.',
        difficulty: 'beginner',
        topic: 'page.indigenous'
    },
    {
        id: 'm6-q11',
        text: 'What is "energy sovereignty" for Indigenous communities?',
        options: ['Free electricity', 'Control over energy production and use on their territories', 'Government subsidies', 'Export rights'],
        correctAnswer: 1,
        explanation: 'Energy sovereignty means Indigenous communities have control over energy production, distribution, and use on their territories.',
        difficulty: 'intermediate',
        topic: 'page.indigenous'
    },
    {
        id: 'm6-q12',
        text: 'What is OCAP® in Indigenous data governance?',
        options: ['A renewable energy standard', 'Ownership, Control, Access, Possession principles for data', 'Environmental monitoring', 'Carbon offset program'],
        correctAnswer: 1,
        explanation: 'OCAP® (Ownership, Control, Access, Possession) is a set of principles for Indigenous data governance and sovereignty.',
        difficulty: 'advanced',
        topic: 'page.indigenous'
    }
];

/**
 * Export all quiz modules
 */
export const QUIZ_MODULES: QuizModule[] = [
    {
        id: 'module-1',
        title: 'Canadian Energy Systems 101',
        description: 'Master the basics of generation, transmission, and distribution.',
        duration: '15 min',
        difficulty: 'Beginner',
        category: 'Fundamentals',
        questions: MODULE_1_QUESTIONS,
        passingScore: 70
    },
    {
        id: 'module-2',
        title: 'Alberta Grid Operations',
        description: 'Understand the AESO, energy markets, and grid reliability.',
        duration: '20 min',
        difficulty: 'Intermediate',
        category: 'Market Ops',
        questions: MODULE_2_QUESTIONS,
        passingScore: 70
    },
    {
        id: 'module-3',
        title: 'Renewable Technologies',
        description: 'Solar, wind, hydrogen, and storage integration technologies.',
        duration: '15 min',
        difficulty: 'Intermediate',
        category: 'Technology',
        questions: MODULE_3_QUESTIONS,
        passingScore: 70
    },
    {
        id: 'module-4',
        title: 'Carbon Markets & Pricing',
        description: 'Deep dive into TIER, carbon offsets, CCUS, and compliance.',
        duration: '25 min',
        difficulty: 'Advanced',
        category: 'Policy',
        questions: MODULE_4_QUESTIONS,
        passingScore: 70,
        locked: true
    },
    {
        id: 'module-5',
        title: 'Energy Resilience & Security',
        description: 'Grid resilience, cyber security, and climate adaptation.',
        duration: '18 min',
        difficulty: 'Intermediate',
        category: 'Security',
        questions: MODULE_5_QUESTIONS,
        passingScore: 70,
        locked: true
    },
    {
        id: 'module-6',
        title: 'Indigenous Energy Partnerships',
        description: 'FPIC, UNDRIP, TEK, and Indigenous-led energy projects.',
        duration: '20 min',
        difficulty: 'Intermediate',
        category: 'Policy',
        questions: MODULE_6_QUESTIONS,
        passingScore: 70,
        locked: true
    }
];

/**
 * Get a module by ID
 */
export function getQuizModule(id: string): QuizModule | undefined {
    return QUIZ_MODULES.find(m => m.id === id);
}

/**
 * Get all unlocked modules
 */
export function getUnlockedModules(): QuizModule[] {
    return QUIZ_MODULES.filter(m => !m.locked);
}

/**
 * Get total question count
 */
export function getTotalQuestionCount(): number {
    return QUIZ_MODULES.reduce((sum, m) => sum + m.questions.length, 0);
}
