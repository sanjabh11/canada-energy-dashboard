from __future__ import annotations

import copy
import json
import logging
import os
import warnings
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np

FEATURE_COLUMNS = [
    "load_mw",
    "temperature_c",
    "wind_generation_mw",
    "solar_generation_mw",
    "reserve_margin_percent",
    "ramp_limit_mw_per_hour",
    "previous_dispatch_mw",
]

FEATURE_RANGES = {
    "load_mw": (5600.0, 12000.0),
    "temperature_c": (-35.0, 36.0),
    "wind_generation_mw": (0.0, 3600.0),
    "solar_generation_mw": (0.0, 2800.0),
    "reserve_margin_percent": (2.0, 26.0),
    "ramp_limit_mw_per_hour": (120.0, 400.0),
    "previous_dispatch_mw": (80.0, 350.0),
}

SIMULATOR_NAME = "pandapower"
SIMULATOR_VERSION = "pandapower-dcopf-ieee30-v1"
SIMULATOR_TOPOLOGY = "IEEE-30"
MODEL_KEY = "pinn-dispatch-v2"
MODEL_VERSION = "pinn-dispatch-v2"

_PANDAPOWER_CACHE: tuple[Any, Any, Any, Any] | None = None


@dataclass(frozen=True)
class DispatchScenario:
    index: int
    seed: int
    load_mw: float
    temperature_c: float
    wind_generation_mw: float
    solar_generation_mw: float
    reserve_margin_percent: float
    ramp_limit_mw_per_hour: float
    previous_dispatch_mw: float
    target_dispatch_mw: float
    physics_upper_bound_mw: float
    physics_lower_bound_mw: float
    available_generation_mw: float
    capacity_violation_mw: float
    reserve_violation_mw: float
    ramp_violation_mw: float
    sample_weight: float
    simulator_status: str
    wind_bus: int | None = None
    solar_bus: int | None = None

    def to_row(self) -> dict[str, Any]:
        return {
            "index": self.index,
            "seed": self.seed,
            "load_mw": round(self.load_mw, 3),
            "temperature_c": round(self.temperature_c, 3),
            "wind_generation_mw": round(self.wind_generation_mw, 3),
            "solar_generation_mw": round(self.solar_generation_mw, 3),
            "reserve_margin_percent": round(self.reserve_margin_percent, 3),
            "ramp_limit_mw_per_hour": round(self.ramp_limit_mw_per_hour, 3),
            "previous_dispatch_mw": round(self.previous_dispatch_mw, 3),
            "target_dispatch_mw": round(self.target_dispatch_mw, 3),
            "physics_upper_bound_mw": round(self.physics_upper_bound_mw, 3),
            "physics_lower_bound_mw": round(self.physics_lower_bound_mw, 3),
            "available_generation_mw": round(self.available_generation_mw, 3),
            "capacity_violation_mw": round(self.capacity_violation_mw, 3),
            "reserve_violation_mw": round(self.reserve_violation_mw, 3),
            "ramp_violation_mw": round(self.ramp_violation_mw, 3),
            "sample_weight": round(self.sample_weight, 6),
            "simulator_status": self.simulator_status,
            "wind_bus": self.wind_bus,
            "solar_bus": self.solar_bus,
        }


def build_feature_row(index: int, seed: int) -> dict[str, float]:
    return build_lhs_feature_rows(index + 1, seed)[index]


def _latin_hypercube_values(count: int, seed: int, low: float, high: float, salt: int) -> np.ndarray:
    if count <= 0:
        return np.array([], dtype=np.float64)
    rng = np.random.default_rng(seed + salt)
    strata = (np.arange(count, dtype=np.float64) + rng.random(count)) / max(1, count)
    rng.shuffle(strata)
    return low + strata * (high - low)


def build_lhs_feature_rows(count: int, seed: int) -> list[dict[str, float]]:
    if count <= 0:
        return []
    columns = {
        name: _latin_hypercube_values(count, seed, *FEATURE_RANGES[name], salt=(index + 1) * 7919)
        for index, name in enumerate(FEATURE_COLUMNS)
    }
    rows: list[dict[str, float]] = []
    for index in range(count):
        row = {name: float(columns[name][index]) for name in FEATURE_COLUMNS}
        rows.append(row)
    return rows


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        "\n".join(json.dumps(row, sort_keys=True, separators=(",", ":"), ensure_ascii=True) for row in rows) + "\n",
        encoding="utf-8",
    )


def _load_pandapower():
    global _PANDAPOWER_CACHE
    if _PANDAPOWER_CACHE is not None:
        return _PANDAPOWER_CACHE
    try:
        import pandapower as pp  # type: ignore
        from pandapower.create import create_poly_cost, create_sgen  # type: ignore
        from pandapower.networks import case_ieee30  # type: ignore
    except ImportError as exc:  # pragma: no cover - executed in workflow only
        raise RuntimeError(
            "pandapower is required for dispatch simulator generation. Install training/requirements.txt first.",
        ) from exc
    logging.getLogger("pandapower").setLevel(logging.ERROR)
    warnings.filterwarnings("ignore", message=r".*gen vm_pu > bus max_vm_pu.*")
    _PANDAPOWER_CACHE = (pp, create_poly_cost, create_sgen, case_ieee30)
    return _PANDAPOWER_CACHE


