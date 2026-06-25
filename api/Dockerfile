FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
# Jalankan tenant provisioning lalu start API
CMD ["sh", "-c", "node scripts/setup-tenant.js && npm start"]
EXPOSE 3004
