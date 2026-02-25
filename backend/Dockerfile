FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

RUN mkdir -p uploads/lessons uploads/assignments uploads/submissions uploads/avatars

EXPOSE 5000

CMD ["node", "src/server.js"]
