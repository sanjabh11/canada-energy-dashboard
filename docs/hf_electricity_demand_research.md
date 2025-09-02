# Hugging Face Electricity Demand Dataset Research Report

## Executive Summary

This research investigated the "hf_electricity_demand" dataset from Hugging Face for electricity demand forecasting applications. **Key finding: No dataset with the exact name "hf_electricity_demand" exists on Hugging Face**. However, the research identified three primary electricity-related datasets suitable for demand forecasting: EDS-lab/electricity-demand (most comprehensive), rajistics/electricity_demand (Australia-specific), and huggingface/electricity-production (demo dataset). The EDS-lab dataset emerges as the most suitable alternative, offering harmonized smart meter data across multiple geographical locations with comprehensive weather features and metadata. Authentication via Hugging Face tokens is required for dataset access, with streaming capabilities available through the datasets library's `streaming=True` parameter.

## 1. Introduction

This research was conducted to investigate the hf_electricity_demand dataset from Hugging Face, focusing on dataset structure, access methods, API integration patterns, and optimal usage parameters for electricity demand forecasting applications. The investigation encompassed dataset discovery, technical specifications, authentication requirements, and best practices for accessing and utilizing electricity demand data through the Hugging Face datasets ecosystem.

## 2. Key Findings

### Dataset Availability and Alternatives

The specific dataset "hf_electricity_demand" does not exist on Hugging Face. Instead, three relevant electricity datasets were identified:

**EDS-lab/electricity-demand** serves as the most comprehensive alternative, compiling and harmonizing multiple open smart meter datasets specifically designed for electricity demand forecasting[1]. This dataset provides the closest functionality to what might be expected from an "hf_electricity_demand" dataset.

**rajistics/electricity_demand** offers focused data from Victoria, Australia, containing hourly electricity demand measurements in gigawatts alongside corresponding temperature readings[2].

**huggingface/electricity-production** provides a demonstration dataset used in the Transformers library for time series forecasting examples, containing electricity production values from 1985-1993[3].

### Dataset Structure and Schema

The EDS-lab/electricity-demand dataset employs a sophisticated three-file structure:

**demand.parquet** contains the core electricity consumption data with unique_id (meter identifier), timestamp (local recording time), and y (electricity consumption in kWh)[1]. This structure enables efficient time series analysis and forecasting model training.

**metadata.csv** provides comprehensive meter information including geographical coordinates (latitude, longitude), location identifiers (geohash), building classifications (Residential/Commercial), frequency specifications, and clustering details[1].

**weather.parquet** delivers extensive meteorological data with 24 weather variables including temperature, humidity, precipitation, wind conditions, solar radiation, and atmospheric pressure measurements[1]. This comprehensive weather integration supports advanced demand forecasting models that incorporate environmental factors.

The rajistics dataset employs a simpler structure with three columns: Demand (GW), Temperature (Celsius), and timestamp, providing straightforward access for basic forecasting applications[2].

### Data Volume and Coverage

The EDS-lab dataset demonstrates significant scale and diversity, compiling multiple international smart meter datasets with variable temporal frequencies indicated by pandas-style frequency strings in the metadata[1]. Geographical coverage spans multiple locations identified through unique geohashes, providing cross-regional analysis capabilities.

The Victoria dataset covers a specific temporal window from 2014, offering detailed hourly granularity for focused regional analysis[2]. The demonstration dataset spans 1985-1993, providing historical context for forecasting model development[3].

### Authentication and Access Requirements

Access to Hugging Face datasets requires authentication through User Access Tokens, which serve as the preferred method for application and notebook authentication[6]. The system supports three token types: fine-grained (recommended for production), read (for downloading), and write (for content creation)[6].

Token authentication is implemented through the `token` parameter in `load_dataset()` functions, with automatic token retrieval from `~/.huggingface` when `token=True` or unspecified[4]. For the EDS-lab dataset, authentication is mandatory as it requires agreement to share contact information and account login[1].

### API Access Patterns and Rate Limits

Hugging Face implements a credit-based usage system rather than traditional rate limiting. Free accounts receive $0.10 in monthly credits, while Pro accounts ($9/month) receive $2.00 monthly credits with pay-as-you-go options after exhaustion[7]. This system affects dataset access frequency rather than imposing strict request-per-second limitations.

For datasets specifically, the primary limitations relate to download and processing rather than API calls, as datasets are typically cached locally after initial download[4].

### Streaming Parameters and Optimization

The datasets library provides comprehensive streaming capabilities through the `streaming=True` parameter in `load_dataset()`[4]. Streaming enables working with datasets without full downloads, particularly beneficial for large electricity datasets that may exceed available disk space.

Key streaming parameters include:
- **buffer_size** (default: 1000) for shuffle operations
- **batch_size** (default: 1000) for batched processing
- **num_shards** for parallel loading with PyTorch DataLoader
- **take()** and **skip()** for dataset splitting
- **shuffle()** with seed control for reproducible randomization

Optimal streaming configurations for electricity demand data should consider temporal ordering requirements, with careful shuffle buffer sizing to maintain time series integrity while enabling effective model training[4].

### Integration Considerations

Integration with the Hugging Face datasets API requires careful consideration of several factors:

**Memory Management**: Streaming mode reduces memory footprint but requires sequential access patterns. For electricity demand forecasting requiring random access to historical data, standard Dataset objects may be more appropriate[4].

**Caching Strategy**: The library automatically caches processed datasets in Arrow format, enabling rapid subsequent access. Cache directory specification through `cache_dir` parameter allows storage management[4].

**Preprocessing Integration**: The `map()` function enables on-the-fly data transformations during streaming, essential for electricity demand data that often requires normalization, feature engineering, and temporal aggregations[4].

