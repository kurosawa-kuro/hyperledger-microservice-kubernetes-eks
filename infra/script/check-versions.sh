#!/bin/bash

# エラー処理の設定
set -euo pipefail
trap 'echo "エラーが発生しました: $?" >&2' ERR

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

check_command() {
    command -v "$1" &>/dev/null
}

check_versions() {
    log "インストール済みのコンポーネントバージョンを確認します..."

    #--------------------------------------------
    # Git
    #--------------------------------------------
    if check_command git; then
        log "Git version: $(git --version)"
    else
        log "Git: Not installed"
    fi

    #--------------------------------------------
    # Make
    #--------------------------------------------
    if check_command make; then
        log "Make version: $(make --version | head -n1)"
    else
        log "Make: Not installed"
    fi

    #--------------------------------------------
    # Docker
    #--------------------------------------------
    if check_command docker; then
        log "Docker version: $(docker --version)"
    else
        log "Docker: Not installed"
    fi

    #--------------------------------------------
    # Docker Compose
    #--------------------------------------------
    if check_command docker-compose; then
        log "Docker Compose version: $(docker-compose --version)"
    else
        log "Docker Compose: Not installed"
    fi

    #--------------------------------------------
    # Node.js
    #--------------------------------------------
    # Node.jsバージョンチェック部分で追加
    if check_command node; then
        log "Node.js version: $(node -v)"
        log "npm version: $(npm -v)"

        # nvm は ~/... で定義されているかもしれないので試しに読み込む
        if [ -s "/home/ec2-user/.nvm/nvm.sh" ]; then
        # nvm.sh が存在すれば読み込んで nvm --version を取得
        . "/home/ec2-user/.nvm/nvm.sh"
        log "nvm version: $(nvm --version)"
        else
        log "nvm: Not found in /home/ec2-user/.nvm/nvm.sh"
        fi
    else
        log "Node.js: Not installed"
    fi

    #--------------------------------------------
    # PostgreSQL
    #--------------------------------------------
    if check_command psql; then
        log "PostgreSQL version: $(psql --version)"
    else
        log "PostgreSQL: Not installed"
    fi

    #--------------------------------------------
    # Go
    #--------------------------------------------
    if check_command go; then
        log "Go version: $(go version)"
        log "Go environment:"
        log "  GOROOT: ${GOROOT:-Not set}"
        log "  GOPATH: ${GOPATH:-Not set}"
    else
        log "Go: Not installed"
    fi

    #--------------------------------------------
    # Python3
    #--------------------------------------------
    if check_command python3; then
        log "Python version: $(python3 --version 2>&1)"
    else
        log "Python3: Not installed"
    fi

    #--------------------------------------------
    # pip3
    #--------------------------------------------
    if check_command pip3; then
        log "pip version: $(pip3 --version)"
    else
        log "pip3: Not installed"
    fi

    #--------------------------------------------
    # Rust
    #--------------------------------------------
    if check_command rustc; then
        log "Rust version: $(rustc --version)"
    else
        log "Rust: Not installed"
    fi

    #--------------------------------------------
    # cargo
    #--------------------------------------------
    if check_command cargo; then
        log "Cargo version: $(cargo --version)"
    else
        log "Cargo: Not installed"
    fi

    #--------------------------------------------
    # AWS CLI
    #--------------------------------------------
    if check_command aws; then
        # aws --version の出力はstderrなので 2>&1 を追加
        log "AWS CLI version: $(aws --version 2>&1)"
    else
        log "AWS CLI: Not installed"
    fi

    #--------------------------------------------
    # Terraform
    #--------------------------------------------
    if check_command terraform; then
        log "Terraform version: $(terraform --version | head -n1)"
    else
        log "Terraform: Not installed"
    fi
}

# メイン実行
check_versions
