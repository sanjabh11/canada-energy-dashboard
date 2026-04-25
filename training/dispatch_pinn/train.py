from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

if __package__ is None or __package__ == "":
    import sys

    sys.path.append(str(Path(__file__).resolve().parents[2]))

import numpy as np
import torch
from torch import nn

from training.common.weight_export import DEFAULT_SEED, build_manifest, compute_artifact_sha, write_json
from training.dispatch_pinn.simulator import FEATURE_COLUMNS, MODEL_KEY, MODEL_VERSION, SIMULATOR_VERSION


def load_rows(path: Path) -> list[dict[str, object]]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def _set_determinism(seed: int) -> None:
    np.random.seed(seed)
    torch.manual_seed(seed)
    try:
        torch.use_deterministic_algorithms(True)
    except Exception:
        pass


def _build_model(input_dim: int, hidden_dim: int) -> nn.Module:
    return nn.Sequential(
        nn.Linear(input_dim, hidden_dim),
        nn.ReLU(),
        nn.Linear(hidden_dim, 1),
    )


def _split_indices(size: int, seed: int, train_ratio: float = 0.8, val_ratio: float = 0.1) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)
    indices = np.arange(size)
    rng.shuffle(indices)
    train_end = int(size * train_ratio)
    val_end = train_end + int(size * val_ratio)
    return indices[:train_end], indices[train_end:val_end], indices[val_end:]


def _prepare_arrays(rows: list[dict[str, object]]) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    features = np.array([[float(row[column]) for column in FEATURE_COLUMNS] for row in rows], dtype=np.float32)
    targets = np.array([float(row["target_dispatch_mw"]) for row in rows], dtype=np.float32).reshape(-1, 1)
    upper_bounds = np.array([float(row["physics_upper_bound_mw"]) for row in rows], dtype=np.float32).reshape(-1, 1)
    lower_bounds = np.array([float(row["physics_lower_bound_mw"]) for row in rows], dtype=np.float32).reshape(-1, 1)
    previous = np.array([float(row["previous_dispatch_mw"]) for row in rows], dtype=np.float32).reshape(-1, 1)
    ramp_limits = np.array([float(row["ramp_limit_mw_per_hour"]) for row in rows], dtype=np.float32).reshape(-1, 1)
    sample_weights = np.array([float(row.get("sample_weight", 1.0)) for row in rows], dtype=np.float32).reshape(-1, 1)
    return features, targets, upper_bounds, lower_bounds, previous, ramp_limits, sample_weights


def _weighted_loss(
    predictions: torch.Tensor,
    targets: torch.Tensor,
    target_mean: torch.Tensor,
    target_std: torch.Tensor,
    upper_bounds: torch.Tensor,
    lower_bounds: torch.Tensor,
    previous: torch.Tensor,
    ramp_limits: torch.Tensor,
    sample_weights: torch.Tensor,
) -> torch.Tensor:
    scaled_predictions = predictions * target_std + target_mean
    mse = ((predictions - targets) ** 2) * sample_weights
    capacity_penalty = torch.relu(scaled_predictions - upper_bounds)
    reserve_penalty = torch.relu(lower_bounds - scaled_predictions)
    ramp_penalty = torch.relu(torch.abs(scaled_predictions - previous) - ramp_limits)
    return mse.mean() + 0.25 * capacity_penalty.mean() + 0.2 * reserve_penalty.mean() + 0.55 * ramp_penalty.mean()


