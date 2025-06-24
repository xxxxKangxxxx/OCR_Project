#!/bin/bash

# 쿠버네티스 리소스 정리 스크립트
set -e

NAMESPACE="cardlet-ocr"

echo "🧹 Cardlet OCR 서비스 정리 시작..."

# 사용자 확인
read -p "정말로 모든 리소스를 삭제하시겠습니까? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "취소되었습니다."
    exit 1
fi

echo "🗑️ 리소스 삭제 중..."

# Ingress 삭제
kubectl delete ingress cardlet-ingress -n $NAMESPACE --ignore-not-found=true

# 서비스 삭제
kubectl delete service frontend-service backend-service mongodb-service -n $NAMESPACE --ignore-not-found=true

# 배포 삭제
kubectl delete deployment frontend backend mongodb -n $NAMESPACE --ignore-not-found=true

# PVC 삭제
kubectl delete pvc mongodb-pvc -n $NAMESPACE --ignore-not-found=true

# ConfigMap과 Secret 삭제
kubectl delete configmap cardlet-config -n $NAMESPACE --ignore-not-found=true
kubectl delete secret cardlet-secrets -n $NAMESPACE --ignore-not-found=true

# 네임스페이스 삭제
kubectl delete namespace $NAMESPACE --ignore-not-found=true

echo "✅ 모든 리소스가 삭제되었습니다." 