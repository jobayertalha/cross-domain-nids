import numpy as np

from .model_loader import ModelLoader
from .tdnr import TDNR


class NIDSEngine:

    def __init__(self, dataset: str):
        self.dataset = dataset

        self.model = ModelLoader(
            dataset
        )

        self.tdnr = TDNR(
            dataset
        )

    def analyze(self, X):
        X = np.asarray(
            X,
            dtype=np.float32,
        )

        if X.ndim != 3:
            raise ValueError(
                "Expected input shape "
                "(N, 10, 4)"
            )

        if X.shape[1:] != (10, 4):
            raise ValueError(
                f"Expected (N,10,4), "
                f"got {X.shape}"
            )

        logits, features = (
            self.model.predict_logits(X)
        )

        # Stable softmax
        logits = (
            logits
            - np.max(
                logits,
                axis=1,
                keepdims=True,
            )
        )

        exp_logits = np.exp(logits)

        probabilities = (
            exp_logits
            / exp_logits.sum(
                axis=1,
                keepdims=True,
            )
        )

        return self.tdnr.refine(
            probabilities,
            features,
        )