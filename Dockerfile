FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN npm install --global pnpm && pnpm install

COPY . .

EXPOSE 3000

CMD ["pnpm", "dev"]