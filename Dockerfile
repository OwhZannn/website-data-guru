# syntax=docker/dockerfile:1
# Catatan: berkas ini belum pernah dibangun (Docker tidak tersedia saat penulisan).
FROM node:22-alpine AS dasar
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

FROM dasar AS pemasang
COPY package.json package-lock.json ./
RUN npm ci

FROM dasar AS pembangun
COPY --from=pemasang /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM dasar AS jalan
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
# Pengguna non-root (uid 1000); folder data di host harus bisa ditulis oleh uid ini.
RUN deluser --remove-home node && delgroup node 2>/dev/null; addgroup -g 1000 app && adduser -u 1000 -G app -D app && mkdir -p /app/data && chown app:app /app/data
COPY --from=pembangun --chown=app:app /app/.next/standalone ./
COPY --from=pembangun --chown=app:app /app/.next/static ./.next/static
COPY --from=pembangun --chown=app:app /app/public ./public
COPY --from=pembangun --chown=app:app /app/prisma ./prisma
COPY --chown=app:app deploy/entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh
# Prisma CLI lengkap dengan seluruh dependensinya, terpisah dari node_modules server (versi = package-lock).
RUN mkdir -p /opt/prisma-cli && cd /opt/prisma-cli && npm init -y >/dev/null \
 && PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x npm install --no-save --omit=dev --ignore-scripts=false prisma@6.19.3 \
 && node node_modules/prisma/build/index.js --version
# Gagalkan build bila mesin skema Alpine tidak terunduh (uid 1000 tidak bisa mengunduh saat berjalan).
RUN ls /opt/prisma-cli/node_modules/@prisma/engines/ | grep -q 'schema-engine-linux-musl-openssl-3.0.x' || (echo 'Mesin skema Prisma untuk Alpine tidak ada' && exit 1)
USER app
EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
