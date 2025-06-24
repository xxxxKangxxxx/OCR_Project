# 🏗️ 카카오클라우드 쿠버네티스 환경 설정 가이드

## 📋 설정 방법 선택

카카오클라우드에서 쿠버네티스를 사용하는 두 가지 방법:

### 🎯 방법 1: 관리형 쿠버네티스 서비스 (KKS) - **추천**
- ✅ 쿠버네티스 마스터 노드를 카카오클라우드가 관리
- ✅ 설정이 간단하고 운영 부담이 적음
- ✅ 자동 업데이트 및 백업 지원
- ✅ 고가용성 기본 제공

### 🔧 방법 2: VM 인스턴스에 직접 설치
- 🔨 더 많은 제어권
- 🔨 비용 절약 가능
- ❌ 설정 및 운영 복잡
- ❌ 고가용성 직접 구성 필요

---

## 🚀 방법 1: 관리형 쿠버네티스 서비스 (KKS) 설정

### 1. 카카오클라우드 콘솔 접속
```
https://console.kakaocloud.com
```

### 2. 쿠버네티스 서비스 생성

#### 2.1 서비스 선택
1. **Container** → **Kubernetes Service** 선택
2. **클러스터 생성** 클릭

#### 2.2 클러스터 기본 설정
- **클러스터 이름**: `cardlet-k8s-cluster`
- **쿠버네티스 버전**: `1.28.x` (최신 안정 버전)
- **리전**: 서울 (ap-northeast-2)
- **가용영역**: 멀티 AZ 선택 (고가용성)

#### 2.3 네트워크 설정
- **VPC**: 새로 생성 또는 기존 VPC 선택
- **서브넷**: 
  - 퍼블릭 서브넷: 로드밸런서용
  - 프라이빗 서브넷: 워커 노드용
- **보안그룹**: 기본 설정 또는 커스텀

#### 2.4 노드 그룹 설정
```yaml
노드 그룹 이름: cardlet-workers
인스턴스 타입: t3.medium (최소) 또는 t3.large (권장)
  - vCPU: 2개 이상
  - 메모리: 4GB 이상 (OCR 처리를 위해 8GB 권장)
노드 수:
  - 최소: 2개
  - 최대: 5개
  - 원하는 수: 2개
디스크: 50GB SSD
오토스케일링: 활성화
```

### 3. 클러스터 생성 후 설정

#### 3.1 kubectl 설정
```bash
# 카카오클라우드에서 kubeconfig 다운로드
# 콘솔에서 클러스터 → 연결 정보 → kubeconfig 다운로드

# kubeconfig 설정
export KUBECONFIG=/path/to/downloaded/kubeconfig
# 또는
cp /path/to/downloaded/kubeconfig ~/.kube/config

# 연결 확인
kubectl cluster-info
kubectl get nodes
```

#### 3.2 Ingress Controller 설치 (필요시)
```bash
# NGINX Ingress Controller 설치
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml

# 설치 확인
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
```

---

## 🔧 방법 2: VM 인스턴스에 직접 설치

### 1. VM 인스턴스 생성

#### 1.1 인스턴스 사양
```yaml
인스턴스 타입: t3.medium 이상
OS: Ubuntu 20.04 LTS
디스크: 50GB SSD
메모리: 4GB 이상 (8GB 권장)
vCPU: 2개 이상
```

#### 1.2 보안그룹 설정
```yaml
인바운드 규칙:
  - SSH: 22 (관리용)
  - HTTP: 80 (웹 서비스)
  - HTTPS: 443 (웹 서비스)
  - Kubernetes API: 6443
  - NodePort: 30000-32767
```

### 2. 쿠버네티스 설치

#### 2.1 자동 설치 스크립트 사용
```bash
# 생성된 스크립트 사용
chmod +x setup-k8s-vm.sh
./setup-k8s-vm.sh
```

#### 2.2 수동 설치 (단계별)
```bash
# 1. 시스템 업데이트
sudo apt-get update && sudo apt-get upgrade -y

# 2. Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 3. 쿠버네티스 설치
curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key add -
echo "deb https://apt.kubernetes.io/ kubernetes-xenial main" | sudo tee /etc/apt/sources.list.d/kubernetes.list
sudo apt-get update
sudo apt-get install -y kubelet kubeadm kubectl

# 4. 클러스터 초기화
sudo kubeadm init --pod-network-cidr=10.244.0.0/16

# 5. kubectl 설정
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# 6. 네트워크 플러그인 설치
kubectl apply -f https://raw.githubusercontent.com/coreos/flannel/master/Documentation/kube-flannel.yml
```

---

## 💰 비용 고려사항

### 관리형 쿠버네티스 (KKS)
```
클러스터 관리비: 월 약 50,000원
노드 인스턴스 비용:
  - t3.medium × 2대: 월 약 100,000원
  - t3.large × 2대: 월 약 200,000원
총 예상 비용: 월 150,000 ~ 250,000원
```

### VM 직접 설치
```
인스턴스 비용:
  - t3.medium × 2대: 월 약 100,000원
  - t3.large × 2대: 월 약 200,000원
총 예상 비용: 월 100,000 ~ 200,000원
```

---

## 🎯 권장사항

### 초보자 또는 운영 간소화를 원하는 경우
**→ 관리형 쿠버네티스 서비스 (KKS) 선택**

### 비용 절약 또는 세밀한 제어가 필요한 경우
**→ VM 직접 설치 선택**

---

## 🔍 다음 단계

1. **쿠버네티스 환경 설정 완료**
2. **kubectl 연결 확인**
3. **컨테이너 레지스트리 설정**
4. **배포 스크립트 실행**: `./deploy.sh`

---

## 📞 문제 해결

### 자주 발생하는 문제

1. **kubectl 연결 안됨**
   ```bash
   # kubeconfig 경로 확인
   echo $KUBECONFIG
   kubectl config current-context
   ```

2. **노드 상태 NotReady**
   ```bash
   # 노드 상태 확인
   kubectl describe nodes
   kubectl get pods -n kube-system
   ```

3. **Ingress 동작 안함**
   ```bash
   # Ingress Controller 확인
   kubectl get pods -n ingress-nginx
   kubectl get svc -n ingress-nginx
   ```

### 지원 문의
- 카카오클라우드 기술 지원팀
- 쿠버네티스 공식 문서
- 커뮤니티 포럼

---

**다음**: 쿠버네티스 환경이 준비되면 `KAKAO_CLOUD_DEPLOYMENT.md`를 참조하여 OCR 서비스를 배포하세요! 