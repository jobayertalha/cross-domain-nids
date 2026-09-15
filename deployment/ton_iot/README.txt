NIDS DEPLOYMENT PACKAGE
=======================

Source:
IoT-NID

Target:
ToN-IoT

Base model:
BiC

Network:
Lopez17CNN

Input:
PL, IAT, DIR, WIN

Packets:
10

Classes:
12

Latent dimension:
200

TDNR:
Target-Domain Neighborhood Refinement

TDNR policy:
k = 5
agreement threshold = 0.80
strength = 0.50
confidence threshold = 0.90
distance = cosine

TDNR reference:
80% of ToN-IoT target training data
Seed = 1

Purpose:
Preserve trained research artifacts for the
future NIDS web application without retraining.

Inference pipeline:

Traffic
   ->
Preprocessing
   ->
BiC
   ->
Latent Features
   ->
TDNR
   ->
Final Prediction
   ->
Web Dashboard