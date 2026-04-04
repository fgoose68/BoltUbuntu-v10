FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for Docker CLI
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://get.docker.com -o get-docker.sh \
    && sh get-docker.sh \
    && rm get-docker.sh \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY server.py .

# Create data directories
RUN mkdir -p /app/data /app/backups /app/uploads

# Environment variables
ENV JWT_SECRET=raspberry_dashboard_secret_key_2024

EXPOSE 8001

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
