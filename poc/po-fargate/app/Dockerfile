FROM node:18

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

# db.json を一緒にCOPY
COPY ./database/db.json ./database/db.json

EXPOSE 3333
CMD ["node", "src/app.js"] 