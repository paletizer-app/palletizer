# STAGE 1: Build the React application
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# STAGE 2: Serve with Nginx
FROM nginx:alpine
# Copy the compiled files from the build stage to Nginx's public folder
COPY --from=build /app/dist /usr/share/nginx/html
# Expose port 80 to the outside world
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]