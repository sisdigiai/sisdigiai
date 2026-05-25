#!/bin/sh
# git-credential-env.sh — credential helper que lê GITHUB_USERNAME e GITHUB_TOKEN do .env
#
# Configurado por:
#   git config --local credential.helper "$(pwd)/scripts/git-credential-env.sh"
#
# Como funciona:
#   1. Git invoca este script com "get" como argumento quando precisa autenticar
#   2. O script lê o .env da raiz do repo
#   3. Devolve username/password no formato esperado pelo git
#
# Requisitos: variáveis GITHUB_USERNAME e GITHUB_TOKEN definidas no .env

set -e

# Só responde ao verbo "get" do git
[ "$1" = "get" ] || exit 0

# Resolve o root do repo a partir da localização deste script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"

if [ ! -f "$ENV_FILE" ]; then
  # .env não existe — silencioso (git tentará o próximo helper, ex: manager)
  exit 0
fi

# Carrega variáveis do .env sem expor no shell pai
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

if [ -z "$GITHUB_USERNAME" ] || [ -z "$GITHUB_TOKEN" ]; then
  exit 0
fi

# Devolve credenciais para o git
echo "username=$GITHUB_USERNAME"
echo "password=$GITHUB_TOKEN"
