NIDS DEPLOYMENT PACKAGE
=======================

Source:
IoT-NID

Target:
Edge-IIoT

Base model:
BiC

Network:
Lopez17CNN

Input:
PL, IAT, DIR, WIN

Packets:
10

Classes:
14

Latent dimension:
200

TDNR:
Target-Domain Neighborhood Refinement

TDNR policy:
k = 3
agreement threshold = 0.80
strength = 0.50
confidence threshold = 0.90
distance = cosine

TDNR reference:
80% of Edge-IIoT target training data
Seed = 1

Purpose:
Preserve trained research artifacts so that the
web application can be developed without retraining
the model on Kaggle.

Future inference pipeline:

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