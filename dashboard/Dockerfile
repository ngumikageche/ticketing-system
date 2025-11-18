# ✅ Use compatible Node version (supports vite@7.0.5)
FROM node:20.19.1

# Create non-root user and set password
RUN apt-get update && apt-get install -y sudo \
    && useradd -m web_dev && echo "web_dev:pa55word" | chpasswd \
    && echo "web_dev ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Set working directory
WORKDIR /home/web_dev/support-ticketing-dashboard

# Copy project files
COPY . .

# Change ownership
RUN chown -R web_dev:web_dev /home/web_dev/support-ticketing-dashboard

# Switch to user
USER web_dev

# Install dependencies and build
RUN npm install && sudo npm install -g serve && npm run build

# Copy serve config (for SPA fallback)
COPY serve.json dist/

# Expose the port
EXPOSE 3000

# Serve the built Vite app
CMD ["serve", "-s", "dist", "-l", "3000"]