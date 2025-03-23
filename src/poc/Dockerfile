FROM node:18

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

# db.json を一緒にCOPY（これで読み書き可能）
COPY db.json ./db.json

EXPOSE 3001
CMD ["node", "index.js"]
