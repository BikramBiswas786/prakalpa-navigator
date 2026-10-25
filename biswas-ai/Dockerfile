FROM node:22-alpine
WORKDIR /app
COPY index.html server.js package.json pd-dl-sw.js ./
COPY api ./api
ENV PORT=7860
EXPOSE 7860
USER node
CMD ["node", "server.js"]
