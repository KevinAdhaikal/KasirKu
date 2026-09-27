FROM oven/bun:latest
WORKDIR /app

COPY package.json ./
RUN bun install

COPY index.ts tsconfig.json ./
COPY src/ ./src/
COPY dist/ ./dist/
COPY database/ ./database/

VOLUME ["/app/database", "/app/cert", "/app/profile_img"]
EXPOSE 80 443

CMD ["bun", "run", "index.ts"]