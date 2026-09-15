FROM python:3.10-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .

RUN apt-get update && \
    apt-get install -y --no-install-recommends patchelf && \
    rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
      torch==1.12.1+cu102 \
      --extra-index-url https://download.pytorch.org/whl/cu102 && \
    pip install --no-cache-dir \
      fastapi \
      "uvicorn[standard]" \
      python-multipart \
      scapy \
      numpy==1.24.4 \
      pandas==2.2.3 \
      pyarrow==13.0.0 \
      scikit-learn==1.3.1

RUN patchelf --clear-execstack /usr/local/lib/python3.10/site-packages/torch/lib/libtorch_cpu.so

COPY backend ./backend
COPY deployment ./deployment

EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
