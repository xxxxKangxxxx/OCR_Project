#!/bin/bash

# 카카오클라우드 VM에서 쿠버네티스 설치 스크립트
# Ubuntu 20.04 LTS 기준

echo "🚀 카카오클라우드 VM에서 쿠버네티스 설치 시작..."

# 시스템 업데이트
sudo apt-get update && sudo apt-get upgrade -y

# Docker 설치
echo "🐳 Docker 설치 중..."
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

# Docker 서비스 시작
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# 쿠버네티스 설치
echo "☸️ 쿠버네티스 설치 중..."
curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key add -
echo "deb https://apt.kubernetes.io/ kubernetes-xenial main" | sudo tee /etc/apt/sources.list.d/kubernetes.list
sudo apt-get update
sudo apt-get install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl

# swap 비활성화 (쿠버네티스 요구사항)
sudo swapoff -a
sudo sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab

# containerd 설정
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
sudo systemctl restart containerd

# 쿠버네티스 클러스터 초기화 (마스터 노드인 경우)
echo "🎯 쿠버네티스 클러스터 초기화..."
echo "다음 명령어를 실행하여 클러스터를 초기화하세요:"
echo "sudo kubeadm init --pod-network-cidr=10.244.0.0/16"
echo ""
echo "초기화 후 다음 명령어들을 실행하세요:"
echo "mkdir -p \$HOME/.kube"
echo "sudo cp -i /etc/kubernetes/admin.conf \$HOME/.kube/config"
echo "sudo chown \$(id -u):\$(id -g) \$HOME/.kube/config"
echo ""
echo "네트워크 플러그인 설치 (Flannel):"
echo "kubectl apply -f https://raw.githubusercontent.com/coreos/flannel/master/Documentation/kube-flannel.yml"
echo ""
echo "✅ 설치 완료! 재부팅 후 사용하세요." 