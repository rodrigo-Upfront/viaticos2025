FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy only package files to leverage caching
COPY package*.json ./

# Install dependencies (dev server will be used, source bind-mounted)
RUN npm install

# Expose port for CRA dev server
EXPOSE 3000

# Default command runs dev server; code is provided via bind mount
CMD ["npm", "start"]
