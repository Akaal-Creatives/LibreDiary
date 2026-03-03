#!/bin/sh
# ===========================================
# LibreDiary Docker Image Build Script
#
# Reads version from package.json, builds server + web images,
# and tags each with <version> and latest.
#
# Usage:
#   ./scripts/docker-build.sh          # Build only
#   ./scripts/docker-build.sh --push   # Build and push to registry
#
# Developed by Akaal Creatives
# https://www.akaalcreatives.com
# ===========================================

set -e

cd "$(dirname "$0")/.."

VERSION=$(node -p "require('./package.json').version")

echo "Building LibreDiary Docker images v${VERSION}..."

docker build \
  -f apps/server/Dockerfile \
  -t librediary/server:"$VERSION" \
  -t librediary/server:latest \
  .

docker build \
  -f apps/web/Dockerfile \
  -t librediary/web:"$VERSION" \
  -t librediary/web:latest \
  .

echo ""
echo "Built librediary/server:${VERSION} and librediary/web:${VERSION}"
echo "Both also tagged as :latest"

if [ "$1" = "--push" ]; then
  echo ""
  echo "Pushing images to registry..."
  docker push librediary/server:"$VERSION"
  docker push librediary/server:latest
  docker push librediary/web:"$VERSION"
  docker push librediary/web:latest
  echo "Push complete."
fi
