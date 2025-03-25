#!/bin/bash
set -eux  # エラー時は即終了 & 実行コマンド表示 & 未定義変数エラー

# -----------------------------------------------------------------------------
# ログファイルの指定: このスクリプトの標準出力 & 標準エラーをファイルにも記録
# -----------------------------------------------------------------------------
LOGFILE="/var/log/setup-env.log"
exec > >(tee -a "$LOGFILE") 2>&1

#===============================================================================
# 1. システムアップデート
#===============================================================================
echo "[Step 1] システムアップデート (dnf update)"
sudo dnf update -y

#===============================================================================
# 2. swapファイル確認 & 作成 (既存があればスキップ)
#===============================================================================
echo "[Step 2] swapファイル作成 or スキップ"

SWAP_FILE="/swapfile"
SWAP_SIZE_MB=2048

if [ -f "$SWAP_FILE" ]; then
    echo "[INFO] /swapfile が既に存在します。新規作成はスキップします。"
else
    echo "[INFO] /swapfile が存在しないため新規作成します。サイズ: ${SWAP_SIZE_MB}MB"
    sudo dd if=/dev/zero of="$SWAP_FILE" bs=1M count="$SWAP_SIZE_MB" status=progress
    sudo chmod 600 "$SWAP_FILE"
    sudo mkswap "$SWAP_FILE"
    sudo swapon "$SWAP_FILE"

    # /etc/fstabに登録（重複を避けるためチェック）
    if ! grep -q "$SWAP_FILE" /etc/fstab; then
      echo "$SWAP_FILE none swap sw 0 0" | sudo tee -a /etc/fstab
    fi
fi

#===============================================================================
# 3. 開発ツール (Dev Tools) + Python(venv), etc.
#===============================================================================
echo "[Step 3] 開発ツール & Pythonインストール"

# - Development Toolsグループ
# - python3, python3-pip, python3-devel, openssl-devel, libffi-devel など
sudo dnf groupinstall -y "Development Tools"
sudo dnf install -y \
    git make wget tar which \
    python3 python3-pip python3-devel \
    openssl-devel libffi-devel

#===============================================================================
# 4. AWS CLI
#===============================================================================
echo "[Step 4] AWS CLIインストール"
sudo dnf install -y awscli

#===============================================================================
# 5. Docker
#===============================================================================
echo "[Step 5] Dockerインストール"
sudo dnf install -y docker
sudo systemctl enable docker
sudo systemctl start docker
# docker グループに ec2-user を追加
sudo usermod -aG docker ec2-user

#===============================================================================
# 5.1 Docker Compose
#===============================================================================
echo "[Step 5.1] Docker Compose (v2 plugin) をインストール"
sudo dnf install -y docker-compose-plugin
docker compose version

#===============================================================================
# 6. Go (v1.20.3)
#===============================================================================
echo "[Step 6] Goインストール"

GO_VERSION="1.20.3"
curl -LO "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz"
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf "go${GO_VERSION}.linux-amd64.tar.gz"
rm -f "go${GO_VERSION}.linux-amd64.tar.gz"

# 環境変数設定
sudo tee /etc/profile.d/go.sh >/dev/null <<EOF
export GOROOT=/usr/local/go
export GOPATH=\$HOME/go
export PATH=\$PATH:\$GOROOT/bin:\$GOPATH/bin
EOF
sudo chmod 644 /etc/profile.d/go.sh

sudo mkdir -p /home/ec2-user/go
sudo chown -R ec2-user:ec2-user /home/ec2-user/go

#===============================================================================
# 7. Node.js (v18) + nvm (ec2-user用)
#===============================================================================
echo "[Step 7] Node.js (v18) + nvmインストール"

sudo su - ec2-user -c "
  set -e
  echo '[nvm] インストールスクリプトを実行します'
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash

  if ! grep -q 'NVM_DIR' ~/.bashrc; then
    cat <<EOT >> ~/.bashrc

export NVM_DIR=\"\$HOME/.nvm\"
[ -s \"\$NVM_DIR/nvm.sh\" ] && \\. \"\$NVM_DIR/nvm.sh\"
[ -s \"\$NVM_DIR/bash_completion\" ] && \\. \"\$NVM_DIR/bash_completion\" 
EOT
  fi

  source ~/.bashrc
  echo '[nvm] Node.js v18 をインストールします'
  nvm install 18
  nvm alias default 18
  echo '[nvm] インストール完了: Node.js ' \$(node -v)
"

#===============================================================================
# 8. Rust (dnf経由)
#===============================================================================
echo "[Step 8] Rustインストール (rust + cargo)"
sudo dnf install -y rust cargo

#===============================================================================
# 9. Terraform (手動)
#===============================================================================
echo "[Step 9] Terraformインストール (手動ダウンロード)"

TF_VERSION="1.4.6"

# zip解凍に使う
sudo dnf install -y unzip

cd /tmp
curl -LO "https://releases.hashicorp.com/terraform/${TF_VERSION}/terraform_${TF_VERSION}_linux_amd64.zip"
unzip "terraform_${TF_VERSION}_linux_amd64.zip"

sudo mv terraform /usr/local/bin/
sudo chmod +x /usr/local/bin/terraform

# バージョン確認用
echo "Terraform version: $(terraform -version | head -n1)"

#===============================================================================
# 終了メッセージ
#===============================================================================
echo "===== セットアップ完了！ ====="
echo "Docker, Docker Compose, Go, AWS CLI, Node.js (v18 via nvm), Rust, Python3, Terraform などのインストールが完了しました。"
echo "すべてのログは ${LOGFILE} に記録されています。"
echo "※ ec2-userで再ログイン or 'sudo su - ec2-user' → 'source ~/.bashrc' でnvm/nodeが使えます。"
