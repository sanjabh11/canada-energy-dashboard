from __future__ import annotations

from typing import Any

from training.common.weight_export import DEFAULT_SEED


def build_placeholder_metrics(
    *,
    model_key: str,
    scenario_count: int,
    seed: int = DEFAULT_SEED,
    note: str | None = None,
    **metrics: float,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "model_key": model_key,
        "scenario_count": scenario_count,
        "seed": seed,
        "placeholder": True,
    }
    payload.update(metrics)
    if note:
        payload["note"] = note
    return payload
