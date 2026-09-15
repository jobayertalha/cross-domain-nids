from pathlib import Path
import sys

import torch


# ============================================================
# PROJECT PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[3]

ORIGINAL_NIDS = PROJECT_ROOT / "original-nids"

# Make the original research package importable:
# original-nids/src/...
if str(ORIGINAL_NIDS) not in sys.path:
    sys.path.insert(0, str(ORIGINAL_NIDS))


from src.networks.network import LLL_Net
from src.networks.lopez17cnn import Lopez17CNN


# ============================================================
# DATASET CONFIGURATION
# ============================================================

DATASET_CONFIG = {
    "ton_iot": {
        "name": "TON-IoT",
        "deployment_dir": (
            PROJECT_ROOT
            / "deployment"
            / "ton_iot"
        ),
        "num_classes": 12,
    },

    "edge_iiot": {
        "name": "Edge-IIoTset",
        "deployment_dir": (
            PROJECT_ROOT
            / "deployment"
            / "edge_iiot"
        ),
        "num_classes": 14,
    },
}


# ============================================================
# MODEL LOADER
# ============================================================

class ModelLoader:

    def __init__(self, dataset: str):

        if dataset not in DATASET_CONFIG:
            raise ValueError(
                f"Unsupported dataset: {dataset}"
            )

        self.dataset = dataset
        self.config = DATASET_CONFIG[dataset]

        self.deployment_dir = (
            self.config["deployment_dir"]
        )

        # Deployment inference is CPU-based
        self.device = torch.device("cpu")

        self.model = self._load_model()

    # --------------------------------------------------------
    # Find deployment checkpoint
    # --------------------------------------------------------

    def _find_checkpoint(self) -> Path:

        model_dir = (
            self.deployment_dir
            / "models"
        )

        checkpoints = sorted(
            model_dir.glob("task1-*.ckpt")
        )

        if not checkpoints:
            raise FileNotFoundError(
                f"No task1 checkpoint found in "
                f"{model_dir}"
            )

        return checkpoints[0]

    # --------------------------------------------------------
    # Load Lopez17CNN + incremental heads
    # --------------------------------------------------------

    def _load_model(self):

        num_classes = (
            self.config["num_classes"]
        )

        # ----------------------------------------------------
        # Base network
        # ----------------------------------------------------

        network = Lopez17CNN(
            num_pkts=10,
            num_fields=4,
        )

        # ----------------------------------------------------
        # Incremental-learning wrapper
        # ----------------------------------------------------

        model = LLL_Net(network)

        # ----------------------------------------------------
        # Task 0 = first 10 classes
        # ----------------------------------------------------

        model.add_head(
            task=0,
            num_outputs=10,
        )

        # ----------------------------------------------------
        # Task 1 = remaining classes
        #
        # TON-IoT:      12 - 10 = 2
        # Edge-IIoTset: 14 - 10 = 4
        # ----------------------------------------------------

        model.add_head(
            task=1,
            num_outputs=num_classes - 10,
        )

        # ----------------------------------------------------
        # Load deployment checkpoint
        #
        # The checkpoint itself IS the state_dict.
        # It does NOT contain a "state_dict" key.
        # ----------------------------------------------------

        checkpoint_path = self._find_checkpoint()

        state_dict = torch.load(
            checkpoint_path,
            map_location=self.device,
        )

        model.load_state_dict(
            state_dict,
            strict=True,
        )

        # ----------------------------------------------------
        # Evaluation mode
        # ----------------------------------------------------

        model.to(self.device)
        model.eval()

        # ----------------------------------------------------
        # Logging
        # ----------------------------------------------------

        print(
            f"[NIDS] Loaded "
            f"{self.config['name']} checkpoint: "
            f"{checkpoint_path.name}"
        )

        print(
            "[NIDS] Architecture: Lopez17CNN"
        )

        print(
            f"[NIDS] Classes: {num_classes}"
        )

        print(
            "[NIDS] Incremental heads: "
            "10 + "
            f"{num_classes - 10}"
        )

        return model

    # --------------------------------------------------------
    # Inference
    # --------------------------------------------------------

    def predict_logits(self, x):

        # ----------------------------------------------------
        # Expected input:
        #
        # x = (N, 10, 4)
        #
        # Lopez17CNN expects:
        #
        # (N, 1, 10, 4)
        # ----------------------------------------------------

        x = torch.from_numpy(
            x
        ).float()

        x = x.unsqueeze(1)

        x = x.to(
            self.device
        )

        # ----------------------------------------------------
        # Forward pass
        # ----------------------------------------------------

        with torch.no_grad():

            outputs, features = self.model(
                x,
                return_features=True,
            )

        # ----------------------------------------------------
        # Combine incremental heads
        #
        # Task 0: 10 classes
        # Task 1: remaining classes
        # ----------------------------------------------------

        logits = torch.cat(
            outputs,
            dim=1,
        )

        return (
            logits.cpu().numpy(),
            features.cpu().numpy(),
        )