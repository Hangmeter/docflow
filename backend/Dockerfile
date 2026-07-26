FROM node:22.14.0-alpine AS build
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm install --ignore-scripts --no-audit --no-fund
COPY backend/tsconfig.json ./
COPY backend/src ./src
COPY backend/tests ./tests
COPY database/migrations ./database/migrations
RUN npm run build

FROM build AS test
CMD ["npm", "run", "test:integration"]

FROM build AS production-dependencies
RUN npm prune --omit=dev

FROM node:22.14.0-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY backend/package.json ./
COPY database/migrations ./database/migrations
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD node -e "fetch('http://localhost:3000/api/v1/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/main.js"]
