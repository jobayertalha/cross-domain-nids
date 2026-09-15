from pathlib import Path
import os
import shutil
import sys
import tempfile

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware


# ============================================================
# PATH SETUP
# ============================================================

BACKEND_DIR = Path(__file__).resolve().parents[1]

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


from app.inference.engine import NIDSEngine
from app.preprocessing.pcap_parser import (
    extract_biflows,
    biflows_to_model_input,
)


# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="Cross-Domain NIDS",
    version="1.0.0",
    description=(
        "Cross-domain Network Intrusion Detection System "
        "using Lopez17CNN, BiC, and TDNR."
    ),
)


# ============================================================
# CORS
# ============================================================
#
# Development:
#   http://localhost:5173
#   http://127.0.0.1:5173
#
# Production:
# Set FRONTEND_ORIGINS to the real frontend URL(s).
#
# Example:
# FRONTEND_ORIGINS=https://nids.example.com
#
# Multiple origins:
# FRONTEND_ORIGINS=https://nids.example.com,https://staging.example.com
#
# ============================================================

FRONTEND_ORIGINS = os.getenv(
    "FRONTEND_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
)

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in FRONTEND_ORIGINS.split(",")
    if origin.strip()
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# ENGINE CACHE
# ============================================================

engines = {}


def get_engine(dataset: str):

    if dataset not in (
        "ton_iot",
        "edge_iiot",
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported dataset. "
                "Use 'ton_iot' or 'edge_iiot'."
            ),
        )

    if dataset not in engines:

        print(
            f"[NIDS] Loading engine: {dataset}",
            flush=True,
        )

        engines[dataset] = NIDSEngine(
            dataset
        )

        print(
            f"[NIDS] Engine ready: {dataset}",
            flush=True,
        )

    return engines[dataset]


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "service": "Cross-Domain NIDS",
        "status": "online",
        "version": "1.0.0",
        "architecture": "Lopez17CNN",
        "base_method": "BiC",
        "refinement": "TDNR",
        "endpoints": {
            "health": "/health",
            "models": "/api/models",
            "analyze_pcap": "/api/analyze-pcap",
            "docs": "/docs",
        },
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health():

    return {
        "status": "ok",
        "service": "cross-domain-nids",
        "engines_loaded": list(
            engines.keys()
        ),
    }


# ============================================================
# DATASETS
# ============================================================

@app.get("/api/models")
def models():

    return {
        "models": [

            {
                "id": "ton_iot",
                "name": "TON-IoT",
                "type": "target_dataset",
                "description": (
                    "Network intrusion detection "
                    "target domain."
                ),
                "architecture": "Lopez17CNN",
                "base_model": "BiC",
                "refinement": "TDNR",
                "classes": 12,
                "status": "ready",
            },

            {
                "id": "edge_iiot",
                "name": "Edge-IIoTset",
                "type": "target_dataset",
                "description": (
                    "Industrial IoT intrusion detection "
                    "target domain."
                ),
                "architecture": "Lopez17CNN",
                "base_model": "BiC",
                "refinement": "TDNR",
                "classes": 14,
                "status": "ready",
            },

        ]
    }


# ============================================================
# ANALYZE PCAP
# ============================================================

