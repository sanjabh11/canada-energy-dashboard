"""
LightGBM Price Spike Predictor — Training Pipeline

Trains a LightGBM gradient boosted decision tree model for price spike
prediction using Alberta AESO historical pool price data.

Features:
  - pool_price_cad_per_mwh: Current pool price
  - demand_mw: System load
  - reserve_margin_percent: Available reserves / load
  - wind_generation_mw: Wind power output
  - temperature_c: Weather temperature
  - hour_of_day: Cyclical hour encoding
  - day_of_week: Day index (0-6)
  - price_lag_1h: Previous hour pool price
  - price_lag_24h: Previous day same hour pool price
  - demand_lag_1h: Previous hour demand
  - price_volatility_24h: 24h rolling std of pool price

Target:
  - spike: 1 if pool_price >= threshold (default 1000 CAD/MWh), 0 otherwise

Expected F1: 0.55-0.72 (up from 0.32 with decision stumps)

Usage:
  python train.py --data /path/to/aeso_historical.csv
  python train.py --data /path/to/aeso_historical.csv --threshold 800
  python train.py --synthetic  # Train on synthetic data for testing

Output:
  - model.txt: LightGBM model file
  - metrics.json: Evaluation metrics (F1, precision, recall, AUC)
  - feature_importance.json: Feature importance scores
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

try:
    import lightgbm as lgb
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import (
        f1_score,
        precision_score,
        recall_score,
        roc_auc_score,
        classification_report,
        confusion_matrix,
    )
except ImportError:
    print("ERROR: Required packages not installed.", file=sys.stderr)
    print("Install with: pip install lightgbm scikit-learn pandas numpy", file=sys.stderr)
    sys.exit(1)


# Feature columns
FEATURE_COLUMNS = [
    "pool_price_cad_per_mwh",
    "demand_mw",
    "reserve_margin_percent",
    "wind_generation_mw",
    "temperature_c",
    "hour_of_day",
    "day_of_week",
    "price_lag_1h",
    "price_lag_24h",
    "demand_lag_1h",
    "price_volatility_24h",
]

TARGET_COLUMN = "spike"


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Engineer features from raw AESO data."""
    df = df.copy()

    # Ensure datetime index
    if "datetime" in df.columns:
        df["datetime"] = pd.to_datetime(df["datetime"])
        df = df.set_index("datetime")

    # Hour and day features
    df["hour_of_day"] = df.index.hour
    df["day_of_week"] = df.index.dayofweek

    # Lag features
    if "pool_price_cad_per_mwh" in df.columns:
        df["price_lag_1h"] = df["pool_price_cad_per_mwh"].shift(1)
        df["price_lag_24h"] = df["pool_price_cad_per_mwh"].shift(24)
        df["price_volatility_24h"] = df["pool_price_cad_per_mwh"].rolling(24).std()

    if "demand_mw" in df.columns:
        df["demand_lag_1h"] = df["demand_mw"].shift(1)

    # Fill NaN from lagging
    df = df.fillna(method="bfill").fillna(0)

    return df


def label_spikes(df: pd.DataFrame, threshold: float = 1000.0) -> pd.DataFrame:
    """Label price spikes based on threshold."""
    df = df.copy()
    df["spike"] = (df["pool_price_cad_per_mwh"] >= threshold).astype(int)
    return df


def generate_synthetic_data(n_samples: int = 2000) -> pd.DataFrame:
    """Generate synthetic Alberta-like price spike data for testing."""
    np.random.seed(42)
    dates = pd.date_range("2024-01-01", periods=n_samples, freq="h")

    # Base demand pattern with daily and weekly cycles
    hour = dates.hour
    dow = dates.dayofweek
    base_demand = 9000 + 1500 * np.sin((hour - 6) * np.pi / 12) + 500 * np.cos(dow * np.pi / 3.5)

    # Temperature: seasonal + daily
    day_of_year = dates.dayofyear
    temperature = -5 + 20 * np.sin((day_of_year - 80) * 2 * np.pi / 365) + 8 * np.sin(hour * np.pi / 12)

    # Wind generation: random + some correlation with temperature
    wind = 600 + 300 * np.random.randn(n_samples) - 5 * np.abs(temperature)
    wind = np.clip(wind, 0, 1500)

    # Reserve margin
    reserve_margin = 15 + 5 * np.random.randn(n_samples) - 0.001 * (base_demand - 9000)
    reserve_margin = np.clip(reserve_margin, -2, 35)

    # Pool price: non-linear function of demand, wind, reserve, temperature
    pool_price = (
        50
        + 0.05 * base_demand
        - 0.08 * wind
        - 3 * reserve_margin
        + 2 * np.maximum(0, -temperature) ** 1.5
        + 5 * np.maximum(0, temperature - 25) ** 1.5
        + np.random.exponential(30, n_samples)
    )

    # Add spike events
    spike_mask = (
        (reserve_margin < 5)
        | (pool_price > 700)
        | (base_demand > 11500) & (wind < 300)
        | (temperature < -25)
        | (temperature > 30)
    )
    pool_price[spike_mask] *= np.random.uniform(1.5, 3.0, spike_mask.sum())

    df = pd.DataFrame({
        "datetime": dates,
        "pool_price_cad_per_mwh": pool_price,
        "demand_mw": base_demand + np.random.randn(n_samples) * 100,
        "reserve_margin_percent": reserve_margin,
        "wind_generation_mw": wind,
        "temperature_c": temperature + np.random.randn(n_samples) * 2,
    }).set_index("datetime")

    return df


