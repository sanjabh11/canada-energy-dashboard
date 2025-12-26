Optimizing the Canada Energy Intelligence Platform for Whop Marketplace Success: Strategic Research & Value Proposition Analysis
Executive Strategic Overview
The intersection of digital marketplace dynamics and the evolving Canadian energy landscape presents a unique arbitrage opportunity for the Canada Energy Intelligence Platform. As the global creator economy shifts from pure entertainment toward utility and education—valued at over $5 billion and growing 1—platforms like Whop are becoming critical infrastructure for monetizing specialized knowledge. However, current market saturation in the Whop ecosystem is heavily skewed toward "wealth creation" niches such as day trading, dropshipping, and sports betting. There exists a significant "blue ocean" opportunity for a platform that applies the high-engagement, community-driven mechanics of these wealth apps to the high-stakes, technically complex world of energy management.
This report provides an exhaustive, multi-dimensional analysis aimed at optimizing the Canada Energy Intelligence Platform. It synthesizes data regarding Whop marketplace trends, Canadian regulatory shifts (specifically the 2025 TIER amendments and the transition to the Rate of Last Resort), and behavioral psychology in gamified learning. The core thesis of this analysis is that energy education typically suffers from a bifurcation: it is either accessible but dry (government resources like AESO) or high-quality but exclusionary (professional certifications like CIET). By positioning the platform in the "missing middle"—leveraging the urgency of rising energy costs and regulatory complexity—we can create a high-retention, high-LTV (Lifetime Value) product.
The analysis that follows is structured to guide the transformation of the platform from a simple quiz app into a robust "Energy Operating System" for professionals and consumers alike. It navigates the technical constraints of the Whop iframe architecture, the specific pedagogical needs of municipal energy managers, and the viral mechanics required to scale in a competitive digital storefront.
Part 1: Whop Marketplace Ecosystem Analysis
1.1 Top Performing Whop Apps Research & Strategic Benchmarking
To engineer success for the Canada Energy Intelligence Platform, one must first deconstruct the DNA of the current market leaders on Whop. While few direct competitors exist in the "Energy" category, the structural elements of successful apps in adjacent "Wealth" and "Education" categories provide a blueprint for monetization and retention. The most successful apps on Whop do not merely sell content; they sell outcomes, identity, and access.
The "Wealth" Community Archetype
The dominant category on Whop is undeniably wealth creation. Apps like Wealth Club and various trading communities demonstrate that users are willing to pay significant recurring subscriptions ($49 - $299/mo) for perceived financial advantages.2
Feature / Metric
Wealth Club (Trading Community)
Voss Trading Education
Strategic Implication for Energy Platform
Core Value Prop
"Unlock day trading skills & credit mastery." Focus on financial freedom and lifestyle.
"Empower with skills... 20 years experience." Authority-driven mentorship.
Pivot from "Education" to "ROI": The Energy app shouldn't just teach; it should promise financial savings (for consumers) or career advancement (for pros).
Key Features
Daily market analysis, live Zoom calls, active Discord chat, proprietary signals.
Weekly live training, video library, "Trade of the Day" breakdowns.
Live "Grid Alerts": Instead of stock signals, push notifications for AESO grid alerts or pool price spikes create daily active usage.
Pricing Model
Freemium entry -> $49/mo -> $299/mo (Mentorship).
Subscription ($49.99/mo) recurring.
Tiered Access: Free users get reactive data (what happened); Paid users get proactive data (what will happen) and tools.
Onboarding
Frictionless via Discord/Telegram. Immediate "Start Here" module.
Video-first onboarding establishing instructor authority.
Zero-Friction Entry: Allow immediate value realization (e.g., a bill calculator) before forcing account creation or payment.
Community
"Win" channels for social proof. Role badges based on earnings.
Mentorship channels. Peer review of trades.
"Savings Showdown": A channel where users post their bill savings or grant wins using the platform's tools.

