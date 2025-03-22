.PHONY: run run-sqlite run-postgres clean

# デフォルトは現在の環境設定で実行
run:
	go run main.go

# SQLiteモードで実行
run-sqlite:
	cp .env.sqlite .env.development
	go run main.go

# PostgreSQLモードで実行
run-postgres:
	cp .env.postgres .env.development
	go run main.go

# 生成されたSQLiteファイルを削除
clean:
	rm -f *.db
	rm -f *.db-journal 