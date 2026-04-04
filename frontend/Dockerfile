FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package.json yarn.lock* ./

# Install dependencies
RUN yarn install --frozen-lockfile || yarn install

# Copy application code
COPY . .

# Build for production
RUN yarn build

# Install serve for production
RUN yarn global add serve

EXPOSE 3000

# Serve the built application
CMD ["serve", "-s", "dist", "-l", "3000"]
