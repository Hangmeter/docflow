FROM nginx:1.27.5-alpine

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY public /usr/share/nginx/html
COPY src/js /usr/share/nginx/html/js
COPY src/css /usr/share/nginx/html/css

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://localhost:8080/ || exit 1