The "Utility & Gamification" Archetype
While wealth apps drive revenue through greed/ambition, utility apps drive retention through habit formation. JouleBug serves as a critical external benchmark for gamified sustainability.3
JouleBug Analysis: This app succeeds by making invisible actions (saving energy) visible and social. It uses "Challenges" (e.g., Plastic Free July) to synchronize user activity.
Insight: The Energy Intelligence Platform must use temporal challenges. For example, a "January Grid Resilience Challenge" aligns with the coldest month of the year in Alberta, creating a natural hook for engagement.
Gamification Mechanics: JouleBug uses pins, badges, and leaderboards. The Energy Platform should adopt this but elevate it to professional credibility—badges that look like certifications (e.g., "Level 1 Grid Analyst") rather than just game tokens.4
Synthesis of Success Factors:
The top 10 apps on Whop share specific DNA traits:
High-Frequency Utility: They are used daily or weekly, not once a month.
Community Validation: Users stay because they don't want to leave the "tribe."
Direct ROI: The cost of the subscription is framed as an investment that pays for itself.
Live Components: Access to a human expert or live data stream justifies recurring billing over one-time purchases.
1.2 Whop App Store Guidelines & Technical Deep Dive
Navigating the Whop App Store approval process is a binary risk factor: failure to comply results in rejection, delaying time-to-market. The research into Whop's developer documentation and general App Store guidelines reveals a stringent set of requirements focused on user experience, privacy, and technical integrity.
Approval Requirements & Common Rejection Vectors
Whop, aligning with broader industry standards like Apple's App Store guidelines, enforces strict quality control.
The "Web Wrapper" Prohibition: A primary rejection reason is submitting an app that offers no distinct functionality over a mobile website.5 To avoid this, the Energy Platform must leverage native capabilities. This includes push notifications for grid alerts, offline access to quiz content (critical for energy resilience topics), and deep integration with the Whop dashboard API.
Authentication & Security: Apps embedded via iframe must utilize the x-whop-user-token header for seamless authentication.6 A common failure point is forcing users to log in a second time within the iframe. The platform must implement a "silent auth" flow where the Whop JWT (JSON Web Token) is automatically parsed to create or resume the user session.
Privacy & Data Transparency: Given the sensitive nature of energy data (consumption patterns, potential bill uploads), the app will be scrutinized for privacy compliance.7 The Privacy Policy must be explicit about data usage. If the "Rate Watchdog" feature collects bill data, the policy must state exactly how long that data is stored and that it is not sold to third-party retailers without consent.
Payment Circumvention: Whop strictly forbids avoiding its billing ecosystem. Any "Upsell" within the app must trigger the Whop native checkout modal.8 Attempting to link to a Stripe checkout or external site for payment is an immediate rejection trigger.
Performance Standards
Whop apps operate within an iframe, making performance optimization critical to avoid a sluggish user experience that leads to churn.
Bundle Size & Load Times: While hard limits are not always published, maintaining an initial JavaScript bundle size under 2MB is a best practice for iframe-based apps to ensure a First Contentful Paint (FCP) of under 1.5 seconds.9
Skeleton Loading States: The app must display a "skeleton" or loading animation immediately while fetching dynamic data (like live AESO pool prices). Displaying a blank white screen during data fetch is a common UX failure that can lead to rejection or user abandonment.11
Authentication Best Practices
Successful apps on Whop handle authentication by verifying the JWT on every request. The recommended flow involves:
Client-Side: The iframe SDK (@whop/iframe) retrieves the current user token.
Server-Side: The backend middleware verifies the token signature against Whop's public keys.
Session Creation: If valid, the backend creates a shadow session for the user, mapping their Whop ID to internal platform data (quiz scores, certificate progress).6
Part 2: Canadian Energy Education Market Landscape
2.1 Competitor Analysis: The "Missing Middle"
The Canadian energy education market is characterized by a polarization between accessibility and quality. On one end, there are free, government-mandated resources that are factually accurate but pedagogically dry. On the other end are expensive, high-barrier professional certifications.
Energy Toolbase Academy (The B2B Heavyweight)
Positioning: High-end B2B software training.
Pricing: Subscription models ranging from $170 to $224 per month.12
Offering: Deep technical training on their specific software, modeling solar/storage economics, and proposal generation.
Gap: Their content is inextricably linked to their expensive software tool. There is no entry-level "theory" track for someone who isn't already a solar developer. They lack broad market education (e.g., TIER regulations, general grid dynamics).
Opportunity: We can offer the "Pre-Toolbase" education. Before a user pays $200/mo for software, they need to understand the market. Our platform serves as the feeder school.
AESO Virtual Learning (The Authoritative incumbent)
Positioning: Public utility education.
Pricing: Free.13
Offering: Modules on "Understanding the Grid," "Market Structure," and "Ancillary Services."
Gap: The delivery is academic and passive. There is no gamification, no community, and crucially, no "career signal" (like a LinkedIn badge) that carries weight outside of the AESO's own ecosystem. It is purely informational, not transformational.
Opportunity: We can curate AESO's raw data and concepts into engaging, bite-sized, gamified challenges. We add the "Why this matters to your wallet/career" layer that the regulator cannot provide.
CIET Canada (The Gold Standard)
Positioning: Professional certification body.
Pricing: High-ticket. A Certified Energy Manager (CEM) course costs ~$2,670.14
Offering: Comprehensive, intense 5-day training sessions leading to recognized designations.
Gap: Accessibility. The cost and time commitment are prohibitive for early-career professionals, students, or municipal staff with limited budgets.
Opportunity: The "CEM Prep" product. Just as apps prepare users for the LSAT or MCAT, our platform can prepare users for the CIET exams at a fraction of the cost ($99/mo vs $2,600).
Indigenous Clean Energy (ICE)
Positioning: Community empowerment.
Offering: Project-based learning focused on community energy planning and ownership.15
Gap: Highly specialized and often restricted to partner communities.
Opportunity: We can incorporate Indigenous partnership modules (Topic 6) that respect OCAP principles, acting as a bridge for non-Indigenous developers to understand how to properly partner with communities, a massive knowledge gap in the industry.
2.2 Professional Certification Landscape & Strategy
The "credentialing gap" is the platform's strongest monetization lever. In Canada, energy certifications are the currency of career advancement.
CEM (Certified Energy Manager): This is the apex credential. It requires understanding codes, audits, purchasing, and finance. The exam is rigorous (~130 questions).16
Strategy: Develop a specific "CEM Prep Track" within the app. Using the spaced repetition algorithms found in language apps, we can help users memorize the complex formulas and code requirements needed for the exam.
TIER Compliance Officers: With the 2025 amendments to the Technology Innovation and Emissions Reduction (TIER) regulation, a new class of professional is needed. These individuals need to understand the new "Direct Investment Credits" and "Opt-out" protocols for small emitters.17
Strategy: Be the first to market with a "2025 TIER Update" micro-credential. Traditional colleges take years to update curriculum; we can do it in weeks.
Municipal Energy Managers: Funded often by the MCCAC, these managers need practical, operational knowledge (how to read a bill, how to write a grant application) rather than just theory.19
Strategy: Create a "Municipal Toolkit" module that includes templates for grant applications and energy audits, directly addressing their daily workflow needs.
Part 3: Quiz Content Quality Assessment & Enhancement
3.1 Current Quiz Content Audit & Strategic Gap Analysis
The existing 72-question bank provides a foundational layer but lacks the timeliness and critical edge required to engage professionals in 2025. The energy market is dynamic; static content quickly becomes obsolete.
Module 1: Canadian Energy Systems 101
Current State: Basics of generation mix and baseload.
Gap: Fails to address the immediate consumer reality of the 2024/2025 "Grid Alerts." Users know the grid is stressed; they need to understand why in the context of recent events.
Enhancement: Add questions analyzing the January 2024 extreme cold event, specifically the mechanics of the emergency alert that dropped 200 MW of load in minutes.20
Module 2: Alberta Grid Operations
Current State: Pool price and AESO role.
Gap: Needs to cover the Rate of Last Resort (RoLR) transition that occurred on Jan 1, 2025.21 This is the single biggest billing change for consumers in a decade.
Enhancement: Scenarios asking users to calculate bill differences between RRO and RoLR, and understanding the 2-year fixed nature of the new rate.
Module 3: Renewable Technologies
Current State: Hydrogen colors, solar costs.
Gap: Missing the critical regulatory context of the "Buffer Zones" and "Pristine Viewscapes" policy that now restricts wind development in ~35-40% of Alberta.22 This is vital knowledge for developers.
Enhancement: Map-based questions identifying restricted zones for renewable siting.
Module 4: Carbon Markets & Pricing
Current State: TIER basics.
Gap: Completely misses the December 2025 TIER Amendments. Professionals need to know about the new "Credit Reactivation" and "Direct Investment" options.18
Enhancement: Detailed case studies on calculating compliance obligations under the new 2025/2026 tightening standards.
3.2 Quiz Question Enhancement Research
To elevate the platform to an "Expert" level, new questions must move beyond recall and into synthesis and evaluation (higher-order thinking).
High-Value Question Additions (Examples):

