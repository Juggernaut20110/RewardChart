FROM node:20-alpine

WORKDIR /app

# Install dependencies first (cached layer)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY server.js store.js ./
COPY routes/ ./routes/
COPY public/ ./public/

# Data directory — mount a volume here to persist db.json
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "server.js"]