def train_lgbm_model(
    df: pd.DataFrame,
    threshold: float = 1000.0,
    output_dir: str = ".",
) -> dict:
    """Train LightGBM model and save artifacts."""
    # Engineer features and label spikes
    df = engineer_features(df)
    df = label_spikes(df, threshold)

    # Ensure all feature columns exist
    for col in FEATURE_COLUMNS:
        if col not in df.columns:
            df[col] = 0.0

    # Split data
    X = df[FEATURE_COLUMNS].values
    y = df[TARGET_COLUMN].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Class weight balancing
    num_pos = y_train.sum()
    num_neg = len(y_train) - num_pos
    pos_weight = len(y_train) / (2 * max(1, num_pos))
    neg_weight = len(y_train) / (2 * max(1, num_neg))
    sample_weights = np.where(y_train == 1, pos_weight, neg_weight)

    print(f"Training data: {len(X_train)} samples ({num_pos} spikes, {num_neg} non-spikes)")
    print(f"Test data: {len(X_test)} samples ({y_test.sum()} spikes)")
    print(f"Class weights: positive={pos_weight:.2f}, negative={neg_weight:.2f}")

    # LightGBM parameters
    params = {
        "objective": "binary",
        "metric": ["binary_logloss", "auc"],
        "boosting_type": "gbdt",
        "num_leaves": 15,
        "learning_rate": 0.1,
        "feature_fraction": 0.8,
        "bagging_fraction": 0.8,
        "bagging_freq": 5,
        "lambda_l1": 0.1,
        "lambda_l2": 1.0,
        "min_child_samples": 3,
        "verbose": -1,
        "is_unbalance": True,
    }

    train_data = lgb.Dataset(X_train, label=y_train, feature_name=FEATURE_COLUMNS, weight=sample_weights)
    valid_data = lgb.Dataset(X_test, label=y_test, feature_name=FEATURE_COLUMNS, reference=train_data)

    model = lgb.train(
        params,
        train_data,
        num_boost_round=100,
        valid_sets=[train_data, valid_data],
        callbacks=[lgb.log_evaluation(10)],
    )

    # Evaluate
    y_pred_proba = model.predict(X_test)
    y_pred = (y_pred_proba >= 0.5).astype(int)

    f1 = f1_score(y_test, y_pred, zero_division=0)
    precision = precision_score(y_test, y_pred, zero_division=0)
    recall = recall_score(y_test, y_pred, zero_division=0)
    auc = roc_auc_score(y_test, y_pred_proba) if y_test.sum() > 0 else 0.0

    print(f"\nEvaluation Results:")
    print(f"  F1 Score:  {f1:.4f}")
    print(f"  Precision: {precision:.4f}")
    print(f"  Recall:    {recall:.4f}")
    print(f"  AUC:       {auc:.4f}")
    print(f"\nClassification Report:")
    print(classification_report(y_test, y_pred, zero_division=0))
    print(f"Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred))

    # Save model
    model_path = os.path.join(output_dir, "model.txt")
    model.save_model(model_path)
    print(f"\nModel saved to: {model_path}")

    # Save metrics
    metrics = {
        "model_version": "lgbm-price-spike-v1",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "threshold_cad_per_mwh": threshold,
        "num_features": len(FEATURE_COLUMNS),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "train_spikes": int(num_pos),
        "test_spikes": int(y_test.sum()),
        "f1": round(f1, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "auc": round(auc, 4),
        "params": params,
    }
    metrics_path = os.path.join(output_dir, "metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"Metrics saved to: {metrics_path}")

    # Save feature importance
    importance = model.feature_importance(importance_type="gain")
    feature_importance = {
        FEATURE_COLUMNS[i]: round(float(importance[i]), 4)
        for i in range(len(FEATURE_COLUMNS))
    }
    fi_path = os.path.join(output_dir, "feature_importance.json")
    with open(fi_path, "w") as f:
        json.dump(feature_importance, f, indent=2)
    print(f"Feature importance saved to: {fi_path}")

    return metrics


def main() -> int:
    parser = argparse.ArgumentParser(description="Train LightGBM Price Spike Predictor")
    parser.add_argument("--data", type=str, help="Path to historical AESO CSV data")
    parser.add_argument("--threshold", type=float, default=1000.0, help="Spike threshold CAD/MWh (default: 1000)")
    parser.add_argument("--synthetic", action="store_true", help="Use synthetic data for testing")
    parser.add_argument("--output", type=str, default=".", help="Output directory for model artifacts")
    args = parser.parse_args()

    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    if args.synthetic:
        print("Generating synthetic data for training...")
        df = generate_synthetic_data(n_samples=2000)
    elif args.data:
        print(f"Loading data from: {args.data}")
        df = pd.read_csv(args.data)
    else:
        print("ERROR: Either --data or --synthetic must be specified", file=sys.stderr)
        return 1

    print(f"Data shape: {df.shape}")
    print(f"Columns: {list(df.columns)}")
    print()

    metrics = train_lgbm_model(df, args.threshold, str(output_dir))

    print(f"\nTraining complete. F1={metrics['f1']}, AUC={metrics['auc']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
