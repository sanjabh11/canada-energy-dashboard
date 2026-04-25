from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

import networkx as nx
import numpy as np
import pandas as pd
import pandapower.networks as pn
from pvlib.location import Location
from scipy.stats import qmc

from training.common.dataset_manifest import build_dataset_manifest
from training.common.weight_export import (
    DEFAULT_SEED,
    PLACEHOLDER_TRAINED_AT,
    build_manifest,
    compute_artifact_sha,
    stable_json_dumps,
    write_json,
)

MODEL_KEY = "pv-gnn-v2"
MODEL_VERSION = "pv-gnn-v2"
SIMULATOR_NAME = "pvlib"
SIMULATOR_VERSION = "pvlib-mv_oberrhein-gnn-v1"
TOPOLOGY = "mv_oberrhein"
NODE_COUNT = 5
NODE_FEATURE_COLUMNS = [
    "output_delta_ratio",
    "voltage_penalty",
    "thermal_penalty",
    "irradiance_deficit",
    "offline_flag",
]
FAULT_CLASSES = [
    "healthy_cluster",
    "inverter_trip",
    "soiling_cluster",
    "hot_spot_derating",
    "localized_short_circuit",
]
THRESHOLD_ORDER = [
    "inverter_trip",
    "soiling_cluster",
    "hot_spot_derating",
    "localized_short_circuit",
]


def clamp(value: float, min_value: float = 0.0, max_value: float = 1.0) -> float:
    if not math.isfinite(value):
        return min_value
    return max(min_value, min(max_value, value))


def round_value(value: float, decimals: int = 6) -> float:
    if not math.isfinite(value):
        return 0.0
    factor = 10 ** decimals
    return round(float(value) * factor) / factor


def bucket_risk_score(score: float) -> int:
    return int(round(clamp(score) * 1000))


def mean(values: Iterable[float]) -> float:
    values = list(values)
    return float(sum(values) / len(values)) if values else 0.0


def load_json(path: str | Path) -> Any:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def stable_json_line(payload: Any) -> str:
    return stable_json_dumps(payload)


def write_jsonl(path: str | Path, rows: list[dict[str, object]]) -> None:
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text("\n".join(stable_json_line(row) for row in rows) + "\n", encoding="utf-8")


def parse_bus_geo(raw: Any) -> tuple[float, float]:
    if isinstance(raw, str) and raw.strip():
        try:
            geo = json.loads(raw)
            coordinates = geo.get("coordinates", [])
            if len(coordinates) >= 2:
                return float(coordinates[0]), float(coordinates[1])
        except Exception:
            pass
    return (0.0, 0.0)


@dataclass(frozen=True)
class NetworkContext:
    buses: list[int]
    bus_coordinates: dict[int, tuple[float, float]]
    capacities_mw: dict[int, float]
    root_bus: int
    bus_depths: dict[int, float]
    edges: list[dict[str, object]]
    center_latitude: float
    center_longitude: float


