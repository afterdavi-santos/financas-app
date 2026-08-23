#!/usr/bin/env bash
# Deploy na VPS: baixa as imagens que o GitHub Actions publicou e reinicia a
# pilha. Nada e compilado aqui — a micro nao tem RAM para isso.
#
#   ./deploy.sh
#
# Pre-requisitos, uma vez so: .env preenchido ao lado deste arquivo e o
# workflow "Publicar imagens" concluido com sucesso no GitHub.

set -euo pipefail
cd "$(dirname "$0")"

COMPOSE=(docker compose -f docker-compose.prod.yml -f docker-compose.micro.yml)

if [[ ! -f .env ]]; then
  echo "ERRO: .env nao existe. Copie o modelo e preencha:" >&2
  echo "  cp .env.prod.example .env && nano .env" >&2
  exit 1
fi

# O Caddyfile e o compose sao versionados; pegar a versao mais recente antes de
# subir evita rodar imagem nova com roteamento antigo.
echo "==> Atualizando arquivos de configuracao"
git pull --ff-only

echo "==> Baixando imagens do ghcr.io"
"${COMPOSE[@]}" pull

echo "==> Subindo a pilha"
"${COMPOSE[@]}" up -d --remove-orphans

# Imagens antigas ficam ocupando disco a cada deploy. O boot volume da micro tem
# 46 GB, entao isso importa depois de algumas dezenas de deploys.
echo "==> Removendo imagens orfas"
docker image prune -f

echo
"${COMPOSE[@]}" ps
