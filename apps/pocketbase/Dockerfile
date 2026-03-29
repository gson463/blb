# PocketBase release must match .pocketbase-version (linux amd64 for Fly Machines)
FROM alpine:3.20

ARG PB_VERSION=0.36.7
RUN apk add --no-cache ca-certificates unzip curl \
  && curl -fsSL "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" -o /tmp/pb.zip \
  && unzip /tmp/pb.zip -d /tmp \
  && mv /tmp/pocketbase /usr/local/bin/pocketbase \
  && chmod +x /usr/local/bin/pocketbase \
  && rm -rf /tmp/*

WORKDIR /app

COPY pb_migrations ./pb_migrations
COPY pb_hooks ./pb_hooks

EXPOSE 8090

# /data is a Fly volume; migrations & hooks are baked into the image
CMD ["sh", "-c", "exec /usr/local/bin/pocketbase serve --http=0.0.0.0:8090 --encryptionEnv=PB_ENCRYPTION_KEY --dir=/data --migrationsDir=/app/pb_migrations --hooksDir=/app/pb_hooks --hooksWatch=false"]