Topic
Question Concept
Source / Rationale
RoLR Mechanics
"Under the 2025 Rate of Last Resort (RoLR) regulation, what is the maximum percentage the rate can adjust after its initial two-year term?" (Answer: 10%)
21 Tests understanding of price stability mechanisms vs. market volatility.
TIER Strategy
"A facility generates Investment Credits in 2025 via direct technology investment. What is the earliest compliance year these credits can be applied?" (Answer: 2026)
18 Critical for long-term financial planning for compliance officers.
Renewable Siting
"New 2025 regulations enforce an 'Agriculture First' approach. Renewable projects on Class 1 & 2 lands are prohibited unless they demonstrate what?" (Answer: Co-existence)
23 Essential knowledge for landmen and project developers.
Grid Dynamics
"During the Jan 2024 grid emergency, ~200 MW of load was shed immediately following the mobile alert. What consumer behavior primarily drove this?" (Answer: Voluntary curtailment)
20 Illustrates the power of demand-side management.
Indigenous Finance
"Which funding stream of the AICEI is specifically designed to support early-stage feasibility studies for community-owned generation?" (Answer: AICEI Capacity Building)
15 Connects theoretical partnership goals with practical funding mechanisms.

Part 4: Experience Enhancement & Gamification Strategy
4.1 Rate Watchdog Quiz Enhancement
The "Rate Watchdog" is the platform's viral hook. While the certification tracks serve professionals, the Watchdog serves the 4+ million Albertans confused by their electricity bills.
The Problem: The shift to RoLR in Jan 2025 21 has created mass confusion. Is the fixed rate of ~12¢/kWh good? Should they switch to a competitive retailer offering 9¢?
The Solution: A "Rate Calculator Wizard."
Input: User enters their current retailer and monthly usage (or uploads a bill).
Processing: The app compares their effective rate against the live competitive market average and the RoLR benchmark.
Output: "You are overpaying by $45/month. Switch to to save $540/year."
Engagement Loop: Users are encouraged to re-check every month as competitive rates fluctuate. This creates monthly active users (MAU).
4.2 Energy Quiz Game Enhancement: The "Energy Trader" Simulation
Gamification in professional education often fails because it is too childish. To engage energy professionals, the gamification must simulate risk and competence, not just points.
Mechanic: The "Energy Trader" Simulation.
Instead of abstract points, users start with a "Virtual Capital" balance.
Scenario: "A cold front is approaching. Wind generation is forecast to drop to 5%. Gas peakers are offline. Do you (A) Buy forward contracts at $120/MWh, or (B) Wait for the spot market?"
Outcome: Real-world data from the Jan 2024 crisis 20 determines the result. If they waited, they lose virtual capital as prices hit the $999 cap.
Psychology: This taps into the "Wealth" motivation dominant on Whop. It turns learning into a simulation of high-stakes trading.
4.3 Certificate Preview & Social Portability
Certificates must be designed for the "LinkedIn flex."
Verification & Trust: Certificates should host a unique QR code linking to a verification page on the Whop app. This prevents fraud and, crucially, acts as a referral loop—when a colleague scans the code to verify, they are introduced to the app.
Micro-Credentialing: Break the massive "Energy Expert" certification into stackable badges: "TIER Specialist," "RoLR Analyst," "Grid Resilience Pro." This allows for more frequent dopamine hits and sharing opportunities.
4.4 Dashboard Demo Enhancement
For B2B sales (municipalities), the dashboard is the product. It must visually convey authority and control.
Visual Language: Utilize "Dark Mode" data visualization, mimicking professional SCADA systems or Bloomberg terminals.11 This signals "Pro Tool" rather than "Consumer App."
Key Metrics:
Real-Time Pool Price Ticker: A scrolling ticker of the AESO pool price creates a sense of live urgency.
Grid Stress Gauge: A visual meter showing the current gap between Supply and Demand, color-coded to match AESO alert levels (Green, Yellow, Red).
Part 5: Additional Experience & Viral Features
5.1 New Experiences to Consider
The "Grid Alert" Widget:
A home-screen widget for iOS/Android that displays the current AESO Grid Status.
Utility: Users glance at their phone to see if they should run their dishwasher.
Retention: Keeps the brand visible 24/7. When the widget turns red (Alert), app opens spike.
Grant Finder Database:
A searchable, filtered database of the ~50+ active energy grants in Canada (e.g., MCCAC, SEMI, AICEI).
Value: One successful grant application ($50k+) pays for a lifetime of app subscriptions. This is the ultimate B2B value proposition.
5.2 Viral/Shareable Features
"My Energy Archetype" Quiz:
"Are you a Baseload Bear or a Solar Flare?" A personality-style quiz that categorizes users based on their risk tolerance and energy habits.
Viral Mechanic: These are highly shareable on social media, unlike dry test scores.
"Savings Showdown" Leaderboard:
Users post verified bill savings. "I saved $300 this month using the Rate Watchdog." This creates social proof and FOMO (Fear Of Missing Out).
Part 6: Monetization & Conversion Optimization
6.1 Pricing Research & Strategy
The pricing model must cater to three distinct personas with price elasticity ranging from low (consumers) to high (municipalities).
Tier
Price
Target Persona
Value Proposition
Basic (Free/Trial)
$0
Consumers
Rate Watchdog, Grid Status Widget, Basic "Energy 101" Quiz.
Pro (Individual)
$29/mo
Students/Pros
Full Certification Tracks, CEM Prep Questions, "Energy Trader" Game.
Team (Enterprise)
$299/mo
Muni/EPCs
Grant Finder Database, Multi-seat Dashboard, API Access, "White Label" Reports.

