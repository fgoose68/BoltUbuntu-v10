FROM node:20-alpine

WORKDIR /app

# Copia package.json
COPY package.json ./

# Installa dipendenze
RUN npm install

# Copia configurazioni
COPY vite.config.ts ./
COPY tsconfig*.json ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY index.html ./

# Copia codice sorgente
COPY public ./public
COPY src ./src

EXPOSE 3050

CMD ["npm", "run", "start"]