**Multi-processing Support**: The `num_proc` parameter enables parallel processing for large-scale electricity datasets, significantly improving preparation times for forecasting workflows[4].

## 3. Sample Data Formats and Key Columns

### EDS-lab Dataset Format
```
demand.parquet:
- unique_id: string/numeric (meter identifier)
- timestamp: timestamp (local recording time)
- y: float (electricity consumption in kWh)

metadata.csv:
- unique_id: string/numeric
- dataset: string (original dataset name)
- building_id: string/numeric
- location_id: string (geohash)
- latitude: float
- longitude: float
- location: string
- timezone: string
- freq: string (pandas frequency)
- building_class: string (Residential/Commercial)
- cluster_size: integer

weather.parquet:
- location_id: string/numeric
- timestamp: timestamp
- temperature_2m: float (°C)
- relative_humidity_2m: float (%)
- precipitation: float (mm)
- [21 additional weather variables]
```

### Victoria Dataset Format
```
- Demand: float64 (electricity demand in GW)
- Temperature: float64 (temperature in Celsius)
- __index_level_0__ timestamp: timestamp[ns]
```

## 4. Actionable Integration Recommendations

### For Basic Electricity Demand Forecasting
```python
from datasets import load_dataset

# Load with authentication
dataset = load_dataset(
    "rajistics/electricity_demand",
    split="train",
    token=True  # Uses ~/.huggingface token
)
```

### For Advanced Multi-Location Forecasting
```python
# Stream large dataset with optimal parameters
dataset = load_dataset(
    "EDS-lab/electricity-demand",
    streaming=True,
    token=True
).shuffle(seed=42, buffer_size=10000)

# Process in batches for memory efficiency
for batch in dataset.batch(1000):
    # Implement forecasting pipeline
    pass
```

### For Production Environments
```python
# Use fine-grained tokens and explicit caching
dataset = load_dataset(
    "EDS-lab/electricity-demand",
    cache_dir="./hf_cache",
    token="your_fine_grained_token",
    num_proc=4  # Parallel processing
)
```

## 5. Conclusion

While no dataset named "hf_electricity_demand" exists on Hugging Face, the EDS-lab/electricity-demand dataset provides superior functionality for electricity demand forecasting applications. Its comprehensive structure, combining consumption data, metadata, and weather information, enables sophisticated forecasting models. The Hugging Face datasets ecosystem offers robust streaming capabilities, authentication mechanisms, and integration patterns suitable for production electricity demand forecasting systems.

Organizations seeking electricity demand forecasting capabilities should prioritize the EDS-lab dataset for its comprehensive coverage and the rajistics dataset for Australia-specific applications. Implementation should leverage streaming parameters for large-scale processing while maintaining appropriate authentication and caching strategies.

## 6. Sources

[1] [EDS-lab/electricity-demand Dataset](https://huggingface.co/datasets/EDS-lab/electricity-demand) - High Reliability - Official Hugging Face dataset with comprehensive smart meter data compilation

[2] [Victoria Electricity Demand Dataset](https://huggingface.co/datasets/rajistics/electricity_demand) - High Reliability - Official Hugging Face dataset from MAPIE repository

[3] [Electricity Production Demo Dataset](https://huggingface.co/datasets/huggingface/electricity-production) - High Reliability - Official Hugging Face demonstration dataset

[4] [Datasets Loading Methods Documentation](https://huggingface.co/docs/datasets/en/package_reference/loading_methods) - High Reliability - Official Hugging Face technical documentation

[5] [Loading Datasets from Hub Documentation](https://huggingface.co/docs/datasets/en/load_hub) - High Reliability - Official Hugging Face usage guide

[6] [User Access Tokens Documentation](https://huggingface.co/docs/hub/en/security-tokens) - High Reliability - Official Hugging Face authentication guide

[7] [API Pricing and Rate Limits](https://huggingface.co/docs/inference-providers/en/pricing) - High Reliability - Official Hugging Face pricing documentation

## 7. Appendices

### Code Examples for Dataset Integration

```python
# Example 1: Basic dataset loading with authentication
from datasets import load_dataset

def load_electricity_dataset(dataset_name="EDS-lab/electricity-demand"):
    """Load electricity dataset with proper authentication"""
    try:
        dataset = load_dataset(
            dataset_name,
            token=True,  # Auto-detect token from ~/.huggingface
            trust_remote_code=True
        )
        return dataset
    except Exception as e:
        print(f"Authentication required: {e}")
        return None

# Example 2: Streaming configuration for large datasets
def stream_electricity_data(batch_size=1000, buffer_size=10000):
    """Configure streaming for memory-efficient processing"""
    dataset = load_dataset(
        "EDS-lab/electricity-demand",
        streaming=True,
        token=True
    )
    
    # Configure for training
    shuffled_dataset = dataset.shuffle(
        seed=42,
        buffer_size=buffer_size
    )
    
    return shuffled_dataset.batch(batch_size)

# Example 3: Weather data integration
def integrate_weather_features(demand_data, weather_data):
    """Merge demand and weather data by location and timestamp"""
    # Implementation would depend on specific forecasting requirements
    merged_data = demand_data.map(
        lambda x: {**x, "weather": weather_data.get(x["location_id"], {})},
        batched=True
    )
    return merged_data
```

### Alternative Dataset Recommendations

For organizations unable to access the identified datasets, consider these alternatives:
- **OpenSynth/TUDelft-Electricity-Consumption-1.0**: Household-level consumption data
- **tulipa762/electricity_load_diagrams**: Portuguese substation data (2011-2014)
- **LeoTungAnh/electricity_hourly**: Portuguese client consumption data (2012-2014)

These alternatives provide varying scales and geographical coverage for electricity demand forecasting applications.