Justification: The $29 price point is an impulse buy for professionals looking to upskill. The $299 price point is easily expensable for a municipality, especially if positioned as "Training Software" eligible for grants.
6.2 Conversion Optimization
The "7-Day Grid Challenge" Trial: Instead of a generic 14-day trial, offer a 7-day challenge. "Complete the Grid Operations certification in 7 days to keep it for free." This drives intense usage during the trial period, which correlates highly with conversion.24
Scarcity Tactics: "Live Cohorts" for the CEM Prep track. "Join the January Study Group - Limited to 50 seats." This creates urgency and a sense of exclusivity.
Part 7: Technical Architecture & Performance
7.1 Whop Technical Requirements & Implementation
Iframe SDK Integration:
The app must be wrapped in the @whop/iframe SDK.
Authentication Flow: On load, the app sends a handshake request to Whop. Whop returns the x-whop-user-token. The app verifies this token via a backend API call to https://api.whop.com/v1/me. If valid, the user is logged in.
Deep Linking: Handle Whop's specific deep link format (whop.com/app/[app_id]/path) to ensure users landing from an email go straight to the relevant quiz, not the home screen.
Analytics: Use server-side analytics (e.g., PostHog or Mixpanel) triggered by backend events. Client-side analytics in iframes can be unreliable due to ad blockers and browser privacy settings.25
7.2 Performance Benchmarks
Target Metrics:
FCP (First Contentful Paint): < 1.2s. Achieved by server-side rendering (SSR) the initial shell.
Bundle Size: < 2MB. Use code-splitting to load the "Game" engine only when the user enters the game route.
Caching Strategy:
Cache "Static" content (Quiz Questions, Certificates) heavily on the CDN.
"Dynamic" content (Pool Price, Grid Status) should be fetched via lightweight SWR (Stale-While-Revalidate) hooks to ensure freshness without blocking the UI.
Research Output: Detailed Findings & Recommendations
Summary Table: Top 10 Insights

