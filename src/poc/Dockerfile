FROM node:18

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

# db.json を一緒にCOPY（これで読み書き可能）
COPY ./database/db.json ./database/db.json

EXPOSE 3001
CMD ["node", "src/app.js"]