def _safe_float(value: Any, fallback: float = 0.0) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return fallback
    return numeric if np.isfinite(numeric) else fallback


def _ensure_costs(net, create_poly_cost) -> None:
    if len(net.poly_cost.index) > 0:
        net.poly_cost.drop(net.poly_cost.index, inplace=True)
    for gen_index in list(net.gen.index):
        create_poly_cost(net, int(gen_index), "gen", cp1_eur_per_mw=18.0 + float(gen_index) * 4.5)
    if len(net.ext_grid.index) > 0:
        create_poly_cost(net, int(net.ext_grid.index[0]), "ext_grid", cp1_eur_per_mw=135.0)
    for sgen_index in list(net.sgen.index):
        create_poly_cost(net, int(sgen_index), "sgen", cp1_eur_per_mw=2.0 + float(sgen_index) * 0.25)


def _configure_dispatch_bounds(net, load_mw: float, reserve_margin_percent: float) -> None:
    if len(net.gen.index) > 0:
        net.gen.loc[:, "controllable"] = True
        if "min_p_mw" in net.gen.columns:
            net.gen.loc[:, "min_p_mw"] = net.gen["min_p_mw"].astype(float).clip(lower=0.0)
        if "max_p_mw" in net.gen.columns:
            net.gen.loc[:, "max_p_mw"] = net.gen["max_p_mw"].astype(float).clip(lower=net.gen["p_mw"].astype(float))
    if len(net.ext_grid.index) > 0:
        net.ext_grid.loc[:, "controllable"] = True
        net.ext_grid.loc[:, "min_p_mw"] = 0.0
        net.ext_grid.loc[:, "max_p_mw"] = max(load_mw * 1.5, load_mw + reserve_margin_percent * load_mw * 0.02)


