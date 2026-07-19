FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Expose port (Astro dev server default)
EXPOSE 4321

# Start the development server
CMD ["npm", "run", "dev", "--", "--host"]