def _evaluate(
    model: nn.Module,
    x: torch.Tensor,
    targets: torch.Tensor,
    upper_bounds: torch.Tensor,
    lower_bounds: torch.Tensor,
    previous: torch.Tensor,
    ramp_limits: torch.Tensor,
    target_mean: torch.Tensor,
    target_std: torch.Tensor,
) -> dict[str, float]:
    with torch.no_grad():
        predictions = model(x) * target_std + target_mean
        residual = predictions - targets
        mape = torch.mean(torch.abs(residual) / torch.clamp(torch.abs(targets), min=1.0)).item()
        rmse = torch.sqrt(torch.mean(residual**2)).item()
        physics_violations = torch.mean(
            ((predictions > upper_bounds) | (predictions < lower_bounds) | (torch.abs(predictions - previous) > ramp_limits)).float(),
        ).item()
        loss = _weighted_loss(
            predictions,
            targets,
            target_mean,
            target_std,
            upper_bounds,
            lower_bounds,
            previous,
            ramp_limits,
            torch.ones_like(targets),
        ).item()
    return {
        "mape": round(float(mape), 6),
        "rmse": round(float(rmse), 6),
        "physics_violation_rate": round(float(physics_violations), 6),
        "validation_loss": round(float(loss), 6),
    }


def _round_matrix(matrix: np.ndarray) -> list[list[float]]:
    return [[round(float(value), 6) for value in row] for row in matrix.tolist()]


def _round_vector(vector: np.ndarray) -> list[float]:
    return [round(float(value), 6) for value in vector.tolist()]


def _export_weights(
    model: nn.Module,
    feature_means: np.ndarray,
    feature_stds: np.ndarray,
    metrics: dict[str, float],
    seed: int,
    scenario_count: int,
    trained_at: str,
    target_mean: float,
    target_std: float,
) -> dict[str, object]:
    linear_layers = [module for module in model if isinstance(module, nn.Linear)]
    exported_layers = []
    for layer_index, layer in enumerate(linear_layers):
        exported_layers.append(
            {
                "weights": _round_matrix(layer.weight.detach().cpu().numpy()),
                "bias": _round_vector(layer.bias.detach().cpu().numpy()),
                "activation": "relu" if layer_index < len(linear_layers) - 1 else "linear",
            },
        )

    artifact = {
        "manifest": build_manifest(
            model_key=MODEL_KEY,
            model_version=MODEL_VERSION,
            scenario_count=scenario_count,
            simulator_name="pandapower",
            simulator_version=SIMULATOR_VERSION,
            topology="IEEE-30",
            metrics=metrics,
            seed=seed,
            trained_at=trained_at,
            warning="Simulator-calibrated on pandapower DC-OPF LHS scenarios for IEEE-30. Real-world fine-tuning pending partner data.",
        ),
        "feature_means": _round_vector(feature_means),
        "feature_stds": _round_vector(feature_stds),
        "layers": exported_layers,
        "target_mean": round(target_mean, 6),
        "target_std": round(target_std, 6),
    }
    artifact["manifest"]["training_artifact_sha"] = compute_artifact_sha(artifact)
    return artifact


