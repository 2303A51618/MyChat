### Dockerfile for running the monorepo services
# This Dockerfile builds the backend and can be adapted to build frontend separately for static hosting.

FROM node:22-slim

WORKDIR /usr/src/app

# Copy package files and install backend dependencies only (smaller image)
COPY BACKEND/package*.json ./BACKEND/
WORKDIR /usr/src/app/BACKEND
RUN npm install --production

# Copy backend source
COPY BACKEND ./

ENV NODE_ENV=production
EXPOSE 5001

CMD ["node","src/index.js"]
