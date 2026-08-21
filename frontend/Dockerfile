
ARG NODE_VERSION=18.20.4
FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /usr/src/app

COPY . .
RUN npm install --save-dev react-app-rewired
RUN npm install
RUN npm run build
ENV NODE_ENV=production

FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /usr/src/app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
