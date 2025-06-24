# 🚀 Cardlet OCR 서비스 - 카카오클라우드 쿠버네티스 배포 가이드

## 📋 개요

이 가이드는 Cardlet OCR 서비스를 카카오클라우드 쿠버네티스에 배포하는 방법을 설명합니다.

## 🏗️ 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │    MongoDB      │
│   (React)       │    │   (FastAPI)     │    │   (Database)    │
│   Port: 80      │    │   Port: 8000    │    │   Port: 27017   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │     Ingress     │
                    │  (Load Balancer)│
                    └─────────────────┘
```

## 🛠️ 사전 준비사항

### 1. 필수 도구 설치

```bash
# kubectl 설치 (카카오클라우드 클러스터 접근용)
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/darwin/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Docker 설치 (이미지 빌드용)
# https://docs.docker.com/desktop/install/mac-install/

# 카카오클라우드 CLI 설치 (선택사항)
# https://cloud.kakao.com/docs/getting-started/cli
```

### 2. 카카오클라우드 설정

1. **쿠버네티스 클러스터 생성**
   - 카카오클라우드 콘솔에서 쿠버네티스 클러스터 생성
   - 노드 그룹 설정 (최소 2개 노드 권장)

2. **kubectl 설정**
   ```bash
   # 카카오클라우드에서 제공하는 kubeconfig 다운로드
   # kubectl 컨텍스트 설정
   kubectl config use-context your-kakao-cluster
   ```

3. **컨테이너 레지스트리 설정**
   - 카카오클라우드 Container Registry 또는 Docker Hub 사용
   - 레지스트리 인증 정보 설정

## 🚀 배포 과정

### 1. 프로젝트 클론 및 설정

```bash
# 프로젝트 디렉토리로 이동
cd /path/to/your/OCR_Project

# 배포 스크립트 실행 권한 부여
chmod +x deploy.sh
```

### 2. 환경 설정

#### 2.1 레지스트리 설정
`deploy.sh` 파일에서 레지스트리 정보 수정:
```bash
REGISTRY="your-registry-url"  # 예: kr.kakaocloud.com/your-project/cardlet
```

#### 2.2 도메인 설정
`k8s/ingress.yaml` 파일에서 도메인 수정:
```yaml
- host: cardlet.your-domain.com  # 실제 도메인으로 변경
```

#### 2.3 시크릿 키 설정
`k8s/secrets.yaml` 파일에서 JWT 시크릿 키 변경:
```bash
# 새로운 시크릿 키 생성
echo -n "your-new-super-secret-key" | base64
```

### 3. 배포 실행

```bash
# 전체 배포 실행
./deploy.sh

# 특정 태그로 배포
./deploy.sh v1.0.0
```

### 4. 배포 확인

```bash
# 팟 상태 확인
kubectl get pods -n cardlet-ocr

# 서비스 상태 확인
kubectl get services -n cardlet-ocr

# Ingress 상태 확인
kubectl get ingress -n cardlet-ocr

# 로그 확인
kubectl logs -f deployment/backend -n cardlet-ocr
kubectl logs -f deployment/frontend -n cardlet-ocr
```

## 🔧 로컬 개발 및 테스트

### Docker Compose 사용

```bash
# 로컬에서 전체 스택 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 서비스 중지
docker-compose down
```

### 개별 서비스 테스트

```bash
# 백엔드만 빌드 및 실행
docker build -f Dockerfile.backend -t cardlet-backend .
docker run -p 8000:8000 cardlet-backend

# 프론트엔드만 빌드 및 실행
docker build -f Dockerfile.frontend -t cardlet-frontend .
docker run -p 80:80 cardlet-frontend
```

## 🔍 트러블슈팅

### 자주 발생하는 문제들

#### 1. 이미지 빌드 실패
```bash
# 빌드 로그 확인
docker build -f Dockerfile.backend -t test-backend . --no-cache

# 의존성 문제 해결
pip install -r backend/requirements.txt
```

#### 2. 팟이 시작되지 않음
```bash
# 팟 상세 정보 확인
kubectl describe pod <pod-name> -n cardlet-ocr

# 이벤트 확인
kubectl get events -n cardlet-ocr --sort-by=.metadata.creationTimestamp
```

#### 3. 서비스 연결 문제
```bash
# 서비스 엔드포인트 확인
kubectl get endpoints -n cardlet-ocr

# 포트 포워딩으로 직접 접근 테스트
kubectl port-forward service/backend-service 8000:8000 -n cardlet-ocr
```

#### 4. MongoDB 연결 문제
```bash
# MongoDB 팟 로그 확인
kubectl logs deployment/mongodb -n cardlet-ocr

# MongoDB 서비스 확인
kubectl exec -it deployment/mongodb -n cardlet-ocr -- mongo --eval "db.runCommand('ping')"
```

## 📊 모니터링 및 관리

### 유용한 명령어

```bash
# 리소스 사용량 확인
kubectl top pods -n cardlet-ocr
kubectl top nodes

# 스케일링
kubectl scale deployment backend --replicas=3 -n cardlet-ocr
kubectl scale deployment frontend --replicas=3 -n cardlet-ocr

# 롤링 업데이트
kubectl set image deployment/backend backend=new-image:tag -n cardlet-ocr

# 설정 업데이트
kubectl apply -f k8s/configmap.yaml
kubectl rollout restart deployment/backend -n cardlet-ocr
```

### 백업 및 복구

```bash
# MongoDB 데이터 백업
kubectl exec deployment/mongodb -n cardlet-ocr -- mongodump --out /tmp/backup

# 백업 파일 로컬로 복사
kubectl cp cardlet-ocr/mongodb-pod:/tmp/backup ./mongodb-backup
```

## 🔒 보안 고려사항

1. **시크릿 관리**
   - JWT 시크릿 키를 강력하게 설정
   - 데이터베이스 패스워드 변경
   - 정기적인 시크릿 로테이션

2. **네트워크 보안**
   - 네트워크 정책 설정
   - TLS/SSL 인증서 적용
   - 방화벽 규칙 설정

3. **접근 제어**
   - RBAC 설정
   - 서비스 계정 관리
   - 팟 보안 정책

## 📈 성능 최적화

1. **리소스 조정**
   - CPU/메모리 요청량 및 제한량 조정
   - HPA (Horizontal Pod Autoscaler) 설정

2. **캐싱**
   - Redis 캐시 추가 고려
   - CDN 사용 검토

3. **데이터베이스 최적화**
   - MongoDB 인덱스 최적화
   - 연결 풀 설정

## 🆘 지원 및 문의

문제가 발생하거나 도움이 필요한 경우:

1. 로그 수집 후 분석
2. 카카오클라우드 기술 지원팀 문의
3. 쿠버네티스 공식 문서 참조

---

**주의사항**: 
- 실제 운영 환경에서는 보안 설정을 강화해야 합니다.
- 정기적인 백업과 모니터링을 설정하세요.
- 리소스 사용량을 지속적으로 모니터링하세요. 