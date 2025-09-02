# Ontario Electricity Pricing Dataset (ontario_prices) - Research Report

## Executive Summary

This research provides a comprehensive analysis of available data sources for Ontario electricity pricing data, with particular focus on the "ontario_prices" dataset and related resources. The investigation reveals multiple access channels ranging from Kaggle datasets to official IESO APIs, with varying levels of data granularity, real-time capabilities, and technical requirements. Key findings include: the availability of both historical and real-time pricing data through IESO's official channels, the existence of specialized Python libraries (GridStatus) for streamlined data access, and comprehensive API infrastructure supporting both bulk downloads and streaming access patterns. The research identifies optimal access methods, technical specifications, and streaming parameters essential for effective implementation of Ontario electricity price monitoring and analysis systems.

## 1. Introduction

Ontario's electricity market operates under the Independent Electricity System Operator (IESO), which manages the province's power system and electricity market. This research investigates available datasets and access methods for Ontario electricity pricing data, focusing on the "ontario_prices" dataset mentioned in various data science platforms and exploring the broader ecosystem of Ontario electricity data sources.

The research objectives encompassed seven key areas: identifying available data sources across multiple platforms, analyzing dataset structures and schemas, determining data volume and temporal coverage, documenting access methods and API requirements, examining sample data formats and key columns, establishing optimal streaming parameters, and identifying special considerations for real-time price streaming.

## 2. Key Findings

### 2.1 Available Data Sources

The research identified multiple distinct channels for accessing Ontario electricity pricing data, each serving different use cases and technical requirements:

**Primary Official Sources:**
The Independent Electricity System Operator (IESO) serves as the authoritative source for Ontario electricity market data[2]. IESO provides comprehensive data through their Power Data portal, offering real-time snapshots, historical data, and extensive reporting capabilities. The organization operates approximately 1,000 locational marginal pricing points throughout Ontario[5], providing granular geographic pricing information.

**Kaggle Datasets:**
Two notable datasets exist on Kaggle. The "Ontario Energy Prices" dataset by kashdotten[1] contains Hourly Ontario Energy Price (HOEP) data sourced directly from IESO, though it was last updated 5 years ago, limiting its current utility. The "Economics of Grid-Scale Electricity Storage" dataset by saurabhshahane[6] provides hourly electricity demand and nodal price data for Ontario in raw, unprocessed format, distributed under a CC BY 4.0 license and referenced in academic research.

**Third-Party APIs and Libraries:**
GridStatus emerges as a significant third-party provider, offering both commercial data services and an open-source Python library[8,9] that standardizes access to electricity market data from major ISOs including IESO. This platform provides a modern data infrastructure specifically designed for energy market analysis.

**Hugging Face:**
The research found no specific "ontario_prices" dataset on Hugging Face, though general electricity-related datasets exist on the platform.

### 2.2 Dataset Structure and Schema

**IESO Official Data Structure:**
IESO's data architecture encompasses multiple report categories[3], each with specific schemas:

*Pricing Reports* include comprehensive coverage across temporal granularities:
- Real-time 5-minute reports (Energy LMP, Ontario Zonal Energy Price, Operating Reserve LMP)
- Hourly reports (Day-ahead, Pre-dispatch, Real-time pricing for various market components)
- Daily and monthly aggregations

*Core Data Elements* across pricing reports typically include:
- Temporal identifiers (timestamp, interval start/end, trade date)
- Geographic identifiers (zone, node, intertie location)
- Price components (energy prices, operating reserve prices, global adjustment)
- Market conditions (constraints, surplus states, dispatch instructions)

**GridStatus Schema:**
The GridStatus Python library[9] standardizes data output using Pandas DataFrames with consistent column structures:
- Time-based columns: "Time", "Interval Start", "Interval End", "Publish Time"
- Pricing data: Various LMP and zonal price columns depending on the specific method called
- Geographic data: Zone-specific columns for Ontario regions (East, West, Ontario-wide)
- Operational data: Load, fuel mix, generator output, and capability information

### 2.3 Data Volume and Time Range Coverage

**Historical Coverage:**
IESO provides extensive historical data with coverage spanning from 2002 to present for most report types[3]. The depth of available historical data varies by report type, with pricing reports generally offering complete coverage throughout this period.

