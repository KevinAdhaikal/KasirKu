FROM oven/bun:latest
WORKDIR /app

COPY package.json ./
RUN bun install

COPY index.ts tsconfig.json ./
COPY src/ ./src/
COPY html/ ./html/

VOLUME ["/app/database", "/app/cert", "/app/html/profile_img"]
EXPOSE 80 443

CMD ["bun", "run", "index.ts"]