@app.post("/api/analyze-pcap")
async def analyze_pcap(
    file: UploadFile = File(...),
    dataset: str = Form("ton_iot"),
):

    print(
        f"[NIDS] Analysis request: "
        f"dataset={dataset}, file={file.filename}",
        flush=True,
    )


    # --------------------------------------------------------
    # Validate dataset
    # --------------------------------------------------------

    if dataset not in (
        "ton_iot",
        "edge_iiot",
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported dataset. "
                "Choose 'ton_iot' or 'edge_iiot'."
            ),
        )


    # --------------------------------------------------------
    # Validate PCAP
    # --------------------------------------------------------

    filename = file.filename or ""

    if not filename.lower().endswith(
        (".pcap", ".pcapng")
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Only .pcap and .pcapng files "
                "are supported."
            ),
        )


    tmp_path = None


    try:

        # ----------------------------------------------------
        # LOAD MODEL
        # ----------------------------------------------------

        engine = get_engine(
            dataset
        )


        # ----------------------------------------------------
        # SAVE PCAP
        # ----------------------------------------------------

        with tempfile.NamedTemporaryFile(
            suffix=Path(filename).suffix,
            delete=False,
        ) as tmp:

            shutil.copyfileobj(
                file.file,
                tmp,
            )

            tmp_path = Path(
                tmp.name
            )


        print(
            f"[NIDS] PCAP saved: {tmp_path}",
            flush=True,
        )


        # ----------------------------------------------------
        # PCAP → BIFLOWS
        # ----------------------------------------------------

        flows = extract_biflows(
            tmp_path
        )


        print(
            f"[NIDS] Extracted flows: {len(flows)}",
            flush=True,
        )


        # ----------------------------------------------------
        # BIFLOWS → MODEL INPUT
        # ----------------------------------------------------

        X, metadata = (
            biflows_to_model_input(
                flows,
                num_packets=10,
            )
        )


        print(
            f"[NIDS] Model input shape: {X.shape}",
            flush=True,
        )


        # ----------------------------------------------------
        # NO FLOWS
        # ----------------------------------------------------

        if len(X) == 0:

            return {
                "status": "completed",
                "filename": filename,
                "dataset": dataset,
                "flows": 0,
                "summary": {
                    "threats": 0,
                    "normal": 0,
                    "refinements": 0,
                },
                "detections": [],
                "message": (
                    "No complete 10-packet flows "
                    "were found."
                ),
            }


        # ----------------------------------------------------
        # INFERENCE + TDNR
        # ----------------------------------------------------

        print(
            "[NIDS] Running Lopez17CNN + BiC + TDNR...",
            flush=True,
        )


        results = engine.analyze(
            X
        )


        print(
            f"[NIDS] Predictions completed: "
            f"{len(results)}",
            flush=True,
        )


        # ----------------------------------------------------
        # DETECTIONS
        # ----------------------------------------------------

        detections = []


        for meta, result in zip(
            metadata,
            results,
        ):

            detections.append(
                {
                    "flow": meta,

                    "base_prediction": result[
                        "base_prediction"
                    ],

                    "final_prediction": result[
                        "final_prediction"
                    ],

                    "confidence": result[
                        "confidence"
                    ],

                    "local_prediction": result[
                        "local_prediction"
                    ],

                    "local_agreement": result[
                        "local_agreement"
                    ],

                    "refinement_applied": result[
                        "refinement_applied"
                    ],
                }
            )


        # ----------------------------------------------------
        # SUMMARY
        # ----------------------------------------------------

        threats = sum(
            1
            for d in detections
            if d["final_prediction"] != 0
        )


        normal = (
            len(detections)
            - threats
        )


        refinements = sum(
            1
            for d in detections
            if d["refinement_applied"]
        )


        dataset_name = (
            "TON-IoT"
            if dataset == "ton_iot"
            else "Edge-IIoTset"
        )


        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        return {
            "status": "completed",
            "filename": filename,
            "dataset": dataset,
            "dataset_name": dataset_name,
            "architecture": "Lopez17CNN",
            "base_model": "BiC",
            "refinement": "TDNR",
            "flows": len(detections),
            "summary": {
                "threats": threats,
                "normal": normal,
                "refinements": refinements,
            },
            "detections": detections,
        }


    except HTTPException:
        raise


    except Exception as exc:

        print(
            "\n[NIDS ERROR]",
            flush=True,
        )

        print(
            repr(exc),
            flush=True,
        )


        import traceback

        traceback.print_exc()


        raise HTTPException(
            status_code=500,
            detail={
                "message": "PCAP analysis failed",
                "error": str(exc),
                "error_type": type(exc).__name__,
            },
        ) from exc


    finally:

        if tmp_path is not None:

            tmp_path.unlink(
                missing_ok=True
            )