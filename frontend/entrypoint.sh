#!/bin/sh

echo "⏳ 백엔드가 준비될 때까지 대기 중..."
until curl -s http://backend:8000/docs > /dev/null; do
  echo "🔁 아직 백엔드가 안 떠 있음. 2초 후 재시도..."
  sleep 2
done

echo "✅ 백엔드가 응답함! Nginx 시작"
nginx -g 'daemon off;' 