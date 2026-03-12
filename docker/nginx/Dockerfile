FROM nginx:1.27-alpine

# certbot handles Let's Encrypt; openssl handles self-signed fallback
RUN apk add --no-cache certbot openssl

COPY entrypoint.sh /entrypoint.sh

# Ensure Unix line endings in case the file was edited on Windows
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 80 443

ENTRYPOINT ["/entrypoint.sh"]
