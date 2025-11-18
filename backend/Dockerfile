FROM python:3.11-slim

# Create non-root user and set password
RUN apt-get update && apt-get install -y sudo \
    && useradd -m app && echo "app:pa55word" | chpasswd \
    && echo "app ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV FLASK_ENV=production

# Set work directory
WORKDIR /home/app/support-ticketing-system

# Install system dependencies
RUN apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy project files
COPY . .

# Change ownership
RUN chown -R app:app /home/app/support-ticketing-system

# Switch to user
USER app

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose port
EXPOSE 5000

# Run the application
CMD ["gunicorn", "--worker-class", "eventlet", "-w", "1", "--bind", "0.0.0.0:5000", "wsgi:app"]