def build_network_context() -> NetworkContext:
    net = pn.mv_oberrhein()
    candidate_buses = sorted({int(bus) for bus in net.sgen.bus.tolist()} or {int(bus) for bus in net.bus.index.tolist()})
    bus_coordinates: dict[int, tuple[float, float]] = {}
    for row in net.bus.itertuples():
      # pandapower stores geodata as GeoJSON strings in this case.
        longitude, latitude = parse_bus_geo(getattr(row, "geo", None))
        bus_coordinates[int(row.Index)] = (longitude, latitude)

    candidate_buses.sort(key=lambda bus: (*bus_coordinates.get(bus, (0.0, 0.0)), bus))
    if len(candidate_buses) < NODE_COUNT:
        candidate_buses = sorted({int(bus) for bus in net.bus.index.tolist()})

    sampled_positions = np.linspace(0, max(0, len(candidate_buses) - 1), NODE_COUNT)
    selected_buses: list[int] = []
    for position in sampled_positions:
        bus = candidate_buses[int(round(position))]
        if bus not in selected_buses:
            selected_buses.append(bus)
    for bus in candidate_buses:
        if len(selected_buses) >= NODE_COUNT:
            break
        if bus not in selected_buses:
            selected_buses.append(bus)
    selected_buses = selected_buses[:NODE_COUNT]

    capacities_mw: dict[int, float] = {}
    for bus in selected_buses:
        bus_rows = net.sgen.loc[net.sgen.bus == bus]
        capacity = float(bus_rows.p_mw.sum()) if not bus_rows.empty else 0.0
        if capacity <= 0:
            capacity = 1.2 + 0.15 * (selected_buses.index(bus) + 1)
        capacities_mw[bus] = round_value(capacity, 4)

    root_bus = int(net.ext_grid.bus.iloc[0]) if not net.ext_grid.empty else selected_buses[0]
    graph = nx.Graph()
    for line in net.line.itertuples():
        graph.add_edge(
            int(line.from_bus),
            int(line.to_bus),
            weight=max(0.1, float(getattr(line, "length_km", 1.0) or 1.0)),
        )

    bus_depths: dict[int, float] = {}
    for bus in selected_buses:
        try:
            bus_depths[bus] = float(nx.shortest_path_length(graph, root_bus, bus, weight="weight"))
        except Exception:
            bus_depths[bus] = float(abs(bus - root_bus) or 1.0)

    max_depth = max(bus_depths.values()) or 1.0
    normalized_depths = {bus: round_value(depth / max_depth, 6) for bus, depth in bus_depths.items()}

    edges: list[dict[str, object]] = []
    for index in range(len(selected_buses) - 1):
        left = selected_buses[index]
        right = selected_buses[index + 1]
        try:
            path_length = float(nx.shortest_path_length(graph, left, right, weight="weight"))
        except Exception:
            path_length = float(abs(right - left) or 1.0)
        edges.append(
            {
                "from": f"pv-{index + 1}",
                "to": f"pv-{index + 2}",
                "weight": round_value(1 / (1 + path_length / 8), 4),
            },
        )

    coordinates = [bus_coordinates.get(bus, (0.0, 0.0)) for bus in selected_buses]
    longitudes = [coords[0] for coords in coordinates if coords != (0.0, 0.0)]
    latitudes = [coords[1] for coords in coordinates if coords != (0.0, 0.0)]
    center_longitude = float(mean(longitudes) if longitudes else 7.78)
    center_latitude = float(mean(latitudes) if latitudes else 48.41)

    return NetworkContext(
        buses=selected_buses,
        bus_coordinates=bus_coordinates,
        capacities_mw=capacities_mw,
        root_bus=root_bus,
        bus_depths=normalized_depths,
        edges=edges,
        center_latitude=center_latitude,
        center_longitude=center_longitude,
    )


