#!/usr/bin/env python3
import argparse
import json
from pathlib import Path

import numpy as np
from sklearn.feature_selection import RFE
from sklearn.preprocessing import StandardScaler
from sklearn.svm import LinearSVC


def main() -> int:
    parser = argparse.ArgumentParser(description="Run sklearn baseline benchmark for feature ranking.")
    parser.add_argument("--dataset", required=True, help="Path to the benchmark dataset JSON")
    parser.add_argument("--out", required=True, help="Path to write the sklearn baseline JSON")
    parser.add_argument("--seed", type=int, default=42, help="Deterministic seed")
    args = parser.parse_args()

    payload = json.loads(Path(args.dataset).read_text())
    rows = payload["rows"]
    target_key = payload["targetKey"]
    target_threshold = float(payload["targetThreshold"])
    feature_names = payload["featureNames"]
    min_features = max(4, int(payload.get("minFeatures", 4)))
    max_iterations = max(1, int(payload.get("maxIterations", 10)))
    retained_feature_count = max(min_features, len(feature_names) - max_iterations)

    X = np.array([[float(row[name]) for name in feature_names] for row in rows], dtype=float)
    y = np.array([1 if float(row[target_key]) >= target_threshold else -1 for row in rows], dtype=int)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    estimator = LinearSVC(random_state=args.seed, dual=False, max_iter=20000)
    selector = RFE(estimator=estimator, n_features_to_select=retained_feature_count, step=1)
    selector.fit(X_scaled, y)

    retained_features = [feature for feature, retained in zip(feature_names, selector.support_) if retained]
    dropped_features = [feature for feature, retained in zip(feature_names, selector.support_) if not retained]

    ranking_entries = []
    for feature, rank, retained in zip(feature_names, selector.ranking_, selector.support_):
        ranking_entries.append(
            {
                "feature": feature,
                "rank": int(rank),
                "retained": bool(retained),
                "score": float(1.0 / rank),
            }
        )

    ranking_entries.sort(
        key=lambda entry: (
            0 if entry["retained"] else 1,
            entry["rank"],
            entry["feature"],
        )
    )
    for index, entry in enumerate(ranking_entries, start=1):
        entry["rank"] = index

    output = {
        "modelVersion": "sklearn-linear-svc-rfe-baseline-v1",
        "sampleCount": int(len(rows)),
        "targetThreshold": target_threshold,
        "retainedFeatures": retained_features,
        "droppedFeatures": dropped_features,
        "rankings": ranking_entries,
    }

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(output, indent=2))
    print(f"Baseline feature ranking written to {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
