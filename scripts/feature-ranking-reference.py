#!/usr/bin/env python3
import argparse
import json
import math
from pathlib import Path

import numpy as np


def mean(values):
    return float(sum(values) / len(values)) if values else 0.0


def variance(values):
    if len(values) < 2:
        return 0.0
    avg = mean(values)
    return mean([(value - avg) ** 2 for value in values])


def std_dev(values):
    return math.sqrt(variance(values))


def median(values):
    if not values:
        return 0.0
    ordered = sorted(values)
    midpoint = len(ordered) // 2
    if len(ordered) % 2 == 0:
        return float((ordered[midpoint - 1] + ordered[midpoint]) / 2)
    return float(ordered[midpoint])


def pearson(left, right):
    if len(left) != len(right) or len(left) < 2:
        return 0.0
    left_mean = mean(left)
    right_mean = mean(right)
    numerator = sum((left[index] - left_mean) * (right[index] - right_mean) for index in range(len(left)))
    left_sum = sum((value - left_mean) ** 2 for value in left)
    right_sum = sum((value - right_mean) ** 2 for value in right)
    denominator = math.sqrt(left_sum * right_sum)
    return 0.0 if denominator == 0 else float(numerator / denominator)


def standardize_rows(rows, features):
    stats = {}
    matrix = []
    for feature in features:
        values = [float(row.get(feature, 0.0)) for row in rows]
        feature_mean = mean(values)
        feature_std = std_dev(values) or 1.0
        stats[feature] = {"mean": feature_mean, "std": feature_std}

    for row in rows:
        matrix.append([
            (float(row.get(feature, 0.0)) - stats[feature]["mean"]) / stats[feature]["std"]
            for feature in features
        ])

    return matrix, stats


def train_linear_margin_model(rows, labels, features, learning_rate=0.02, epochs=140, regularization=0.01):
    matrix, stats = standardize_rows(rows, features)
    weights = np.zeros(len(features), dtype=float)
    bias = 0.0

    for _ in range(epochs):
        for row_index, x in enumerate(matrix):
            y = labels[row_index]
            x_array = np.array(x, dtype=float)
            margin = y * (float(np.dot(weights, x_array)) + bias)
            weights -= learning_rate * regularization * weights
            if margin < 1:
                weights += learning_rate * y * x_array
                bias += learning_rate * y

    margins = [labels[index] * (float(np.dot(weights, matrix[index])) + bias) for index in range(len(matrix))]
    return {
        "weights": weights.tolist(),
        "bias": bias,
        "stats": stats,
        "margin": mean(margins),
    }


def round_js(value, decimals=2):
    if not math.isfinite(value):
        return 0.0
    factor = 10 ** decimals
    return math.floor((value * factor) + 0.5) / factor


def main() -> int:
    parser = argparse.ArgumentParser(description="Run aligned Python parity for feature ranking.")
    parser.add_argument("--dataset", required=True, help="Path to the benchmark dataset JSON")
    parser.add_argument("--out", required=True, help="Path to write the aligned reference JSON")
    parser.add_argument("--seed", type=int, default=42, help="Deterministic seed (reserved for future parity variants)")
    args = parser.parse_args()

    payload = json.loads(Path(args.dataset).read_text())
    rows = payload["rows"]
    target_key = payload["targetKey"]
    feature_names = payload["featureNames"]
    target_values = [float(row[target_key]) for row in rows]
    target_threshold = float(payload.get("targetThreshold", median(target_values)))
    min_features = max(1, int(payload.get("minFeatures", 4)))
    max_iterations = max(1, int(payload.get("maxIterations", len(feature_names))))
    learning_rate = float(payload.get("learningRate", 0.02))
    regularization = float(payload.get("regularization", 0.01))
    epochs = max(1, int(payload.get("epochs", 140)))

    labels = [1 if float(value) >= target_threshold else -1 for value in target_values]
    positive_rate = len([value for value in labels if value == 1]) / len(labels) if labels else 0.0

    remaining = list(feature_names)
    elimination_log = []
    final_model = train_linear_margin_model(
        rows,
        labels,
        remaining,
        learning_rate=learning_rate,
        epochs=epochs,
        regularization=regularization,
    )

    iteration = 0
    while len(remaining) > min_features and iteration < max_iterations:
      feature_scores = []
      for index, feature in enumerate(remaining):
          score = abs(final_model["weights"][index]) * (final_model["stats"][feature]["std"] or 1.0)
          feature_scores.append({"feature": feature, "score": score})
      feature_scores.sort(key=lambda item: (item["score"], item["feature"]))
      weakest = feature_scores[0] if feature_scores else None
      if weakest is None:
          break

      elimination_log.append({
          "feature": weakest["feature"],
          "score": round_js(float(weakest["score"]), 6),
          "reason": "low_signal" if weakest["score"] <= 0.015 else "recursive_elimination",
      })
      remaining = [feature for feature in remaining if feature != weakest["feature"]]
      iteration += 1

      if len(remaining) <= min_features:
          break

      final_model = train_linear_margin_model(
          rows,
          labels,
          remaining,
          learning_rate=learning_rate,
          epochs=epochs,
          regularization=regularization,
      )

    retained_weights = {
        feature: final_model["weights"][index] if index < len(final_model["weights"]) else 0.0
        for index, feature in enumerate(remaining)
    }
    elimination_by_feature = {entry["feature"]: entry for entry in elimination_log}

    rankings = []
    for feature in feature_names:
        retained = feature in remaining
        elimination = elimination_by_feature.get(feature)
        weight = float(retained_weights.get(feature, 0.0)) if retained else 0.0
        score = abs(weight) * (final_model["stats"][feature]["std"] or 1.0) if retained else float((elimination or {}).get("score", 0.0))
        values = [float(row.get(feature, 0.0)) for row in rows]
        correlation = abs(pearson(values, target_values))
        rankings.append({
            "feature": feature,
            "score": round_js(score, 6),
            "correlationToTarget": round_js(correlation, 6),
            "retained": retained,
            "dropReason": None if retained else (elimination or {}).get("reason", "recursive_elimination"),
            "weight": round_js(weight, 6),
        })

    rankings.sort(key=lambda item: (-item["score"], -item["correlationToTarget"], item["feature"]))

    output = {
        "modelVersion": "python-aligned-svm-rfe-v1",
        "sampleCount": int(len(rows)),
        "targetThreshold": target_threshold,
        "retainedFeatures": [entry["feature"] for entry in rankings if entry["retained"]],
        "droppedFeatures": elimination_log,
        "rankings": [
            {
                "feature": entry["feature"],
                "rank": index + 1,
                "retained": entry["retained"],
                "score": entry["score"],
            }
            for index, entry in enumerate(rankings)
        ],
        "trainingSummary": {
            "samples": len(rows),
            "positiveRate": round_js(positive_rate, 4),
            "targetThreshold": target_threshold,
            "margin": round_js(float(final_model["margin"]), 4),
        },
    }

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(output, indent=2))
    print(f"Aligned feature ranking reference written to {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
