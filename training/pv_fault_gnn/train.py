from __future__ import annotations

import argparse
import json
import math
import random
from datetime import datetime, timezone
from pathlib import Path

if __package__ is None or __package__ == "":
    import sys

    sys.path.append(str(Path(__file__).resolve().parents[2]))

import numpy as np
import torch
from torch import nn

from training.common.metrics_export import build_placeholder_metrics
from training.common.weight_export import DEFAULT_SEED, build_manifest, compute_artifact_sha, write_json
from training.pv_fault_gnn.simulator import (
    FAULT_CLASSES,
    MODEL_KEY,
    MODEL_VERSION,
    NODE_FEATURE_COLUMNS,
    SIMULATOR_NAME,
    SIMULATOR_VERSION,
    TOPOLOGY,
    build_node_feature_vector,
    classify_score,
    confusion_counts,
    f1_from_counts,
    forward_gnn,
    mean,
    round_value,
    split_indices,
    top_margin_from_prediction,
    top3_localization_accuracy,
)

CLASS_TARGET_ANCHORS = {
    "healthy_cluster": 0.10,
    "inverter_trip": 0.32,
    "soiling_cluster": 0.54,
    "hot_spot_derating": 0.72,
    "localized_short_circuit": 0.88,
}

CLASS_TARGET_WEIGHT = 0.8
NODE_TARGET_WEIGHT = 0.2


