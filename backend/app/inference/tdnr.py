from pathlib import Path
import json

import numpy as np


PROJECT_ROOT = Path(__file__).resolve().parents[3]


class TDNR:
    def __init__(self, dataset: str):
        self.dataset = dataset

        deployment_dir = (
            PROJECT_ROOT
            / "deployment"
            / dataset
            / "tdnr"
        )

        self.reference_features = np.load(
            deployment_dir
            / f"{dataset}_reference_features.npy"
        ).astype(np.float32)

        self.reference_labels = np.load(
            deployment_dir
            / f"{dataset}_reference_labels.npy"
        ).astype(np.int64)

        self.mean = np.load(
            deployment_dir
            / f"{dataset}_normalization_mean.npy"
        ).astype(np.float32)

        self.std = np.load(
            deployment_dir
            / f"{dataset}_normalization_std.npy"
        ).astype(np.float32)

        with open(
            deployment_dir / f"{dataset}_tdnr_policy.json",
            "r",
            encoding="utf-8",
        ) as f:
            self.policy = json.load(f)

        self.confidence_threshold = float(
            self.policy["confidence_threshold"]
        )

        self.k = int(
            self.policy["k"]
        )

        self.agreement_threshold = float(
            self.policy["agreement_threshold"]
        )

        self.strength = float(
            self.policy["strength"]
        )

        print(
            f"[NIDS] Loaded TDNR: {dataset}"
        )

        print(
            f"[NIDS] k={self.k}, "
            f"confidence={self.confidence_threshold}, "
            f"agreement={self.agreement_threshold}, "
            f"strength={self.strength}"
        )

    def _normalize_features(self, features):
        std = np.where(
            self.std == 0,
            1.0,
            self.std,
        )

        return (
            features - self.mean
        ) / std

    def _cosine_similarity(self, query, reference):
        query_norm = np.linalg.norm(
            query,
            axis=1,
            keepdims=True,
        )

        reference_norm = np.linalg.norm(
            reference,
            axis=1,
            keepdims=True,
        )

        query_norm = np.maximum(
            query_norm,
            1e-12,
        )

        reference_norm = np.maximum(
            reference_norm,
            1e-12,
        )

        query_normalized = (
            query / query_norm
        )

        reference_normalized = (
            reference / reference_norm
        )

        return (
            query_normalized
            @ reference_normalized.T
        )

    def refine(self, probabilities, features):
        features = np.asarray(
            features,
            dtype=np.float32,
        )

        normalized_features = (
            self._normalize_features(features)
        )

        similarities = self._cosine_similarity(
            normalized_features,
            self.reference_features,
        )

        results = []

        for i, probs in enumerate(probabilities):

            base_prediction = int(
                np.argmax(probs)
            )

            confidence = float(
                np.max(probs)
            )

            k = min(
                self.k,
                len(self.reference_labels),
            )

            top_indices = np.argpartition(
                similarities[i],
                -k,
            )[-k:]

            neighbor_labels = (
                self.reference_labels[top_indices]
            )

            counts = np.bincount(
                neighbor_labels
            )

            local_prediction = int(
                np.argmax(counts)
            )

            local_agreement = float(
                np.max(counts) / k
            )

            apply_refinement = (
                confidence
                < self.confidence_threshold
                and local_agreement
                >= self.agreement_threshold
                and local_prediction
                != base_prediction
            )

            final_probabilities = (
                probs.copy()
            )

            if apply_refinement:
                final_probabilities *= (
                    1.0 - self.strength
                )

                final_probabilities[
                    local_prediction
                ] += self.strength

                final_probabilities /= (
                    final_probabilities.sum()
                )

            final_prediction = int(
                np.argmax(
                    final_probabilities
                )
            )

            results.append(
                {
                    "probabilities":
                        final_probabilities.tolist(),

                    "base_prediction":
                        base_prediction,

                    "final_prediction":
                        final_prediction,

                    "confidence":
                        confidence,

                    "local_prediction":
                        local_prediction,

                    "local_agreement":
                        local_agreement,

                    "refinement_applied":
                        bool(apply_refinement),
                }
            )

        return results