def build_dataset_rows(
    *,
    count: int,
    seed: int = DEFAULT_SEED,
    topology: str = TOPOLOGY,
) -> tuple[list[dict[str, object]], dict[str, object]]:
    context = build_network_context()
    class_counts = [count // len(FAULT_CLASSES)] * len(FAULT_CLASSES)
    for index in range(count % len(FAULT_CLASSES)):
        class_counts[index] += 1

    rows: list[dict[str, object]] = []
    start_time = pd.Timestamp("2026-01-01T00:00:00Z")
    base_location = Location(context.center_latitude, context.center_longitude, tz="UTC")

    for class_index, fault_class in enumerate(FAULT_CLASSES):
        class_count = class_counts[class_index]
        sampler = qmc.LatinHypercube(d=5, seed=seed + 97 * (class_index + 1))
        lhs = sampler.random(class_count) if class_count > 0 else np.empty((0, 5))
        class_bias = {
            "healthy_cluster": 0.03,
            "inverter_trip": 0.20,
            "soiling_cluster": 0.32,
            "hot_spot_derating": 0.42,
            "localized_short_circuit": 0.56,
        }[fault_class]

        timestamps = pd.DatetimeIndex([
            start_time + pd.Timedelta(seconds=float(sample[0]) * 365 * 24 * 3600)
            for sample in lhs
        ])
        clearsky = base_location.get_clearsky(timestamps) if len(timestamps) else pd.DataFrame(columns=["ghi"])
        solar_position = base_location.get_solarposition(timestamps) if len(timestamps) else pd.DataFrame(columns=["apparent_zenith"])

        for row_index, sample in enumerate(lhs):
            timestamp = timestamps[row_index]
            ghi = float(clearsky.iloc[row_index]["ghi"]) if not clearsky.empty else 800.0
            zenith = float(solar_position.iloc[row_index]["apparent_zenith"]) if not solar_position.empty else 45.0
            solar_factor = clamp(max(0.0, math.cos(math.radians(zenith))) * (ghi / 1000))
            cloudiness = float(sample[1])
            weather_noise = float(sample[2])
            ambient_temp_c = round_value(4 + 16 * math.sin(2 * math.pi * float(sample[3]) - math.pi / 3) + (weather_noise - 0.5) * 8, 3)
            cluster_center = int(round(float(sample[4]) * (NODE_COUNT - 1)))
            cluster_nodes = [cluster_center]
            if fault_class in {"soiling_cluster", "hot_spot_derating", "localized_short_circuit"}:
                cluster_nodes.append(min(NODE_COUNT - 1, cluster_center + 1))
            if fault_class == "localized_short_circuit":
                cluster_nodes = [cluster_center, max(0, cluster_center - 1)]
            cluster_nodes = sorted({node for node in cluster_nodes if 0 <= node < NODE_COUNT})

            nodes: list[dict[str, object]] = []
            fault_node_index = cluster_nodes[0] if cluster_nodes else cluster_center

            for node_index, bus in enumerate(context.buses):
                capacity = context.capacities_mw[bus]
                base_expected = capacity * (0.35 + 0.6 * solar_factor)
                depth_penalty = context.bus_depths.get(bus, 0.0)
                irradiance = ghi * (0.88 + 0.08 * (1 - cloudiness))
                observed_multiplier = 0.95 + (0.03 * math.sin((row_index + node_index + seed) * 0.9))
                offline = False
                temp_boost = 0.0
                voltage_drop = 0.0

                if fault_class == "inverter_trip" and node_index == fault_node_index:
                    observed_multiplier = 0.02 + 0.04 * float(sample[2])
                    offline = True
                    voltage_drop += 0.08 + 0.04 * float(sample[1])
                elif fault_class == "soiling_cluster" and node_index in cluster_nodes:
                    observed_multiplier = 0.48 + 0.18 * float(sample[2])
                    irradiance *= 0.72 + 0.12 * float(sample[1])
                    voltage_drop += 0.03 + 0.02 * float(sample[4])
                elif fault_class == "hot_spot_derating" and node_index in cluster_nodes:
                    observed_multiplier = 0.58 + 0.15 * float(sample[2])
                    temp_boost += 18 + 12 * float(sample[1])
                    voltage_drop += 0.02 + 0.02 * float(sample[4])
                elif fault_class == "localized_short_circuit" and node_index in cluster_nodes:
                    observed_multiplier = 0.18 + 0.12 * float(sample[2])
                    voltage_drop += 0.14 + 0.08 * float(sample[1])
                else:
                    observed_multiplier *= 0.98 + 0.03 * float(sample[1])

                expected_output_mw = round_value(max(0.01, base_expected), 6)
                observed_output_mw = round_value(max(0.0, expected_output_mw * observed_multiplier), 6)
                voltage_pu = clamp(1.02 - depth_penalty * 0.08 - (1 - observed_multiplier) * 0.12 - voltage_drop, 0.75, 1.05)
                voltage_v = round_value(voltage_pu * 600, 6)
                inverter_temp_c = round_value(
                    ambient_temp_c + 6 + 10 * (irradiance / 1000) + temp_boost + (0.8 * float(sample[0])),
                    6,
                )
                node = {
                    "id": f"pv-{node_index + 1}",
                    "bus": int(bus),
                    "expected_output_mw": expected_output_mw,
                    "observed_output_mw": observed_output_mw,
                    "voltage_v": voltage_v,
                    "inverter_temp_c": inverter_temp_c,
                    "irradiance": round_value(irradiance, 6),
                    "offline": offline,
                    "fault_role": "primary" if node_index == fault_node_index else ("cluster" if node_index in cluster_nodes else "support"),
                    "depth": round_value(depth_penalty, 6),
                }
                nodes.append(node)

            base_severities = []
            for node in nodes:
                expected = max(0.001, float(node["expected_output_mw"]))
                observed = max(0.0, float(node["observed_output_mw"]))
                output_delta = clamp(abs(expected - observed) / expected)
                voltage_penalty = clamp(abs(float(node["voltage_v"]) - 600) / 120)
                thermal_penalty = clamp(max(0.0, (float(node["inverter_temp_c"]) - 45) / 40))
                irradiance_deficit = clamp(1 - min(1.0, float(node["irradiance"]) / 1000))
                offline_penalty = 1.0 if node["offline"] else 0.0
                severity = clamp(
                    class_bias
                    + 0.46 * output_delta
                    + 0.18 * voltage_penalty
                    + 0.16 * thermal_penalty
                    + 0.10 * irradiance_deficit
                    + 0.10 * offline_penalty,
                )
                base_severities.append(severity)

            final_severities: list[float] = []
            for node_index, node in enumerate(nodes):
                neighbor_scores = []
                if node_index > 0:
                    neighbor_scores.append(base_severities[node_index - 1])
                if node_index + 1 < len(nodes):
                    neighbor_scores.append(base_severities[node_index + 1])
                neighbor_mean = mean(neighbor_scores)
                severity = clamp(base_severities[node_index] * 0.82 + neighbor_mean * 0.18)
                final_severities.append(severity)
                node["target_severity"] = round_value(severity, 6)
                node["feature_vector"] = build_node_feature_vector(node)

            scenario_score = max(final_severities) if final_severities else 0.0
            rows.append(
                {
                    "index": len(rows),
                    "seed": seed,
                    "fault_class": fault_class,
                    "fault_node_id": str(nodes[fault_node_index]["id"]),
                    "fault_node_index": fault_node_index,
                    "scenario_score": round_value(scenario_score, 6),
                    "timestamp": timestamp.isoformat().replace("+00:00", "Z"),
                    "network_source": TOPOLOGY,
                    "simulator_status": "synthetic-pvlib-pandapower",
                    "nodes": nodes,
                    "edges": context.edges,
                    "class_bias": class_bias,
                    "ambient_temp_c": ambient_temp_c,
                    "ghi_wm2": round_value(ghi, 6),
                    "solar_factor": round_value(solar_factor, 6),
                },
            )

    manifest = build_dataset_manifest(
        model_key=MODEL_KEY,
        scenario_count=count,
        simulator_name=SIMULATOR_NAME,
        simulator_version=SIMULATOR_VERSION,
        topology=topology,
        seed=seed,
        prepared_at=PLACEHOLDER_TRAINED_AT,
        source_description="pvlib + pandapower synthetic PV fault scenarios on mv_oberrhein topology",
        sampling_strategy="latin_hypercube",
    )
    return rows, manifest


def build_node_feature_vector(node: dict[str, object]) -> list[float]:
    expected = max(0.001, float(node["expected_output_mw"]))
    observed = max(0.0, float(node["observed_output_mw"]))
    voltage_v = float(node["voltage_v"])
    inverter_temp_c = float(node["inverter_temp_c"])
    irradiance = float(node.get("irradiance", 1000.0))
    offline = bool(node.get("offline", False))
    return [
        round_value(clamp(abs(expected - observed) / expected), 6),
        round_value(clamp(abs(voltage_v - 600) / 600), 6),
        round_value(clamp(max(0.0, (inverter_temp_c - 45) / 55)), 6),
        round_value(clamp(1 - min(1.0, irradiance / 1000)), 6),
        round_value(1.0 if offline else 0.0, 6),
    ]


def dense_forward(layer: dict[str, Any], input_vector: list[float], decimals: int = 1) -> list[float]:
    weights = layer["weights"]
    bias = layer["bias"]
    activation = str(layer["activation"])
    output: list[float] = []
    for row_index, row in enumerate(weights):
        total = float(np.float32(bias[row_index] if row_index < len(bias) else 0.0))
        for column_index, weight in enumerate(row):
            weighted_input = float(
                np.float32(float(weight))
                * np.float32(float(input_vector[column_index] if column_index < len(input_vector) else 0.0))
            )
            total = float(np.float32(total) + np.float32(weighted_input))
        if activation == "relu":
            value = max(0.0, total)
        elif activation == "sigmoid":
            value = 1.0 / (1.0 + math.exp(-total))
        else:
            value = total
        output.append(round_value(value, decimals))
    return output


def classify_score(score: float, thresholds: dict[str, float]) -> str:
    score = round_value(score, 2)
    if score >= thresholds.get("localized_short_circuit", 0.76):
        return "localized_short_circuit"
    if score >= thresholds.get("hot_spot_derating", 0.6):
        return "hot_spot_derating"
    if score >= thresholds.get("soiling_cluster", 0.48):
        return "soiling_cluster"
    if score >= thresholds.get("inverter_trip", 0.35):
        return "inverter_trip"
    return "healthy_cluster"


def forward_gnn(weights: dict[str, Any], nodes: list[dict[str, Any]], edges: list[dict[str, Any]]) -> dict[str, Any]:
    node_states: dict[str, float] = {}
    for node in nodes:
        projected = dense_forward(weights["node_projection"], [float(value) for value in node["features"]], 4)
        base_score = mean(projected) if projected else 0.0
        node_states[node["id"]] = clamp(base_score)

    adjacency: dict[str, list[dict[str, float]]] = {}
    for edge in edges:
        weight = float(edge.get("weight") or weights["edge_weights"][0] or 1.0)
        adjacency.setdefault(str(edge["from"]), []).append({"id": str(edge["to"]), "weight": weight})
        adjacency.setdefault(str(edge["to"]), []).append({"id": str(edge["from"]), "weight": weight})

    iterations = max(1, int(weights.get("iterations", 4)))
    for iteration in range(iterations):
        next_states: dict[str, float] = {}
        for node in nodes:
            neighbors = adjacency.get(node["id"], [])
            if neighbors:
                weighted_neighbor = sum(node_states.get(entry["id"], 0.0) * entry["weight"] for entry in neighbors)
                total_weight = sum(entry["weight"] for entry in neighbors) or 1.0
                neighbor_score = weighted_neighbor / total_weight
            else:
                neighbor_score = 0.0
            current = node_states.get(node["id"], 0.0)
            blend = float(weights["edge_weights"][iteration % max(1, len(weights["edge_weights"]))] or 1.0)
            next_states[node["id"]] = clamp(current * (1 - blend * 0.25) + neighbor_score * blend * 0.25)
        node_states.update(next_states)

    node_scores = {node_id: round_value(score, 6) for node_id, score in node_states.items()}
    top_suspects = sorted(
        [
            {
                "nodeId": node_id,
                "riskScore": round_value(score, 6),
                "reason": (
                    "localized_short_circuit" if score >= weights["class_thresholds"].get("localized_short_circuit", 0.75)
                    else "hot_spot_derating" if score >= weights["class_thresholds"].get("hot_spot_derating", 0.55)
                    else "soiling_cluster" if score >= weights["class_thresholds"].get("soiling_cluster", 0.4)
                    else "inverter_trip" if score >= weights["class_thresholds"].get("inverter_trip", 0.25)
                    else "background_signal"
                ),
            }
            for node_id, score in node_states.items()
        ],
        key=lambda entry: (-bucket_risk_score(float(entry["riskScore"])), entry["nodeId"]),
    )[:5]

    top_edges = sorted(
        [
            {
                "fromNodeId": str(edge["from"]),
                "toNodeId": str(edge["to"]),
                "riskScore": round_value(((node_states.get(str(edge["from"]), 0.0) + node_states.get(str(edge["to"]), 0.0)) / 2) * float(edge.get("weight") or weights["edge_weights"][0] or 1.0), 6),
            }
            for edge in edges
        ],
        key=lambda entry: (-bucket_risk_score(float(entry["riskScore"])), entry["fromNodeId"], entry["toNodeId"]),
    )[:5]

    top_score = top_suspects[0]["riskScore"] if top_suspects else 0.0
    class_probabilities = {
        label: round_value(clamp(top_score / max(0.001, float(threshold))), 6)
        for label, threshold in weights["class_thresholds"].items()
    }

    return {
        "faultClass": classify_score(top_score, weights["class_thresholds"]),
        "confidenceScore": round_value(clamp(top_score), 4),
        "nodeScores": node_scores,
        "topSuspects": top_suspects,
        "topEdges": top_edges,
        "classProbabilities": class_probabilities,
    }


def predict_scenario(weights: dict[str, Any], scenario: dict[str, Any]) -> dict[str, Any]:
    nodes = [
        {
            "id": str(node["id"]),
            "features": build_node_feature_vector(node),
        }
        for node in scenario["nodes"]
    ]
    edges = [
        {
            "from": str(edge["from"]),
            "to": str(edge["to"]),
            "weight": float(edge.get("weight", 1.0)),
        }
        for edge in scenario["edges"]
    ]
    return forward_gnn(weights, nodes, edges)


def split_indices(size: int, seed: int, train_ratio: float = 0.8, val_ratio: float = 0.1) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)
    indices = np.arange(size)
    rng.shuffle(indices)
    train_end = int(size * train_ratio)
    val_end = train_end + int(size * val_ratio)
    return indices[:train_end], indices[train_end:val_end], indices[val_end:]


