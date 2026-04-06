FROM python:3.11-slim

WORKDIR /app

# Install Docker CLI
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://download.docker.com/linux/static/stable/aarch64/docker-24.0.7.tgz -o docker.tgz \
    || curl -fsSL https://download.docker.com/linux/static/stable/x86_64/docker-24.0.7.tgz -o docker.tgz \
    && tar -xzf docker.tgz --strip-components=1 -C /usr/local/bin docker/docker \
    && rm docker.tgz \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY server.py .

# Create data directories
RUN mkdir -p /app/data /app/backups /app/uploads

EXPOSE 8001

CMD ["python", "-m", "uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
