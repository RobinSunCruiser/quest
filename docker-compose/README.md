## Build Docker Image for Linux (on mac)
Go to project root where `Dockerfile` resides
use: `docker buildx build --platform linux/amd64 -t image-name .`

`image-name` is currently set to `robinsuncruiser/quest` so a built image can be downloaded from docker repository

## Use own image tag
To use own image change `image` tag in `docker-compose.yml`

## Configure LLM proxies
Change values ins `quest/config.json`
(do not change port 3000)

## Create Certificates for nginx
in docker-compose folder..
```
mkdir -p nginx/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/certs/private.key \
  -out nginx/certs/certificate.crt
```