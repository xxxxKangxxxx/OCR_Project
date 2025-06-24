#!/bin/bash

# 카카오클라우드 쿠버네티스 배포 스크립트
set -e

echo "🚀 Cardlet OCR 서비스 배포 시작..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 변수 설정
REGISTRY="your-registry"  # 실제 컨테이너 레지스트리 주소로 변경
IMAGE_TAG=${1:-latest}
NAMESPACE="cardlet-ocr"

echo -e "${YELLOW}📋 배포 정보${NC}"
echo "Registry: $REGISTRY"
echo "Image Tag: $IMAGE_TAG"
echo "Namespace: $NAMESPACE"
echo ""

# Docker 이미지 빌드 및 푸시
echo -e "${YELLOW}🔨 Docker 이미지 빌드 중...${NC}"

# 백엔드 이미지 빌드
echo "Building backend image..."
docker build -f Dockerfile.backend -t $REGISTRY/cardlet-backend:$IMAGE_TAG .

# 프론트엔드 이미지 빌드
echo "Building frontend image..."
docker build -f Dockerfile.frontend -t $REGISTRY/cardlet-frontend:$IMAGE_TAG .

# 이미지 푸시
echo -e "${YELLOW}📤 Docker 이미지 푸시 중...${NC}"
docker push $REGISTRY/cardlet-backend:$IMAGE_TAG
docker push $REGISTRY/cardlet-frontend:$IMAGE_TAG

# 쿠버네티스 매니페스트에서 이미지 태그 업데이트
echo -e "${YELLOW}🔄 매니페스트 파일 업데이트 중...${NC}"
sed -i.bak "s|your-registry/cardlet-backend:latest|$REGISTRY/cardlet-backend:$IMAGE_TAG|g" k8s/backend.yaml
sed -i.bak "s|your-registry/cardlet-frontend:latest|$REGISTRY/cardlet-frontend:$IMAGE_TAG|g" k8s/frontend.yaml

# 쿠버네티스 배포
echo -e "${YELLOW}☸️ 쿠버네티스 배포 중...${NC}"

# 네임스페이스 생성
kubectl apply -f k8s/namespace.yaml

# ConfigMap과 Secret 적용
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml

# MongoDB 배포
echo "Deploying MongoDB..."
kubectl apply -f k8s/mongodb.yaml

# MongoDB가 준비될 때까지 대기
echo "Waiting for MongoDB to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/mongodb -n $NAMESPACE

# 백엔드 배포
echo "Deploying Backend..."
kubectl apply -f k8s/backend.yaml

# 백엔드가 준비될 때까지 대기
echo "Waiting for Backend to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/backend -n $NAMESPACE

# 프론트엔드 배포
echo "Deploying Frontend..."
kubectl apply -f k8s/frontend.yaml

# 프론트엔드가 준비될 때까지 대기
echo "Waiting for Frontend to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/frontend -n $NAMESPACE

# Ingress 배포
echo "Deploying Ingress..."
kubectl apply -f k8s/ingress.yaml

# 배포 상태 확인
echo -e "${YELLOW}📊 배포 상태 확인${NC}"
kubectl get pods -n $NAMESPACE
kubectl get services -n $NAMESPACE
kubectl get ingress -n $NAMESPACE

# 백업 파일 정리
rm -f k8s/*.bak

echo -e "${GREEN}✅ 배포 완료!${NC}"
echo ""
echo -e "${YELLOW}📝 다음 단계:${NC}"
echo "1. DNS 설정: cardlet.your-domain.com을 Ingress IP로 설정"
echo "2. TLS 인증서 설정 (선택사항)"
echo "3. 모니터링 및 로깅 설정"
echo ""
echo -e "${YELLOW}🔍 유용한 명령어:${NC}"
echo "kubectl get pods -n $NAMESPACE"
echo "kubectl logs -f deployment/backend -n $NAMESPACE"
echo "kubectl logs -f deployment/frontend -n $NAMESPACE"
echo "kubectl describe ingress cardlet-ingress -n $NAMESPACE" 