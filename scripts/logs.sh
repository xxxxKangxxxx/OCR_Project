#!/bin/bash

# 서비스 로그 확인 스크립트
NAMESPACE="cardlet-ocr"

echo "📋 Cardlet OCR 서비스 로그 확인"
echo ""

# 사용법 출력
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    echo "사용법: $0 [서비스명] [옵션]"
    echo ""
    echo "서비스명:"
    echo "  backend   - 백엔드 서비스 로그"
    echo "  frontend  - 프론트엔드 서비스 로그"
    echo "  mongodb   - MongoDB 로그"
    echo "  all       - 모든 서비스 로그 (기본값)"
    echo ""
    echo "옵션:"
    echo "  -f, --follow  - 실시간 로그 팔로우"
    echo "  -h, --help    - 도움말 표시"
    exit 0
fi

SERVICE=${1:-all}
FOLLOW_FLAG=""

# -f 옵션 확인
if [ "$2" = "-f" ] || [ "$2" = "--follow" ]; then
    FOLLOW_FLAG="-f"
fi

case $SERVICE in
    "backend")
        echo "🐍 백엔드 서비스 로그:"
        kubectl logs deployment/backend -n $NAMESPACE $FOLLOW_FLAG
        ;;
    "frontend")
        echo "⚛️ 프론트엔드 서비스 로그:"
        kubectl logs deployment/frontend -n $NAMESPACE $FOLLOW_FLAG
        ;;
    "mongodb")
        echo "🍃 MongoDB 로그:"
        kubectl logs deployment/mongodb -n $NAMESPACE $FOLLOW_FLAG
        ;;
    "all")
        echo "📊 모든 서비스 상태:"
        kubectl get pods -n $NAMESPACE
        echo ""
        echo "🐍 백엔드 로그 (최근 20줄):"
        kubectl logs deployment/backend -n $NAMESPACE --tail=20
        echo ""
        echo "⚛️ 프론트엔드 로그 (최근 20줄):"
        kubectl logs deployment/frontend -n $NAMESPACE --tail=20
        echo ""
        echo "🍃 MongoDB 로그 (최근 20줄):"
        kubectl logs deployment/mongodb -n $NAMESPACE --tail=20
        ;;
    *)
        echo "❌ 알 수 없는 서비스: $SERVICE"
        echo "사용 가능한 서비스: backend, frontend, mongodb, all"
        exit 1
        ;;
esac 