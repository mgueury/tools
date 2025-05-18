FROM oraclelinux:8

RUN dnf module enable -y nodejs:18 && \
    dnf install -y nodejs python3 && \    
     rm -rf /var/cache/dnf

WORKDIR /app
COPY src/* /app/
RUN npm install
CMD exec node rest.js