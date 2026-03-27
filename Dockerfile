FROM node:20-alpine

WORKDIR /app/backend

COPY backend/package*.json ./
COPY backend/prisma ./prisma
RUN DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres?schema=public npm install
RUN DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres?schema=public npx prisma generate

WORKDIR /app
COPY backend ./backend
COPY index.html thread.html style.css main.js thread.js robots.txt .nojekyll ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "cd backend && i=0; until npx prisma migrate deploy; do i=$((i+1)); if [ \"$i\" -ge 30 ]; then echo \"Migration failed after retries\"; exit 1; fi; echo \"Retrying migration in 5s...\"; sleep 5; done; node server.js"]