#
Insight
Source
Action Item
1
Whop is Wealth-Driven
1
Reframe the app from "Education" to "Career/Financial Advancement" (Earn more, Save more).
2
RoLR Transition is Urgent
26
Launch a "Rate Watchdog" tool immediately to capitalize on Jan 1, 2025 confusion.
3
TIER 2025 Rules are New
17
Update Module 4 to explicitly teach "Direct Investment Credits" & Opt-out rules.
4
Grid Alerts Drive Action
20
Create a "Grid Status Widget" that alerts users to potential shortages (High engagement).
5
Gamification = Status
2
Implement LinkedIn-shareable badges for "Grid Certification" to drive viral growth.
6
Grant Funding is available
28
Add a "Grant Finder" database to the Team Tier ($299) to justify the price point.
7
CEM Exam is High-Value
16
Add a "CEM Prep" track with 100+ hard questions. This competes with $2,600 courses.
8
Iframe Perf is Critical
10
Use lazy-loading for charts. Keep initial bundle <2MB.
9
Live Events Retain
31
Host a monthly "Market Outlook" webinar (Zoom) for Pro members to reduce churn.
10
Privacy is #1 Rejection
7
Ensure explicit transparency on why energy data is collected in the Privacy Policy.

Priority Actions (Ranked by Impact)
Priority
Action
Expected Impact
Implementation Effort
HIGH
Update Quiz Content for 2025 Regs (RoLR/TIER)
Immediate credibility & relevance. Prevents churn from outdated info.
MEDIUM (Content writing)
HIGH
Develop "Rate Watchdog" Calculator
High viral potential for B2C. Massive top-of-funnel lead magnet.
MEDIUM (Dev logic)
HIGH
Implement Whop Iframe Auth (JWT)
Mandatory for App Store approval.
LOW (Standard SDK)
MEDIUM
Grant Finder Database
Major value-add for B2B/Muni sales ($299 tier driver).
HIGH (Data collection)
MEDIUM
LinkedIn Certificate Integration
Viral growth loop. Free marketing.
MEDIUM (API/Image gen)
LOW
Complex 3D Dashboard
Good for demos, but lower utility for daily mobile use.
HIGH (Dev effort)

