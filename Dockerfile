FROM node:22-alpine
WORKDIR /app
COPY . .
RUN node build.mjs
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV DATA_DIR=/data
EXPOSE 3000
CMD ["node", "server.mjs"]
