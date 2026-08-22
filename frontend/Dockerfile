# Imagem do frontend para a VPS: compila com Node e entrega os estáticos por
# Nginx. Na nuvem (Netlify) isso não existe — lá o build roda no serviço deles.
#
# VITE_API_URL entra como ARG, não como variável de runtime, porque o Vite grava
# o valor DENTRO do bundle na compilação. Numa imagem, isso significa que trocar
# o endereço da API exige rebuildar a imagem — não adianta mudar o ambiente do
# container e reiniciar.
FROM node:20-alpine AS build
WORKDIR /app

# package.json primeiro: a camada de dependências só é refeita quando ele muda.
COPY package*.json ./
RUN npm ci

COPY . .

# Padrão "/api": front e API saem do MESMO domínio na VPS (o Caddy roteia), então
# a chamada é relativa e não há origem externa para o CORS ou para a CSP
# liberarem. Ver vite.config.ts, que deriva a origem daqui.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