Context: What We Already Have vs. What is Missing
What we have: A solid foundation of 72 questions and basic certificate tracks.
What is missing (The "Gap"):
Immediacy: The content feels "textbook" rather than "news." It needs the 2025 regulatory updates (RoLR, TIER amendments).
Tools: Education is passive. Tools (Calculators, Grant Finders, Grid Widgets) are active. Active users pay retention dividends.
Community: There is no mechanism for users to talk to each other. A "Discord" style chat (native in Whop) is essential for the "Wealth Club" effect.
Answers to Key Questions
TOP 3 Missing Competitor Features:
Grant/Incentive Database: (Like Energy Toolbase).
Live/Cohort Learning: (Like CIET/Voss).
Real-Time Grid/Price Data: (Like AESO/Sysops).
TOP 3 Quiz Topics to Add:
2025 Rate Design (RoLR vs. Competitive).
TIER Direct Investment & Opt-out Mechanisms.
Grid Alert Demand Response Protocols.
Highest Impact Gamification:
"Risk Simulation": A trading-style game where users make decisions based on grid scenarios (e.g., "Wind died down, gas plant trip. Do you shed load?").
Optimal Pricing Strategy:
$29/mo (Individual), $99/mo (Pro with Tools), $299/mo (Team). The "Team" tier is the revenue driver for B2B.
Most Important Change for Whop Approval:
Native Authentication: Ensure the x-whop-user-token is handled perfectly to avoid "login loops."
Viral Feature:
"Grid Alert Push Notifications": Be faster than the government. If users get a ping saying "Pool price is $900," they will open the app immediately.
Partnership Opportunities:
Municipal Climate Change Action Centre (MCCAC): For funding training.
Indigenous Clean Energy (ICE): For content partnership.
Most Valuable Credential:
"CEM Prep Certified": Position it as the stepping stone to the big AEE certification.
Best Converting Free Experience:
The "Rate Watchdog": "Upload your bill (or input usage) and see if you beat the RoLR." It gives instant monetary value.
#1 Thing Users Want:
ROI (Return on Investment): They don't just want to "learn energy." They want to save money (Homeowners) or get a better job/grant (Professionals). The app must promise financial outcomes, not just educational ones.
Works cited
150+ creator economy statistics for 2026 - Whop, accessed December 26, 2025, https://whop.com/blog/creator-economy-statistics/
Wealth Club Free Course - Whop, accessed December 26, 2025, https://whop.com/marketplace/wealth-club/
Joule bug - Green Gamification - Manu Melwin Joy | PPTX - Slideshare, accessed December 26, 2025, https://www.slideshare.net/slideshow/joule-bug-green-gamification-manu-melwin-joy/73197797
Download the App - JouleBug, accessed December 26, 2025, https://www.joulebug.com/download-joulebug-app
How Do You Fix Common App Store Rejection Problems?, accessed December 26, 2025, https://thisisglance.com/learning-centre/how-do-you-fix-common-app-store-rejection-problems
Authentication - Whop Docs, accessed December 26, 2025, https://docs.whop.com/developer/guides/authentication
14 Common Apple App Store Rejections and How To Avoid Them - OneMobile, accessed December 26, 2025, https://onemobile.ai/common-app-store-rejections-and-how-to-avoid-them/
Iframe SDK - Whop Docs, accessed December 26, 2025, https://docs.whop.com/developer/guides/iframe
@whop/iframe - npm, accessed December 26, 2025, https://www.npmjs.com/package/@whop/iframe
How iFrames Affect Page Speed and Core Web Vitals (And What to Do About It), accessed December 26, 2025, https://www.gtechme.com/insights/iframes-page-speed-core-web-vitals/
Top Dashboard Design Trends for SaaS Products in 2025 (with Examples) - Uitop, accessed December 26, 2025, https://uitop.design/blog/design/top-dashboard-design-trends/
Pricing - Energy Toolbase, accessed December 26, 2025, https://www.energytoolbase.com/pricing/
Continuing Education - AESO, accessed December 26, 2025, https://www-integ.aeso.ca/aeso/understanding-electricity-in-alberta/continuing-education/
Certified Energy Manager (CEM) - CIET, accessed December 26, 2025, https://cietcanada.com/programs/cem/
PrairiesCan — Alberta Indigenous Clean Energy Initiative | Program Guide 2026, accessed December 26, 2025, https://hellodarwin.com/business-aid/programs/alberta-indigenous-clean-energy-initiative
Free Certified Energy Manager Practice Test (updated 2025) - Mometrix, accessed December 26, 2025, https://www.mometrix.com/academy/certified-energy-manager-practice-test/
Changes Coming to Alberta's TIER System - McMillan LLP, accessed December 26, 2025, https://mcmillan.ca/insights/publications/changes-coming-to-albertas-tier-system/
December 2025 amendments to Alberta's TIER following the MOU with the federal government - Dentons, accessed December 26, 2025, https://www.dentons.com/en/insights/articles/2025/december/11/december-2025-amendments-to-alberta
Municipal Energy Manager Program | MCCAC, accessed December 26, 2025, https://mccac.ca/programs/municipal-energy-manager-program/
Weathering the Storm: Alberta's Grid Alerts and 2024 Energy Themes, accessed December 26, 2025, https://www.arcenergyinstitute.com/weathering-the-storm-albertas-grid-alerts-and-2024-energy-themes/
January 2025 Rate Changes: ROLR and CER - EQUS, accessed December 26, 2025, https://equs.ca/january-2025-rate-changes/
How Much of Alberta is Left for Renewable Energy?, accessed December 26, 2025, https://www.albertawilderness.ca/reports/how-much-of-alberta-is-left-for-renewable-energy/
Alberta announces new policies for future renewable energy projects - Miller Thomson, accessed December 26, 2025, https://www.millerthomson.com/en/insights/environmental/alberta-announces-new-policies-future-renewable-energy-projects/
100+ Subscription Statistics for 2026 - Whop, accessed December 26, 2025, https://whop.com/blog/subscription-statistics/
Top 10 App Store Rejection Reasons and How to Fix them - UXCam, accessed December 26, 2025, https://uxcam.com/blog/app-store-rejection-reasons/
Understanding Alberta's Rate of Last Resort (RoLR): Your guide to the 2025 electricity changes - DNE Resources, accessed December 26, 2025, https://dneresources.com/understanding-albertas-rolr-rate-of-last-resort/
Grid alerts — threats to Alberta's electricity system, explained | The Narwhal, accessed December 26, 2025, https://thenarwhal.ca/alberta-grid-alerts-explainer/
Small Community Opportunity Program | Alberta.ca, accessed December 26, 2025, https://www.alberta.ca/small-community-opportunity-program
Save Energy Grants - FortisAlberta, accessed December 26, 2025, https://www.fortisalberta.com/customer-service/save-energy/grants
Certified Energy Manager Study Material Suggestions : r/engineering - Reddit, accessed December 26, 2025, https://www.reddit.com/r/engineering/comments/1fei10o/certified_energy_manager_study_material/
Voss Trading Education - Whop, accessed December 26, 2025, https://whop.com/marketplace/vte/
