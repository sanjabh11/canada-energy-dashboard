from __future__ import annotations

from typing import Any

from training.common.weight_export import DEFAULT_SEED, PLACEHOLDER_TRAINED_AT


def build_dataset_manifest(
    *,
    model_key: str,
    scenario_count: int,
    simulator_name: str,
    simulator_version: str,
    topology: str,
    seed: int = DEFAULT_SEED,
    prepared_at: str = PLACEHOLDER_TRAINED_AT,
    source_description: str = "placeholder bootstrap dataset",
    sampling_strategy: str | None = None,
    git_commit_sha: str | None = None,
) -> dict[str, Any]:
    manifest = {
        "model_key": model_key,
        "scenario_count": scenario_count,
        "seed": seed,
        "prepared_at": prepared_at,
        "source_description": source_description,
        "simulator_config": {
            "name": simulator_name,
            "version": simulator_version,
            "scenario_count": scenario_count,
            "topology": topology,
        },
    }
    if sampling_strategy:
        manifest["sampling_strategy"] = sampling_strategy
    if git_commit_sha:
        manifest["git_commit_sha"] = git_commit_sha
    return manifest