def scenario_classes(rows: list[dict[str, Any]]) -> list[str]:
    return [str(row["fault_class"]) for row in rows]


def top_margin_from_prediction(prediction: dict[str, Any]) -> float:
    scores = sorted((float(item["riskScore"]) for item in prediction["topSuspects"]), reverse=True)
    if len(scores) < 2:
        return 1.0
    return round_value(scores[0] - scores[1], 6)


def confusion_counts(expected: list[str], predicted: list[str]) -> dict[str, dict[str, int]]:
    labels = list(FAULT_CLASSES)
    counts = {label: {other: 0 for other in labels} for label in labels}
    for exp, pred in zip(expected, predicted, strict=False):
        counts[exp][pred] += 1
    return counts


def f1_from_counts(counts: dict[str, dict[str, int]]) -> float:
    scores = []
    labels = list(FAULT_CLASSES)
    for label in labels:
        tp = counts[label][label]
        fp = sum(counts[other][label] for other in labels if other != label)
        fn = sum(counts[label][other] for other in labels if other != label)
        precision = tp / (tp + fp) if (tp + fp) else 0.0
        recall = tp / (tp + fn) if (tp + fn) else 0.0
        scores.append((2 * precision * recall / (precision + recall)) if (precision + recall) else 0.0)
    return float(sum(scores) / len(scores)) if scores else 0.0


def top3_localization_accuracy(results: list[dict[str, Any]]) -> float:
    if not results:
        return 0.0
    correct = 0
    for result in results:
        target = str(result.get("fault_node_id"))
        top_nodes = [entry["nodeId"] for entry in result.get("topSuspects", [])[:3]]
        if target in top_nodes:
            correct += 1
    return correct / len(results)
