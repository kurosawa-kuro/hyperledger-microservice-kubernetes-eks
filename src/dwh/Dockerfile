# Dockerfile
FROM node:18-slim

WORKDIR /app
COPY . .

RUN apt-get update && apt-get install -y python3 build-essential && \
    npm install

CMD ["node", "main.js"]
