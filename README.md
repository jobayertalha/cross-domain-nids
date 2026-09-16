# Cross-Domain NIDS

### Research-Oriented Network Intrusion Detection with Cross-Domain Transfer and Target Domain Neighborhood Refinement

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-000000?logo=vercel&logoColor=white)](https://cross-domain-nids.vercel.app/)
[![Backend](https://img.shields.io/badge/API-Render-46E3B7?logo=render&logoColor=white)](https://cross-domain-nids.onrender.com/)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react&logoColor=white)](https://cross-domain-nids.vercel.app/)
[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](https://cross-domain-nids.onrender.com/docs)
[![Model](https://img.shields.io/badge/Model-Lopez17CNN-6C63FF)](#model-pipeline)
[![Research](https://img.shields.io/badge/Research-Cross--Domain%20NIDS-orange)](#research-contribution)

---

## Live Demo

**Web Application:**
https://cross-domain-nids.vercel.app/

**Backend API:**
https://cross-domain-nids.onrender.com/

**API Documentation:**
https://cross-domain-nids.onrender.com/docs

> The backend is deployed on the Render free tier. After a period of inactivity, the service may spin down, so the first request can experience cold-start latency.

---

## Overview

**Cross-Domain NIDS** is an end-to-end Network Intrusion Detection System (NIDS) designed for intrusion detection under **cross-domain distribution shifts**.

The system builds on the incremental and explainable NIDS framework introduced by Cerasuolo et al. and extends the transferred detection pipeline with a lightweight **Target Domain Neighborhood Refinement (TDNR)** mechanism.

The project connects the research pipeline to a deployable web platform where an analyst can upload a `.pcap` or `.pcapng` file and obtain network intrusion predictions through a complete inference pipeline.

### Core Idea

A learned NIDS foundation is transferred to a target domain using an incremental classification framework. After the initial **BiC (Bias Correction)** prediction, Target Domain Neighborhood Refinement (TDNR) examines the local structure of the target-domain latent representation and selectively refines difficult predictions when sufficient neighborhood evidence is available.

---

## Research Foundation

This project is based on the incremental NIDS framework presented in:

> Cerasuolo et al., "Adaptable, Incremental, and Explainable Network Intrusion Detection Systems for Internet of Things," Engineering Applications of Artificial Intelligence, Volume 144, 110143, 2025.

The original research provides the foundation for incremental network intrusion detection.

This project extends that foundation with:

**Target Domain Neighborhood Refinement (TDNR)**

The distinction is:

```text
EAAI-25 Foundation
        |
        +-- Learned network representation
        +-- Incremental NIDS
        +-- BiC (Bias Correction)
        |
        v
This Project
        |
        +-- Target Domain Neighborhood Refinement (TDNR)
        |
        v
Deployable Cross-Domain NIDS
```

---

## Research Objective

Network intrusion detection systems can experience performance degradation when the deployment environment differs from the environment used to train the original model.

Such domain shifts can arise from differences in:

- network traffic distributions;
- IoT devices;
- protocols;
- network environments;
- attack distributions;
- previously unseen traffic patterns.

The objective of this project is to investigate whether **target-domain local neighborhood structure** can provide useful information for refining predictions produced by a transferred incremental NIDS.

The central research question is:

> **Can local target-domain neighborhood information improve transferred NIDS predictions without requiring complete model retraining?**

---

## Key Features

- PCAP / PCAPNG based network analysis
- Cross-domain intrusion detection
- Lopez17CNN learned representation
- 200-dimensional latent representation
- BiC (Bias Correction) incremental classification
- Target Domain Neighborhood Refinement (TDNR)
- Target-domain neighborhood analysis
- Confidence-aware selective refinement
- Prediction-change tracking
- Threat and alert dashboard
- Analysis history
- Dataset-specific deployment configurations
- REST API
- Dockerized backend
- Vercel + Render deployment

---

# Model Pipeline

```text
                    +----------------------+
                    |      PCAP / PCAPNG   |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    | Packet / Flow        |
                    | Extraction           |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    | 10 Packets x 4 Fields|
                    | PL / IAT / DIR / WIN |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    | Feature Normalization|
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |      Lopez17CNN      |
                    |   Learned Foundation  |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    | 200-D Latent Features|
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    | BiC (Bias Correction)|
                    |  Initial Prediction  |
                    +----------+-----------+
                               |
                               v
              +--------------------------------------+
              | Target Domain Neighborhood           |
              | Refinement (TDNR)                    |
              |                                      |
              | - Target-domain reference bank      |
              | - Local neighborhood search          |
              | - Neighborhood agreement             |
              | - Confidence gating                  |
              | - Selective prediction correction    |
              +------------------+-------------------+
                                 |
                                 v
                    +----------------------+
                    |   Final Prediction   |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    | Alerts / Dashboard   |
                    +----------------------+
```

---

# Research Contribution

## Target Domain Neighborhood Refinement (TDNR)

The primary research contribution of this project is **Target Domain Neighborhood Refinement (TDNR)**.

TDNR operates after the transferred classifier produces its initial prediction. Instead of retraining the complete neural network, TDNR examines the local neighborhood of the sample in the target-domain latent space.

The refinement process uses:

1. The frozen 200-dimensional representation generated by Lopez17CNN.
2. A target-domain reference feature bank.
3. Local nearest-neighbor information.
4. Neighborhood class agreement.
5. The confidence of the BiC prediction.
6. A selective refinement policy.

Conceptually:

```text
Transferred Sample
        |
        v
BiC Prediction
        |
        v
Target-Domain Neighbors
        |
        v
Local Class Agreement
        |
        v
Refinement Conditions
        |
        +--------------------+
        |                    |
        v                    v
   No refinement        Apply TDNR
        |                    |
        +----------+---------+
                   |
                   v
            Final Prediction
```

TDNR is therefore a **lightweight post-transfer refinement stage**, rather than a replacement for the underlying classifier.

---

## Selective Refinement

TDNR does not modify every prediction.

A prediction can remain unchanged when the existing BiC prediction is sufficiently supported.

For difficult samples, the target-domain neighborhood is examined to determine whether there is sufficient local evidence for a different class.

```text
                    BiC Prediction
                          |
              +-----------+-----------+
              |                       |
              v                       v
        Sufficient Evidence       Difficult Sample
              |                       |
              v                       v
          Keep BiC            Search Local Neighbors
                                      |
                                      v
                             Check Agreement
                                      |
                                      v
                            Check Confidence
                                      |
                              +-------+-------+
                              |               |
                              v               v
                           Reject          Accept
                              |               |
                              v               v
                           Keep BiC       Apply TDNR
```

This design concentrates refinement on potentially difficult target-domain predictions rather than globally changing the classifier output.

---

# Model Architecture

## Lopez17CNN

The foundation network is **Lopez17CNN**, which learns a compact representation from packet-sequence input.

The model uses:

```text
10 packets x 4 fields
```

The four fields are:

| Field | Description |
|---|---|
| PL | Packet Length |
| IAT | Inter-Arrival Time |
| DIR | Packet Direction |
| WIN | TCP Window |

The model input is represented as:

```text
(batch, 1, 10, 4)
```

The network produces a **200-dimensional latent representation** before classification.

---

## BiC (Bias Correction)

The transferred classifier uses **BiC (Bias Correction)** as the incremental classification component.

The deployment pipeline therefore follows:

```text
PCAP
  |
  v
Packet Representation
  |
  v
Lopez17CNN
  |
  v
200-D Latent Representation
  |
  v
BiC (Bias Correction)
  |
  v
Target Domain Neighborhood Refinement (TDNR)
  |
  v
Final Prediction
```

---

# Experimental Evaluation

TDNR was evaluated on target-domain traffic using strict experimental configurations.

## TON-IoT

| Metric | BiC | TDNR | Change |
|---|---:|---:|---:|
| Accuracy | 0.8800 | 0.9566 | +0.0766 |
| Macro F1 | 0.6338 | 0.7980 | +0.1642 |

## Edge-IIoTset

| Metric | BiC | TDNR | Change |
|---|---:|---:|---:|
| Accuracy | 0.7918 | 0.8915 | +0.0997 |
| Macro F1 | 0.3913 | 0.7084 | +0.3171 |

These values correspond to the reported experimental configurations used for the TDNR evaluation.

They should be interpreted as **experimental results for the evaluated target-domain settings**, not as guarantees of improvement for arbitrary network environments.

---

# Target Domains

The deployment currently provides configurations for:

### TON-IoT

Target-domain deployment configuration based on the TON-IoT evaluation setting.

### Edge-IIoTset

Target-domain deployment configuration based on the Edge-IIoTset evaluation setting.

These are treated as **target datasets / deployment domains**, rather than separate machine-learning models.

---

# Application Architecture

Cross-Domain NIDS is implemented as a full-stack application.

```text
+---------------------------------------------+
|              React Frontend                 |
|                                             |
| Dashboard | Analyze PCAP | Alerts | Stats  |
+----------------------+----------------------+
                       |
                       | REST API
                       v
+---------------------------------------------+
|              FastAPI Backend                |
|                                             |
| Upload Validation                           |
| PCAP Processing                             |
| Model Inference                             |
| TDNR Refinement                             |
| Result Aggregation                          |
+----------------------+----------------------+
                       |
                       v
+---------------------------------------------+
|             NIDS Inference Engine           |
|                                             |
| Scapy -> Preprocessing -> Lopez17CNN        |
| -> 200-D Latent -> BiC -> TDNR              |
+---------------------------------------------+
```

---

# Web Dashboard

The web application provides an analyst-oriented interface for network traffic analysis.

### Dashboard capabilities

- PCAP / PCAPNG upload
- Target-domain selection
- Threat distribution
- Normal vs attack traffic
- Alert summaries
- Analysis history
- Prediction details
- BiC confidence
- TDNR local prediction
- Neighborhood agreement
- Refinement status
- Prediction changes
- Statistics
- Dark / light interface

For an uploaded PCAP without ground-truth labels, the dashboard reports **inference-level TDNR impact**, such as prediction changes and refinements applied.

These values are not presented as accuracy measurements because ground-truth labels are unavailable during ordinary PCAP analysis.

---

# API

The backend exposes the following endpoints:

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Backend health status |
| `/api/models` | GET | Available target-domain configurations |
| `/api/analyze-pcap` | POST | Analyze an uploaded PCAP |
| `/api/alerts` | GET | Retrieve alert information |
| `/api/stats` | GET | Retrieve analysis statistics |
| `/docs` | GET | Interactive FastAPI documentation |

## Example Request

```bash
curl -X POST \
  "https://cross-domain-nids.onrender.com/api/analyze-pcap" \
  -F "file=@traffic.pcap" \
  -F "dataset=ton_iot"
```

---

# Repository Structure

```text
cross-domain-nids/
|
+-- backend/
|   +-- app/
|       +-- api/
|       +-- config/
|       +-- inference/
|       |   +-- engine.py
|       |   +-- lopez17cnn.py
|       |   +-- model_loader.py
|       |   +-- network.py
|       |   +-- tdnr.py
|       +-- preprocessing/
|       |   +-- pcap_parser.py
|       +-- services/
|       +-- main.py
|
+-- deployment/
|   +-- edge_iiot/
|   +-- ton_iot/
|
+-- frontend/
|   +-- src/
|   +-- public/
|   +-- package.json
|   +-- vite.config.ts
|
+-- .dockerignore
+-- .gitignore
+-- Dockerfile
+-- Dockerfile.fast
+-- requirements.txt
+-- README.md
```

---

# Technology Stack

### Frontend

- React
- TypeScript
- Vite

### Backend

- Python
- FastAPI
- Uvicorn
- Scapy
- NumPy
- Pandas
- PyTorch
- Scikit-learn

### Deployment

- Docker
- GitHub
- Vercel
- Render

---

# Local Development

## Backend

Create a Python 3.10 environment:

```bash
python3.10 -m venv .venv
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run the API:

```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

API:

```text
http://localhost:8000
```

Documentation:

```text
http://localhost:8000/docs
```

## Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will normally run at:

```text
http://localhost:5173
```

The Vite development proxy forwards API requests to the local FastAPI server.

---

# Docker

Build the backend image:

```bash
docker build -t cross-domain-nids .
```

Run:

```bash
docker run --rm -p 8000:8000 cross-domain-nids
```

The API will then be available at:

```text
http://localhost:8000
```

---

# Production Deployment

The current deployment uses separate frontend and backend services.

```text
                    Internet
                       |
             +---------+---------+
             |                   |
             v                   v
          Vercel              Render
       React Frontend      FastAPI Backend
             |                   |
             +------ REST -------+
                       |
                       v
                NIDS Inference
                       |
              +--------+--------+
              |                 |
              v                 v
             BiC               TDNR
              |                 |
              +--------+--------+
                       |
                       v
                 Final Results
```

### Frontend

https://cross-domain-nids.vercel.app/

### Backend

https://cross-domain-nids.onrender.com/

---

# Runtime Behavior

The deployed application does **not retrain the foundation model when a PCAP is uploaded**.

The runtime pipeline is:

```text
PCAP
  |
  v
Flow Extraction
  |
  v
Feature Normalization
  |
  v
Lopez17CNN Inference
  |
  v
200-D Latent Representation
  |
  v
BiC Prediction
  |
  v
TDNR Refinement
  |
  v
Final Detection
```

This allows the research pipeline to operate as a practical inference system.

---

# Research-to-Product Relationship

The project separates the research contribution from the surrounding engineering infrastructure.

```text
                    RESEARCH
                       |
                       v
              EAAI-25 Foundation
                       |
              +--------+--------+
              |                 |
              v                 v
         Lopez17CNN            BiC
              |                 |
              +--------+--------+
                       |
                       v
              Cross-Domain Transfer
                       |
                       v
                 Target Domain
                       |
                       v
       Target Domain Neighborhood
              Refinement (TDNR)
                       |
                       v
                    PRODUCT
                       |
              +--------+--------+
              |                 |
              v                 v
           FastAPI        React Dashboard
              |                 |
              +--------+--------+
                       |
                       v
                 PCAP Analysis
                       |
                       v
                   Deployment
```

The research layer provides the detection methodology, while the product layer provides the operational workflow for PCAP ingestion, inference, visualization, and deployment.

---

# Limitations

The current system is designed for **offline PCAP analysis**.

The deployment parser provides an engineering bridge from raw packet captures to the compact packet representation required by the model.

Practical limitations include:

- very short flows may not contain the required ten packets;
- malformed or unsupported packets may be skipped;
- encrypted traffic limits payload-level interpretation;
- arbitrary network traffic may differ from the supported target-domain distributions;
- deployment performance depends on compatibility between observed traffic and the evaluated domains;
- the current free backend deployment can experience cold-start latency.

---

# Future Work

Planned extensions include:

- Live network-interface capture
- Local NIDS monitoring agent
- Streaming intrusion detection
- Persistent alert storage
- PostgreSQL integration
- Authentication and analyst accounts
- Extended explainability
- Additional target domains
- Open-set attack detection
- Production-grade monitoring
- Scalable infrastructure

---

# Citation

If you use the research foundation of this project, please cite:

```text
Cerasuolo et al., "Adaptable, Incremental, and Explainable Network
Intrusion Detection Systems for Internet of Things,"
Engineering Applications of Artificial Intelligence,
Volume 144, 110143, 2025.

DOI: 10.1016/j.engappai.2025.110143
```

---

# Author

**Talha Jobayer Zihan**

Computer Science & Engineering
Rajshahi University of Engineering & Technology (RUET)

- GitHub: https://github.com/jobayertalha
- LinkedIn: https://www.linkedin.com/in/talha-jobayer-696a74237/
- Portfolio: https://v0-personal-portfolio-site-tau.vercel.app/

---

## License

This repository contains research and deployment code associated with the Cross-Domain NIDS project.

Please refer to the repository and referenced research work for applicable licensing and attribution requirements.