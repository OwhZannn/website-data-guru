#!/bin/sh
set -e
node /opt/prisma-cli/node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma
# Kegagalan membuat admin tidak boleh menghalangi server menyala.
node admin-awal.mjs || true
exec node server.js