def main() -> int:
    parser = argparse.ArgumentParser(description="Train pandapower-calibrated dispatch weights.")
    parser.add_argument("--input", required=True, help="Scenario JSONL generated by generate_scenarios.py.")
    parser.add_argument("--out-weights", required=True, help="Path to write dispatch-pinn-v2.json.")
    parser.add_argument("--out-metrics", required=True, help="Path to write metrics JSON.")
    parser.add_argument("--count", type=int, default=5000, help="Scenario count used for the manifest.")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED, help="Deterministic seed. Default: 42.")
    parser.add_argument("--epochs", type=int, default=300, help="Training epochs.")
    parser.add_argument("--hidden-dim", type=int, default=32, help="Hidden layer width.")
    parser.add_argument("--learning-rate", type=float, default=0.008, help="Adam learning rate.")
    args = parser.parse_args()

    rows = load_rows(Path(args.input))
    if not rows:
        raise SystemExit("No scenario rows found. Run generate_scenarios.py first.")

    _set_determinism(args.seed)
    features, targets, upper_bounds, lower_bounds, previous, ramp_limits, sample_weights = _prepare_arrays(rows)
    train_idx, val_idx, test_idx = _split_indices(len(rows), args.seed)
    target_mean = float(targets[train_idx].mean())
    target_std = float(targets[train_idx].std())
    if not np.isfinite(target_std) or target_std == 0:
        target_std = 1.0

    feature_means = features[train_idx].mean(axis=0)
    feature_stds = features[train_idx].std(axis=0)
    feature_stds[feature_stds == 0] = 1.0

    x_all = torch.tensor((features - feature_means) / feature_stds, dtype=torch.float32)
    y_all = torch.tensor((targets - target_mean) / target_std, dtype=torch.float32)
    raw_targets_all = torch.tensor(targets, dtype=torch.float32)
    upper_all = torch.tensor(upper_bounds, dtype=torch.float32)
    lower_all = torch.tensor(lower_bounds, dtype=torch.float32)
    previous_all = torch.tensor(previous, dtype=torch.float32)
    ramp_all = torch.tensor(ramp_limits, dtype=torch.float32)
    sample_weights_all = torch.tensor(sample_weights, dtype=torch.float32)

    x_train = x_all[train_idx]
    y_train = y_all[train_idx]
    raw_y_train = raw_targets_all[train_idx]
    upper_train = upper_all[train_idx]
    lower_train = lower_all[train_idx]
    previous_train = previous_all[train_idx]
    ramp_train = ramp_all[train_idx]
    sample_weights_train = sample_weights_all[train_idx]

    x_val = x_all[val_idx]
    y_val = y_all[val_idx]
    raw_y_val = raw_targets_all[val_idx]
    upper_val = upper_all[val_idx]
    lower_val = lower_all[val_idx]
    previous_val = previous_all[val_idx]
    ramp_val = ramp_all[val_idx]

    x_test = x_all[test_idx]
    y_test = y_all[test_idx]
    raw_y_test = raw_targets_all[test_idx]
    upper_test = upper_all[test_idx]
    lower_test = lower_all[test_idx]
    previous_test = previous_all[test_idx]
    ramp_test = ramp_all[test_idx]

    model = _build_model(input_dim=len(FEATURE_COLUMNS), hidden_dim=args.hidden_dim)
    optimizer = torch.optim.Adam(model.parameters(), lr=args.learning_rate)

    best_state = None
    best_val_loss = float("inf")
    patience = 8
    stale_epochs = 0

    for _ in range(args.epochs):
        model.train()
        optimizer.zero_grad()
        predictions = model(x_train)
        loss = _weighted_loss(
            predictions,
            y_train,
            torch.tensor(target_mean, dtype=torch.float32),
            torch.tensor(target_std, dtype=torch.float32),
            upper_train,
            lower_train,
            previous_train,
            ramp_train,
            sample_weights_train,
        )
        loss.backward()
        optimizer.step()

        model.eval()
        val_loss = _weighted_loss(
            model(x_val),
            y_val,
            torch.tensor(target_mean, dtype=torch.float32),
            torch.tensor(target_std, dtype=torch.float32),
            upper_val,
            lower_val,
            previous_val,
            ramp_val,
            torch.ones_like(y_val),
        ).item()
        if val_loss + 1e-7 < best_val_loss:
            best_val_loss = val_loss
            best_state = {key: value.detach().clone() for key, value in model.state_dict().items()}
            stale_epochs = 0
        else:
            stale_epochs += 1
        if stale_epochs >= patience:
            break

    if best_state is not None:
        model.load_state_dict(best_state)

    metrics = _evaluate(
        model,
        x_test,
        raw_y_test,
        upper_test,
        lower_test,
        previous_test,
        ramp_test,
        torch.tensor(target_mean, dtype=torch.float32),
        torch.tensor(target_std, dtype=torch.float32),
    )
    trained_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    weights = _export_weights(model, feature_means, feature_stds, metrics, args.seed, len(rows), trained_at, target_mean, target_std)

    write_json(Path(args.out_weights), weights)
    write_json(
        Path(args.out_metrics),
        {
            "model_key": MODEL_KEY,
            "scenario_count": len(rows),
            "seed": args.seed,
            "training_data_profile": "simulator-calibrated",
            "placeholder": False,
            "note": "Pandapower DC-OPF calibrated dispatch weights trained on IEEE-30 LHS scenarios.",
            **metrics,
            "train_sample_count": int(len(train_idx)),
            "validation_sample_count": int(len(val_idx)),
            "test_sample_count": int(len(test_idx)),
        },
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
