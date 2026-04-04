FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy all source code
COPY . .

# Build
RUN npm run build

# Install serve globally
RUN npm install -g serve

EXPOSE 3050

CMD ["serve", "-s", "dist", "-l", "3050"]
