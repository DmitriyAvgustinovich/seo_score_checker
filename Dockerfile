FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf

COPY welcome.html /usr/share/nginx/html/index.html
COPY static/ /usr/share/nginx/html/static/
COPY icons/ /usr/share/nginx/html/icons/

EXPOSE 8080
