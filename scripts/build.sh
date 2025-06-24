#!/bin/bash

# Docker 이미지 빌드 스크립트
set -e

echo "🔨 Docker 이미지 빌드 시작..."

# 변수 설정
REGISTRY=${REGISTRY:-"your-registry"}
IMAGE_TAG=${1:-latest}

echo "Registry: $REGISTRY"
echo "Image Tag: $IMAGE_TAG"

# 백엔드 이미지 빌드
echo "🐍 백엔드 이미지 빌드 중..."
docker build -f Dockerfile.backend -t $REGISTRY/cardlet-backend:$IMAGE_TAG .
echo "✅ 백엔드 이미지 빌드 완료"

# 프론트엔드 이미지 빌드
echo "⚛️ 프론트엔드 이미지 빌드 중..."
docker build -f Dockerfile.frontend -t $REGISTRY/cardlet-frontend:$IMAGE_TAG .
echo "✅ 프론트엔드 이미지 빌드 완료"

echo "🎉 모든 이미지 빌드 완료!"
echo ""
echo "빌드된 이미지:"
echo "- $REGISTRY/cardlet-backend:$IMAGE_TAG"
echo "- $REGISTRY/cardlet-frontend:$IMAGE_TAG" 