def simulate_dispatch_scenario(index: int, seed: int, feature_row: dict[str, float] | None = None) -> DispatchScenario:
    pp, create_poly_cost, create_sgen, case_ieee30 = _load_pandapower()
    feature_row = feature_row or build_feature_row(index, seed)

    base_net = case_ieee30()
    base_load_mw = max(1.0, _safe_float(base_net.load.p_mw.sum(), 1.0))
    load_scale = max(0.85, min(1.35, 0.85 + (feature_row["load_mw"] - 5600) / 6400 * 0.5))

    net = copy.deepcopy(base_net)
    if len(net.load.index) > 0:
        net.load.loc[:, "p_mw"] = net.load["p_mw"].astype(float) * load_scale
        if "q_mvar" in net.load.columns:
            net.load.loc[:, "q_mvar"] = net.load["q_mvar"].astype(float) * load_scale

    load_buses = [int(bus) for bus in net.load.bus.tolist()] or [int(net.bus.index[0])]
    wind_bus = load_buses[(index + seed) % len(load_buses)]
    solar_bus = load_buses[(index * 3 + seed) % len(load_buses)]

    reserve_factor = max(0.65, 1 - feature_row["reserve_margin_percent"] / 100.0 * 0.25)
    if "max_p_mw" in net.gen.columns and len(net.gen.index) > 0:
        net.gen.loc[:, "max_p_mw"] = net.gen["max_p_mw"].astype(float) * reserve_factor
    if len(net.ext_grid.index) > 0:
        if "max_p_mw" not in net.ext_grid.columns:
            net.ext_grid["max_p_mw"] = feature_row["load_mw"] * 1.5
        else:
            net.ext_grid.loc[:, "max_p_mw"] = net.ext_grid["max_p_mw"].astype(float).clip(lower=feature_row["load_mw"] * 1.05)

    actual_wind_mw = max(5.0, min(base_load_mw * 0.18, feature_row["wind_generation_mw"] * 0.03 + 5.0))
    actual_solar_mw = max(3.0, min(base_load_mw * 0.12, feature_row["solar_generation_mw"] * 0.025 + 3.0))
    if len(net.sgen.index) > 0:
        net.sgen.drop(net.sgen.index, inplace=True)
    create_sgen(
        net,
        bus=wind_bus,
        p_mw=actual_wind_mw,
        q_mvar=0.0,
        name="wind",
        controllable=True,
        min_p_mw=0.0,
        max_p_mw=actual_wind_mw,
        in_service=True,
    )
    create_sgen(
        net,
        bus=solar_bus,
        p_mw=actual_solar_mw,
        q_mvar=0.0,
        name="solar",
        controllable=True,
        min_p_mw=0.0,
        max_p_mw=actual_solar_mw,
        in_service=True,
    )

    _configure_dispatch_bounds(net, feature_row["load_mw"], feature_row["reserve_margin_percent"])
    _ensure_costs(net, create_poly_cost)

    simulate_status = "dcopf"
    try:
        pp.rundcopp(net, suppress_warnings=True)
        converged = bool(getattr(net, "OPF_converged", False))
        if not converged:
            raise RuntimeError("DC optimal power flow did not converge")
        target_dispatch_mw = max(
            0.0,
            _safe_float(net.res_ext_grid.p_mw.sum(), 0.0)
            + _safe_float(net.res_gen.p_mw.sum(), 0.0)
            + _safe_float(net.res_sgen.p_mw.sum(), 0.0),
        )
    except Exception:
        simulate_status = "heuristic_fallback"
        target_dispatch_mw = max(
            0.0,
            feature_row["load_mw"]
            + (20 - feature_row["temperature_c"]) * 5
            - feature_row["wind_generation_mw"] * 0.02
            - feature_row["solar_generation_mw"] * 0.018
            + (10 - feature_row["reserve_margin_percent"]) * 2.5,
        )

    gen_capacity = _safe_float(net.gen["max_p_mw"].sum(), 0.0) if "max_p_mw" in net.gen.columns else _safe_float(net.gen["p_mw"].sum(), 0.0)
    ext_capacity = _safe_float(net.ext_grid["max_p_mw"].sum(), feature_row["load_mw"] * 1.5) if len(net.ext_grid.index) > 0 else 0.0
    sgen_capacity = _safe_float(net.sgen["max_p_mw"].sum(), 0.0) if "max_p_mw" in net.sgen.columns else _safe_float(net.sgen["p_mw"].sum(), 0.0)
    available_generation_mw = max(1.0, gen_capacity + ext_capacity + sgen_capacity)
    ramp_limit_mw_per_hour = max(15.0, min(60.0, feature_row["ramp_limit_mw_per_hour"] * 0.12))
    physics_upper_bound_mw = max(
        target_dispatch_mw,
        target_dispatch_mw + feature_row["reserve_margin_percent"] * 0.35 + actual_wind_mw * 0.1 + actual_solar_mw * 0.1,
    )
    physics_lower_bound_mw = max(
        0.0,
        target_dispatch_mw
        - feature_row["reserve_margin_percent"] * 0.4
        - max(0.0, 20 - feature_row["temperature_c"]) * 0.1
        - actual_solar_mw * 0.15,
    )
    previous_dispatch_anchor_mw = max(80.0, min(350.0, feature_row["previous_dispatch_mw"]))
    previous_direction = -1.0 if previous_dispatch_anchor_mw > target_dispatch_mw else 1.0
    ramp_fraction = 0.12 + ((index + seed) % 6) * 0.04
    previous_dispatch_mw = max(
        0.0,
        target_dispatch_mw + previous_direction * ramp_limit_mw_per_hour * ramp_fraction,
    )
    capacity_violation_mw = max(0.0, target_dispatch_mw - physics_upper_bound_mw)
    reserve_violation_mw = max(0.0, physics_lower_bound_mw - target_dispatch_mw)
    ramp_violation_mw = max(0.0, abs(target_dispatch_mw - previous_dispatch_mw) - ramp_limit_mw_per_hour)
    quality_weight = 1.0 if simulate_status != "heuristic_fallback" else 0.4

    return DispatchScenario(
        index=index,
        seed=seed,
        load_mw=feature_row["load_mw"],
        temperature_c=feature_row["temperature_c"],
        wind_generation_mw=feature_row["wind_generation_mw"],
        solar_generation_mw=feature_row["solar_generation_mw"],
        reserve_margin_percent=feature_row["reserve_margin_percent"],
        ramp_limit_mw_per_hour=ramp_limit_mw_per_hour,
        previous_dispatch_mw=previous_dispatch_mw,
        target_dispatch_mw=target_dispatch_mw,
        physics_upper_bound_mw=physics_upper_bound_mw,
        physics_lower_bound_mw=physics_lower_bound_mw,
        available_generation_mw=available_generation_mw,
        capacity_violation_mw=capacity_violation_mw,
        reserve_violation_mw=reserve_violation_mw,
        ramp_violation_mw=ramp_violation_mw,
        sample_weight=quality_weight,
        simulator_status=simulate_status,
        wind_bus=wind_bus,
        solar_bus=solar_bus,
    )


def build_dispatch_rows(count: int, seed: int) -> list[dict[str, Any]]:
    feature_rows = build_lhs_feature_rows(count, seed)
    if count <= 0:
        return []

    workers = max(1, min(os.cpu_count() or 1, 8))
    if workers == 1 or count < 64:
        return [simulate_dispatch_scenario(index, seed, feature_rows[index]).to_row() for index in range(count)]

    payloads = [(index, seed, feature_rows[index]) for index in range(count)]
    try:
        with ProcessPoolExecutor(max_workers=workers) as executor:
            return list(
                executor.map(
                    _simulate_dispatch_row,
                    payloads,
                    chunksize=max(1, count // (workers * 8)),
                ),
            )
    except (PermissionError, RuntimeError, OSError):
        with ThreadPoolExecutor(max_workers=min(workers, 4)) as executor:
            return list(executor.map(_simulate_dispatch_row, payloads))


def _simulate_dispatch_row(args: tuple[int, int, dict[str, float]]) -> dict[str, Any]:
    index, seed, feature_row = args
    return simulate_dispatch_scenario(index, seed, feature_row).to_row()
