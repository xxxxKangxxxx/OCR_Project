# 🚀 카카오클라우드 쿠버네티스 배포 - 빠른 시작 가이드

## 📁 생성된 파일 구조

```
OCR_Project/
├── Dockerfile.backend          # 백엔드 Docker 이미지
├── Dockerfile.frontend         # 프론트엔드 Docker 이미지  
├── nginx.conf                  # Nginx 설정
├── docker-compose.yml          # 로컬 개발용
├── deploy.sh                   # 전체 배포 스크립트
├── k8s/                        # 쿠버네티스 매니페스트
│   ├── namespace.yaml          # 네임스페이스
│   ├── configmap.yaml          # 설정값
│   ├── secrets.yaml            # 시크릿
│   ├── mongodb.yaml            # MongoDB 배포
│   ├── backend.yaml            # 백엔드 배포
│   ├── frontend.yaml           # 프론트엔드 배포
│   └── ingress.yaml            # 로드밸런서
├── scripts/                    # 유틸리티 스크립트
│   ├── build.sh               # 이미지 빌드만
│   ├── cleanup.sh             # 리소스 정리
│   └── logs.sh                # 로그 확인
└── DEPLOYMENT.md              # 상세 배포 가이드
```

## ⚡ 빠른 배포 (5분 완성)

### 1. 사전 준비
```bash
# 카카오클라우드 kubectl 설정 완료 확인
kubectl cluster-info

# Docker 로그인 (컨테이너 레지스트리)
docker login your-registry
```

### 2. 설정 수정
```bash
# 1. 레지스트리 주소 변경
vim deploy.sh
# REGISTRY="your-registry" → 실제 주소로 변경

# 2. 도메인 설정  
vim k8s/ingress.yaml
# cardlet.your-domain.com → 실제 도메인으로 변경

# 3. JWT 시크릿 키 변경 (보안)
echo -n "새로운-강력한-시크릿-키" | base64
vim k8s/secrets.yaml
# SECRET_KEY 값 업데이트
```

### 3. 원클릭 배포
```bash
# 전체 배포 실행
./deploy.sh

# 또는 특정 버전으로 배포
./deploy.sh v1.0.0
```

### 4. 배포 확인
```bash
# 상태 확인
kubectl get pods -n cardlet-ocr

# 서비스 접근 확인
kubectl get ingress -n cardlet-ocr
```

## 🔧 로컬 테스트

```bash
# 로컬에서 전체 스택 실행
docker-compose up -d

# 브라우저에서 확인
# Frontend: http://localhost
# Backend API: http://localhost:8000/docs
```

## 📋 주요 명령어

```bash
# 이미지만 빌드
./scripts/build.sh

# 로그 확인
./scripts/logs.sh backend -f    # 백엔드 실시간 로그
./scripts/logs.sh all           # 모든 서비스 로그

# 리소스 정리
./scripts/cleanup.sh
```

## 🔍 트러블슈팅

### 자주 발생하는 문제

1. **이미지 빌드 실패**
   ```bash
   # 캐시 없이 다시 빌드
   docker build --no-cache -f Dockerfile.backend -t test .
   ```

2. **팟이 시작되지 않음**
   ```bash
   # 상세 정보 확인
   kubectl describe pod <pod-name> -n cardlet-ocr
   ```

3. **서비스 접근 불가**
   ```bash
   # 포트 포워딩으로 직접 테스트
   kubectl port-forward service/backend-service 8000:8000 -n cardlet-ocr
   ```

## 🎯 다음 단계

1. **도메인 DNS 설정**: Ingress IP를 도메인에 연결
2. **TLS 인증서 설정**: Let's Encrypt 또는 카카오클라우드 인증서
3. **모니터링 설정**: 로그 수집 및 알림 설정
4. **백업 전략**: 데이터베이스 정기 백업

## 📞 지원

문제 발생 시:
1. `./scripts/logs.sh all` 로 로그 확인
2. `kubectl get events -n cardlet-ocr` 로 이벤트 확인
3. 상세 가이드는 `DEPLOYMENT.md` 참조

---
**⚠️ 중요**: 운영 환경에서는 반드시 시크릿 키와 데이터베이스 패스워드를 변경하세요! 