**Data Volume Considerations:**
Real-time data generation occurs at 5-minute intervals for most operational data, resulting in 288 data points per day per metric. With approximately 1,000 pricing nodes throughout Ontario[5], the complete LMP dataset generates roughly 288,000 price points daily. Aggregated reports (hourly, daily) provide reduced volume alternatives while maintaining essential market information.

**Update Frequency Patterns:**
The research identified distinct update frequencies across different data types:
- Real-time data: 5-minute intervals for operational metrics
- Market prices: Calculated and published on 5-minute basis with hourly aggregations
- Settlement data: Preliminary statements on 10th business day, final statements on 20th business day after trading day
- Global adjustment rates: Finalized 10 business days after month end

### 2.4 Access Methods and API Requirements

**IESO Official APIs:**
IESO provides multiple technical interfaces[4] for programmatic data access:

*IESO Reports API*: Designed for automated retrieval of confidential reports with SFTP alternative access method. Requires authentication and supports both individual report downloads and bulk access patterns.

*Market Information Management (MIM) API*: SOAP-based web services API for submitting and downloading market data. Requires UserID/Password authentication and whitelisted client machine IP addresses.

*Various Specialized APIs*: Including Dispatch Notification Service, Facilities API, and Retrofit APIs for specific operational requirements.

**GridStatus Access Methods:**
GridStatus offers multiple access channels[7,8]:
- Python Client: Open-source library providing standardized interface
- REST API: Commercial service with comprehensive data access
- Snowflake Marketplace: Enterprise data warehouse integration

**Data Format Support:**
The research identified comprehensive format support across platforms:
- IESO: CSV, XML, PDF, HTML, TXT, EDI-867 (for meter data)
- GridStatus: Pandas DataFrame (Python), JSON (REST API)
- Kaggle datasets: CSV format

### 2.5 Sample Data Format and Key Columns

**HOEP (Hourly Ontario Energy Price) Structure:**
Based on IESO documentation and Kaggle dataset analysis[1], HOEP data typically includes:
- Date/Time columns (Hour Ending EST, Interval Start/End)
- Price data (HOEP in $/MWh)
- Market identifiers (Trading date, Demand/Supply conditions)

**Real-time Pricing Schema:**
Real-time 5-minute pricing reports[3] contain:
- Temporal fields: "Interval Start", "Interval End", "Publish Time"
- Price fields: "Energy LMP", "Operating Reserve LMP" (by class)
- Geographic fields: Node/Zone identifiers
- Market condition fields: Constraint indicators, surplus states

**Locational Marginal Pricing (LMP) Components:**
LMP data structure[5] includes three core components:
- Reference price: Incremental cost of electricity at reference bus
- Congestion cost: Incremental cost of transmission constraints
- Loss cost: Incremental cost of electrical losses

**GridStatus Data Columns:**
The GridStatus library[9] provides standardized column naming:
- Load data: "Load", zone-specific load columns
- Fuel mix: Individual fuel type columns (Solar, Wind, Nuclear, Natural Gas, etc.)
- Pricing: Various LMP and zonal price columns depending on method

### 2.6 Optimal Streaming Parameters for Price Data

**Real-time Streaming Considerations:**
For applications requiring real-time price data, several technical parameters optimize performance:

*Polling Frequency*: IESO publishes real-time data on 5-minute intervals. Optimal polling frequency should align with this schedule, typically polling every 5-6 minutes to account for publication delays.

*Data Latency*: Real-time prices typically become available 1-2 minutes after the interval end. Applications should account for this latency in their streaming logic.

*Historical Data Limits*: GridStatus library[9] implements specific constraints:
- Load data: Maximum 30 days in the past
- Generator reports: Maximum 90 days in the past for complete data
- Zonal load forecast: Maximum 90 days in the past, 34 days in the future

**Batch Processing Optimization:**
For applications requiring historical data analysis:
- Date range requests should be optimized based on data availability limits
- Bulk downloads are more efficient for large historical ranges
- CSV format generally provides fastest processing for large datasets

**API Rate Limiting:**
While IESO documentation doesn't specify explicit rate limits[4], best practices suggest:
- Implementing exponential backoff for failed requests
- Limiting concurrent connections to avoid overwhelming servers
- Caching frequently requested data to reduce API calls

### 2.7 Special Considerations for Real-time Price Streaming

