FROM node:20-alpine

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install

COPY backend/prisma ./prisma
RUN npx prisma generate

WORKDIR /app
COPY backend ./backend
COPY index.html style.css main.js robots.txt .nojekyll ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "cd backend && npx prisma migrate deploy && node server.js"]