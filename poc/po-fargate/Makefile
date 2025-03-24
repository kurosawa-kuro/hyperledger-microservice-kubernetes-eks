# http://54.95.158.122:3002/api-docs

.PHONY: up down build logs clean init help

# デフォルトのターゲット
help:
	@echo "使用可能なコマンド:"
	@echo "  make up        - コンテナをビルドして起動"
	@echo "  make down      - コンテナを停止して削除"
	@echo "  make build     - コンテナをビルド"
	@echo "  make logs      - コンテナのログを表示"
	@echo "  make clean     - コンテナとイメージ、ボリュームを削除"
	@echo "  make init      - データベースを初期化"

# コンテナをビルドして起動
up:
	@echo "コンテナをビルドして起動中..."
	sudo docker-compose up

up-d:
	@echo "コンテナをビルドしてバックグラウンドで起動中..."
	sudo docker-compose up -d

# コンテナを停止して削除
down:
	@echo "コンテナを停止して削除中..."
	sudo docker-compose down

# コンテナをビルド
build:
	@echo "コンテナをビルド中..."
	sudo docker-compose build

# コンテナのログを表示
logs:
	@echo "コンテナのログを表示中..."
	sudo docker-compose logs -f

# コンテナとイメージ、ボリュームを削除
clean:
	@echo "コンテナとイメージ、ボリュームを削除中..."
	sudo docker-compose down -v --rmi all

# データベースを初期化
init:
	@echo "データベースを初期化中..."
	sudo docker-compose exec app npm run init-db

setup:
	npm install

dev:
	npm run dev

docker-build:
	docker build -t kurosawakuro/poc-api-jsondb-3000 .

docker-run:
	docker run -p 3000:3000 kurosawakuro/poc-api-jsondb-3000

docker-stop:
	docker stop kurosawakuro/poc-api-jsondb-3000

docker-remove:
	docker rm kurosawakuro/poc-api-jsondb-3000

docker-logs:
	docker logs kurosawakuro/poc-api-jsondb-3000

docker-deploy-dockerhub:
	docker push kurosawakuro/poc-api-jsondb-3000:latest


# http://18.183.20.184:3333/api/health







