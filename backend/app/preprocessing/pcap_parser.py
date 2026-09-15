from pathlib import Path

import numpy as np
from scapy.all import rdpcap, IP, TCP, UDP


MIN_MAX = {
    "PL": (-1.0, 1500.0),
    "IAT": (-1.0, 60000.0),
    "DIR": (0.0, 1.0),
    "WIN": (-1.0, 65535.0),
}


def normalize(values, field):
    values = np.asarray(values, dtype=np.float32)

    min_value, max_value = MIN_MAX[field]

    result = (values - min_value) / (max_value - min_value)

    return np.clip(result, 0.0, 1.0)


def packet_to_features(packet, previous_time, direction):
    timestamp = float(packet.time)

    if previous_time is None:
        iat = 0.0
    else:
        iat = timestamp - previous_time

    if TCP in packet:
        win = float(packet[TCP].window)
    else:
        win = 0.0

    return {
        "PL": float(len(packet)),
        "IAT": float(iat),
        "DIR": float(direction),
        "WIN": win,
        "timestamp": timestamp,
    }


def extract_biflows(pcap_path):
    """
    Build bidirectional flows from a PCAP.

    Flow key:
        (IP pair, protocol)

    Direction is represented relative to the first
    observed source IP in each flow.
    """

    packets = rdpcap(str(Path(pcap_path)))

    flows = {}

    for packet in packets:

        if IP not in packet:
            continue

        ip = packet[IP]

        if TCP in packet:
            protocol = "TCP"
        elif UDP in packet:
            protocol = "UDP"
        else:
            continue

        src = ip.src
        dst = ip.dst

        # Bidirectional canonical key
        endpoints = tuple(sorted([src, dst]))
        key = (endpoints[0], endpoints[1], protocol)

        if key not in flows:
            flows[key] = {
                "first_src": src,
                "packets": [],
                "previous_time": None,
            }

        flow = flows[key]

        direction = 0.0 if src == flow["first_src"] else 1.0

        feature = packet_to_features(
            packet,
            flow["previous_time"],
            direction,
        )

        flow["packets"].append(feature)
        flow["previous_time"] = feature["timestamp"]

    return flows


def biflows_to_model_input(flows, num_packets=10):
    """
    Convert extracted biflows into model input.

    Output:
        X      -> (N, 10, 4)
        flows  -> metadata corresponding to each sample
    """

    samples = []
    metadata = []

    for key, flow in flows.items():

        packets = flow["packets"]

        if len(packets) < num_packets:
            continue

        packets = packets[:num_packets]

        fields = {}

        for field in ["PL", "IAT", "DIR", "WIN"]:
            values = [p[field] for p in packets]
            fields[field] = normalize(values, field)

        sample = np.array(
            [
                fields["PL"],
                fields["IAT"],
                fields["DIR"],
                fields["WIN"],
            ],
            dtype=np.float32,
        ).T

        samples.append(sample)

        metadata.append({
            "src_ip": flow["first_src"],
            "flow_key": str(key),
            "packet_count": len(flow["packets"]),
        })

    if not samples:
        return (
            np.empty((0, num_packets, 4), dtype=np.float32),
            [],
        )

    return np.stack(samples), metadata
