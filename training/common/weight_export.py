"""Stable JSON export helpers for simulator bootstrap artifacts.

The placeholder build path uses a fixed default seed of 42 so repeated
regeneration stays byte-identical until B+.1/B+.2 replace the artifacts.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

DEFAULT_SEED = 42
PLACEHOLDER_TRAINED_AT = "2026-04-24T00:00:00.000Z"


def stable_json_dumps(payload: Any) -> str:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def sha256_json(payload: Any) -> str:
    return hashlib.sha256(stable_json_dumps(payload).encode("utf-8")).hexdigest()


def compute_artifact_sha(payload: Any) -> str:
    """Hash an artifact payload while normalizing the manifest SHA field.

    The SHA stored in the manifest should not depend on its own final value.
    We normalize that field before hashing so repeated exports remain stable.
    """
    normalized = json.loads(stable_json_dumps(payload))
    manifest = normalized.get("manifest")
    if isinstance(manifest, dict) and "training_artifact_sha" in manifest:
        manifest["training_artifact_sha"] = "__artifact_sha__"
    return sha256_json(normalized)


def write_json(path: str | Path, payload: Any) -> None:
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(stable_json_dumps(payload) + "\n", encoding="utf-8")


def build_manifest(
    *,
    model_key: str,
    model_version: str,
    scenario_count: int,
    simulator_name: str,
    simulator_version: str,
    topology: str,
    metrics: dict[str, float],
    seed: int = DEFAULT_SEED,
    trained_at: str = PLACEHOLDER_TRAINED_AT,
    training_data_profile: str = "simulator-calibrated",
    warning: str | None = None,
) -> dict[str, Any]:
    manifest = {
        "model_key": model_key,
        "model_version": model_version,
        "training_data_profile": training_data_profile,
        "training_artifact_sha": f"placeholder-{model_key}-seed-{seed}",
        "simulator_config": {
            "name": simulator_name,
            "version": simulator_version,
            "scenario_count": scenario_count,
            "topology": topology,
        },
        "trained_at": trained_at,
        "seed": seed,
        "metrics": metrics,
        "warnings": [
            warning or "Placeholder artifact. Replace with simulator-trained weights before runtime wiring.",
        ],
    }
    return manifest
