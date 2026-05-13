# Etap budowania
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Przekaż zmienne środowiskowe jako argumenty budowania (ARG)
# i ustaw je jako zmienne środowiskowe w tym etapie (ENV).
# Next.js użyje ich podczas 'npm run build'.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

ARG NEXT_PUBLIC_ENVIRONMENT
ENV NEXT_PUBLIC_ENVIRONMENT=$NEXT_PUBLIC_ENVIRONMENT

RUN npm run build

# Etap uruchomieniowy
FROM node:20-alpine AS runner

WORKDIR /app

# Produkcyjna instalacja zależności
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Zmienne środowiskowe, które mają być dostępne w kontenerze w czasie uruchamiania.
# Są to te same zmienne, które zostały użyte do zbudowania aplikacji.
# Dzięki temu aplikacja będzie miała do nich dostęp, jeśli są potrzebne w runtime,
# a także będą one zgodne z wartościami "wypalonymi" podczas budowania.
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_ENVIRONMENT=$NEXT_PUBLIC_ENVIRONMENT

# Standardowe zmienne Next.js dla uruchomienia w Dockerze
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "server.js"]