**Market Schedule Alignment:**
Ontario's electricity market operates on Eastern Standard Time[9]. Applications must account for:
- Daylight saving time transitions affecting timestamp interpretation
- Market hours and trading periods
- Planned market maintenance windows

**Data Quality Considerations:**
Real-time data streams require robust error handling:
- Preliminary vs. final data distinction: Initial data may be revised
- Missing intervals: System outages or communication failures can create gaps
- Data validation: Price anomalies may indicate market events or data errors

**Geographic Complexity:**
With approximately 1,000 LMP nodes throughout Ontario[5], streaming applications must consider:
- Node selection strategies based on geographic relevance
- Data volume management for comprehensive provincial coverage
- Zone aggregation options for reduced complexity

**Authentication and Security:**
Production streaming implementations require:
- Secure credential management for IESO APIs
- IP whitelisting for MIM API access[4]
- SSL/TLS encryption for data transmission
- Backup authentication methods (SFTP for Reports API)

## 3. Methodology

The research employed a systematic approach combining web search, content extraction, and technical documentation analysis. Initial searches targeted multiple platforms (Kaggle, Hugging Face, IESO, government sources) to identify available datasets. Deep content extraction was performed on key sources to gather technical specifications, followed by analysis of API documentation and technical interfaces to understand access methods and requirements.

## 4. Recommendations

**For Historical Analysis Projects:**
Utilize IESO's bulk data downloads in CSV format for maximum efficiency. The GridStatus Python library provides an excellent standardized interface for multi-ISO analysis projects.

**For Real-time Applications:**
Implement IESO's Reports API with proper authentication and error handling. Consider GridStatus commercial services for managed data infrastructure with higher reliability guarantees.

**For Academic Research:**
The Economics of Grid-Scale Electricity Storage dataset[6] on Kaggle provides a good starting point with proper licensing. For comprehensive research, direct IESO data access provides the most complete and current information.

**For Development and Prototyping:**
Start with GridStatus open-source library[8] for quick prototyping, then transition to direct IESO APIs for production applications requiring specific data guarantees.

## 5. Conclusion

Ontario electricity pricing data is available through multiple channels with varying levels of complexity and capability. IESO serves as the authoritative source with comprehensive API infrastructure supporting both historical analysis and real-time streaming applications. The GridStatus ecosystem provides valuable abstraction and standardization, particularly useful for multi-market analysis. Dataset quality and coverage are excellent, with real-time data available at 5-minute granularity and historical coverage extending over two decades.

The technical infrastructure supports sophisticated applications requiring high-frequency data updates, geographic granularity through extensive LMP node coverage, and robust access methods accommodating various use cases from academic research to commercial trading applications. Successful implementations require careful attention to authentication requirements, data latency characteristics, and proper error handling for production reliability.

## 6. Sources

[1] [Ontario Energy Prices - Kaggle Dataset](https://www.kaggle.com/datasets/kashdotten/ontario-energy-prices) - High Reliability - Direct dataset from IESO data

[2] [IESO Power Data Portal](https://www.ieso.ca/power-data) - High Reliability - Official government agency source

[3] [IESO Data Directory](https://www.ieso.ca/power-data/data-directory) - High Reliability - Comprehensive official data catalog

[4] [IESO Technical Interfaces](https://www.ieso.ca/sector-participants/technical-interfaces) - High Reliability - Official API documentation

[5] [Ontario Market Prices Overview](https://www.ieso.ca/power-data/Price-Overview/Ontario-Market-Prices) - High Reliability - Official market structure documentation

[6] [The Economics of Grid-Scale Electricity Storage Dataset](https://www.kaggle.com/datasets/saurabhshahane/the-economics-of-gridscale-electricity-storage) - Medium Reliability - Third-party dataset with academic backing

[7] [GridStatus IESO Market Guide](https://docs.gridstatus.io/data-guides/market-guides/independent-electricity-system-operator-ieso) - Medium Reliability - Commercial third-party documentation

[8] [GridStatus Python Library Documentation](https://opensource.gridstatus.io/) - Medium Reliability - Open-source project documentation

[9] [GridStatus IESO Module Documentation](https://opensource.gridstatus.io/en/latest/autoapi/gridstatus/ieso/index.html) - Medium Reliability - Technical API documentation
