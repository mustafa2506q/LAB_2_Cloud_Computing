# Stage 1: production dependencies for the Express server
FROM node:20-alpine AS deps
WORKDIR /app
COPY server/package*.json ./
RUN npm install --omit=dev

# Stage 2: build the React client with Vite
FROM node:20-alpine AS client
WORKDIR /client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 3: small runtime image, non-root
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY server/server.js ./
COPY --from=client /client/dist ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