def load_rows(path: Path) -> list[dict[str, object]]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def set_determinism(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    try:
        torch.use_deterministic_algorithms(True)
    except Exception:
        pass


def flatten_nodes(rows: list[dict[str, object]]) -> tuple[np.ndarray, np.ndarray]:
    features: list[list[float]] = []
    targets: list[float] = []
    for row in rows:
        class_anchor = CLASS_TARGET_ANCHORS.get(str(row["fault_class"]), 0.5)
        for node in row["nodes"]:
            features.append(build_node_feature_vector(node))
            targets.append(round_value(class_anchor * CLASS_TARGET_WEIGHT + float(node["target_severity"]) * NODE_TARGET_WEIGHT, 6))
    return np.asarray(features, dtype=np.float32), np.asarray(targets, dtype=np.float32)


def standardize(features: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    means = features.mean(axis=0)
    stds = features.std(axis=0)
    stds[stds == 0] = 1.0
    return (features - means) / stds, means, stds


def export_layer(model: nn.Module) -> dict[str, object]:
    modules = [module for module in model.modules() if isinstance(module, (nn.Linear, nn.ReLU, nn.Sigmoid))]
    linear = next(module for module in modules if isinstance(module, nn.Linear))
    weights = linear.weight.detach().cpu().numpy()
    bias = linear.bias.detach().cpu().numpy()
    activation = 'linear'
    for module in modules[modules.index(linear) + 1:]:
        if isinstance(module, nn.ReLU):
            activation = 'relu'
            break
        if isinstance(module, nn.Sigmoid):
            activation = 'sigmoid'
            break
    return {
        "weights": [[round_value(float(value), 6) for value in row] for row in weights.tolist()],
        "bias": [round_value(float(value), 6) for value in bias.tolist()],
        "activation": activation,
    }


def predict_scores(weights: dict[str, object], rows: list[dict[str, object]]) -> list[dict[str, object]]:
    outputs = []
    for row in rows:
      # Scenario-level evaluation uses the worst node score, mirroring runtime behavior.
        prediction = forward_gnn(
            weights,
            [
                {
                    "id": str(node["id"]),
                    "features": build_node_feature_vector(node),
                }
                for node in row["nodes"]
            ],
            [
                {
                    "from": str(edge["from"]),
                    "to": str(edge["to"]),
                    "weight": float(edge.get("weight", 1.0)),
                }
                for edge in row["edges"]
            ],
        )
        outputs.append({
            "row": row,
            "prediction": prediction,
            "score": float(prediction["confidenceScore"]),
            "fault_class": str(row["fault_class"]),
        })
    return outputs


def initial_thresholds(results: list[dict[str, object]]) -> dict[str, float]:
    by_class: dict[str, list[float]] = {label: [] for label in FAULT_CLASSES}
    for result in results:
        by_class[result["fault_class"]].append(float(result["score"]))

    def q(label: str, percentile: float) -> float:
        values = by_class[label]
        if not values:
            return 0.0
        return float(np.quantile(np.asarray(values, dtype=np.float64), percentile))

    inverter = (q("healthy_cluster", 0.9) + q("inverter_trip", 0.1)) / 2
    soiling = (q("inverter_trip", 0.9) + q("soiling_cluster", 0.1)) / 2
    hot_spot = (q("soiling_cluster", 0.9) + q("hot_spot_derating", 0.1)) / 2
    localized = (q("hot_spot_derating", 0.9) + q("localized_short_circuit", 0.1)) / 2
    inverter = max(0.05, inverter)
    soiling = max(inverter + 0.02, soiling)
    hot_spot = max(soiling + 0.02, hot_spot)
    localized = max(hot_spot + 0.02, localized)
    return {
        "healthy_cluster": round_value(max(0.0, inverter - 0.12), 6),
        "inverter_trip": round_value(inverter, 6),
        "soiling_cluster": round_value(soiling, 6),
        "hot_spot_derating": round_value(hot_spot, 6),
        "localized_short_circuit": round_value(localized, 6),
    }


def refine_thresholds(results: list[dict[str, object]], thresholds: dict[str, float]) -> dict[str, float]:
    order = ["inverter_trip", "soiling_cluster", "hot_spot_derating", "localized_short_circuit"]

    def macro_f1(current_thresholds: dict[str, float]) -> float:
        predicted = [classify_score(float(entry["score"]), current_thresholds) for entry in results]
        expected = [str(entry["fault_class"]) for entry in results]
        return f1_from_counts(confusion_counts(expected, predicted))

    current = dict(thresholds)
    for _ in range(2):
        for index, key in enumerate(order):
            lower = 0.05 if index == 0 else current[order[index - 1]] + 0.02
            upper = 0.98 if index == len(order) - 1 else current[order[index + 1]] - 0.02
            if upper <= lower:
                continue
            candidate_values = np.linspace(lower, upper, 41)
            best_value = current[key]
            best_score = macro_f1(current)
            for candidate in candidate_values:
                trial = dict(current)
                trial[key] = round_value(float(candidate), 6)
                trial["healthy_cluster"] = round_value(max(0.0, trial["inverter_trip"] - 0.12), 6)
                score = macro_f1(trial)
                if score > best_score + 1e-9 or (abs(score - best_score) <= 1e-9 and abs(candidate - current[key]) < abs(best_value - current[key])):
                    best_value = float(candidate)
                    best_score = score
            current[key] = round_value(best_value, 6)
            current["healthy_cluster"] = round_value(max(0.0, current["inverter_trip"] - 0.12), 6)
    return current


def candidate_edge_schedules() -> list[list[float]]:
    base = np.asarray([0.36, 0.29, 0.23, 0.17], dtype=np.float64)
    schedules: list[list[float]] = []
    for scale in [0.35, 0.45, 0.55, 0.65, 0.8, 0.95]:
        candidate = np.clip(base * scale, 0.03, 0.45)
        candidate = np.sort(candidate)[::-1]
        schedules.append([round_value(float(value), 6) for value in candidate.tolist()])
    return schedules


def evaluate_candidate(
    candidate_edge_weights: list[float],
    train_rows: list[dict[str, object]],
    val_rows: list[dict[str, object]],
    node_layer: dict[str, object],
) -> dict[str, object]:
    provisional_weights = {
        "node_projection": node_layer,
        "edge_weights": candidate_edge_weights,
        "iterations": 4,
        "class_thresholds": {
            "healthy_cluster": 0.1,
            "inverter_trip": 0.2,
            "soiling_cluster": 0.35,
            "hot_spot_derating": 0.5,
            "localized_short_circuit": 0.7,
        },
    }
    val_results = predict_scores(provisional_weights, val_rows)
    thresholds = refine_thresholds(val_results, initial_thresholds(val_results))
    final_weights = {
        **provisional_weights,
        "class_thresholds": thresholds,
    }
    val_predictions = predict_scores(final_weights, val_rows)
    labels = [entry["fault_class"] for entry in val_predictions]
    predicted = [classify_score(float(entry["score"]), thresholds) for entry in val_predictions]
    f1 = f1_from_counts(confusion_counts(labels, predicted))
    top3 = top3_localization_accuracy([
        {
            **entry["row"],
            **entry["prediction"],
        }
        for entry in val_predictions
    ])
    margin = mean([
        top_margin_from_prediction(entry["prediction"])
        for entry in val_predictions
    ]) if val_predictions else 0.0
    val_loss = float(np.mean([
        (float(entry["prediction"]["confidenceScore"]) - float(entry["row"]["scenario_score"])) ** 2
        for entry in val_predictions
    ])) if val_predictions else 0.0
    return {
        "edge_weights": candidate_edge_weights,
        "thresholds": thresholds,
        "f1": round_value(f1, 6),
        "top3_localization_accuracy": round_value(top3, 6),
        "top_margin": round_value(margin, 6),
        "validation_loss": round_value(val_loss, 6),
        "val_predictions": val_predictions,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Train simulator-calibrated PV fault graph weights.")
    parser.add_argument("--input", required=True, help="Scenario JSONL generated by generate_scenarios.py.")
    parser.add_argument("--out-weights", required=True, help="Path to write pv-gnn-v2.json.")
    parser.add_argument("--out-metrics", required=True, help="Path to write metrics JSON.")
    parser.add_argument("--count", type=int, default=20000, help="Scenario count used for the manifest.")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED, help="Deterministic seed. Default: 42.")
    parser.add_argument("--epochs", type=int, default=250, help="Training epochs.")
    parser.add_argument("--learning-rate", type=float, default=0.01, help="Adam learning rate.")
    args = parser.parse_args()

    rows = load_rows(Path(args.input))
    if not rows:
        raise SystemExit("No scenario rows found. Run generate_scenarios.py first.")

    set_determinism(args.seed)
    train_idx, val_idx, test_idx = split_indices(len(rows), args.seed)
    train_rows = [rows[index] for index in train_idx]
    val_rows = [rows[index] for index in val_idx]
    test_rows = [rows[index] for index in test_idx]

    x_train, y_train = flatten_nodes(train_rows)
    x_val, y_val = flatten_nodes(val_rows)
    x_test, y_test = flatten_nodes(test_rows)

    x_train_std, feature_means, feature_stds = standardize(x_train)
    x_val_std = (x_val - feature_means) / feature_stds
    x_test_std = (x_test - feature_means) / feature_stds

    model = nn.Sequential(
        nn.Linear(len(NODE_FEATURE_COLUMNS), len(NODE_FEATURE_COLUMNS)),
        nn.Sigmoid(),
    )
    optimizer = torch.optim.Adam(model.parameters(), lr=args.learning_rate)
    loss_fn = nn.MSELoss()

    x_train_tensor = torch.tensor(x_train_std, dtype=torch.float32)
    y_train_tensor = torch.tensor(y_train, dtype=torch.float32).view(-1, 1)
    x_val_tensor = torch.tensor(x_val_std, dtype=torch.float32)
    y_val_tensor = torch.tensor(y_val, dtype=torch.float32).view(-1, 1)

    best_state = None
    best_loss = float("inf")
    patience = 16
    stale_epochs = 0

    for _ in range(args.epochs):
        model.train()
        optimizer.zero_grad()
        projected = model(x_train_tensor)
        predictions = projected.mean(dim=1, keepdim=True)
        loss = loss_fn(predictions, y_train_tensor)
        loss.backward()
        optimizer.step()

        model.eval()
        with torch.no_grad():
            val_predictions = model(x_val_tensor).mean(dim=1, keepdim=True)
            val_loss = loss_fn(val_predictions, y_val_tensor).item()
        if val_loss < best_loss - 1e-6:
            best_loss = val_loss
            best_state = {
                key: value.detach().cpu().clone()
                for key, value in model.state_dict().items()
            }
            stale_epochs = 0
        else:
            stale_epochs += 1
            if stale_epochs >= patience:
                break

    if best_state is not None:
        model.load_state_dict(best_state)

    node_layer = export_layer(model)
    candidate_results = [
        evaluate_candidate(candidate, train_rows, val_rows, node_layer)
        for candidate in candidate_edge_schedules()
    ]
    best_candidate = max(
        candidate_results,
        key=lambda entry: (entry["f1"], entry["top3_localization_accuracy"], entry["top_margin"], -entry["validation_loss"]),
    )
    final_weights = {
        "manifest": None,  # placeholder filled after metrics are computed
        "node_projection": node_layer,
        "edge_weights": best_candidate["edge_weights"],
        "iterations": 4,
        "class_thresholds": best_candidate["thresholds"],
    }

    train_results = predict_scores(final_weights, train_rows)
    val_results = best_candidate["val_predictions"]
    test_results = predict_scores(final_weights, test_rows)

    train_macro_f1 = f1_from_counts(
        confusion_counts(
            [str(entry["fault_class"]) for entry in train_results],
            [classify_score(float(entry["score"]), best_candidate["thresholds"]) for entry in train_results],
        )
    )
    val_macro_f1 = f1_from_counts(
        confusion_counts(
            [str(entry["fault_class"]) for entry in val_results],
            [classify_score(float(entry["score"]), best_candidate["thresholds"]) for entry in val_results],
        )
    )
    test_macro_f1 = f1_from_counts(
        confusion_counts(
            [str(entry["fault_class"]) for entry in test_results],
            [classify_score(float(entry["score"]), best_candidate["thresholds"]) for entry in test_results],
        )
    )

    train_top3 = top3_localization_accuracy([
        {**entry["row"], **entry["prediction"]} for entry in train_results
    ])
    val_top3 = top3_localization_accuracy([
        {**entry["row"], **entry["prediction"]} for entry in val_results
    ])
    test_top3 = top3_localization_accuracy([
        {**entry["row"], **entry["prediction"]} for entry in test_results
    ])

    validation_loss = round_value(
        float(np.mean([
            (float(entry["prediction"]["confidenceScore"]) - float(entry["row"]["scenario_score"])) ** 2
            for entry in val_results
        ])),
        6,
    )

    metrics = {
        "f1": round_value(test_macro_f1, 6),
        "top3_localization_accuracy": round_value(test_top3, 6),
        "validation_loss": validation_loss,
        "train_f1": round_value(train_macro_f1, 6),
        "val_f1": round_value(val_macro_f1, 6),
        "train_top3_localization_accuracy": round_value(train_top3, 6),
        "val_top3_localization_accuracy": round_value(val_top3, 6),
    }

    trained_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    artifact = {
        "manifest": build_manifest(
            model_key=MODEL_KEY,
            model_version=MODEL_VERSION,
            scenario_count=args.count,
            simulator_name=SIMULATOR_NAME,
            simulator_version=SIMULATOR_VERSION,
            topology=TOPOLOGY,
            metrics={
                "f1": metrics["f1"],
                "top3_localization_accuracy": metrics["top3_localization_accuracy"],
                "validation_loss": metrics["validation_loss"],
            },
            seed=args.seed,
            trained_at=trained_at,
            warning="Simulator-calibrated on pvlib + mv_oberrhein synthetic PV fault scenarios. Real-world fine-tuning pending partner data.",
        ),
        "node_projection": node_layer,
        "edge_weights": best_candidate["edge_weights"],
        "iterations": 4,
        "class_thresholds": best_candidate["thresholds"],
    }
    artifact["manifest"]["training_artifact_sha"] = compute_artifact_sha(artifact)

    write_json(Path(args.out_weights), artifact)
    write_json(
        Path(args.out_metrics),
        {
            "model_key": MODEL_KEY,
            "scenario_count": args.count,
            "seed": args.seed,
            "metrics": metrics,
            "selected_network": TOPOLOGY,
            "simulator_version": SIMULATOR_VERSION,
            "training_data_profile": "simulator-calibrated",
            "training_artifact_sha": artifact["manifest"]["training_artifact_sha"],
            "thresholds": best_candidate["thresholds"],
            "edge_weights": best_candidate["edge_weights"],
        },
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
