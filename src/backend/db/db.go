package db

import (
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DB はアプリケーション全体で使用されるデータベース接続
var DB *gorm.DB

// ConnectDatabase は環境変数に基づいてデータベースに接続する
func ConnectDatabase() {
	var err error
	driver := os.Getenv("DB_DRIVER")
	dsn := os.Getenv("DB_DSN")

	// GO_ENV=prod
	GO_ENV := os.Getenv("GO_ENV")
	log.Println("GO_ENV:", GO_ENV)

	// GO_ENV=prodの場合はDB_DRIVERをpostgresに設定
	if GO_ENV == "prod" {
		driver = "postgres"
	}

	// デフォルト値の設定
	if driver == "" {
		driver = "sqlite" // デフォルトはSQLite
		log.Println("DB_DRIVER が設定されていません。デフォルトで sqlite を使用します")
	}

	if dsn == "" {
		if driver == "sqlite" {
			dsn = "app.db" // SQLiteのデフォルトファイル名
			log.Println("DB_DSN が設定されていません。デフォルトで app.db を使用します")
		} else {
			// DB_URLがある場合はそれを使用（後方互換性のため）
			dsn = os.Getenv("DATABASE_URL")
			// if GO_ENV == "prod"の場合コンテナなので、環境変数ファイルから読み取れない
			// AWS SSMからパラムストア /app/production/DATABASE_URLを読み取りdsnに設定したい
			if GO_ENV == "prod" {
				dsn = "postgresql://dbmasteruser:dbmaster@ls-644e915cc7a6ba69ccf824a69cef04d45c847ed5.cps8g04q216q.ap-northeast-1.rds.amazonaws.com:5432/dbmaster?sslmode=require"
			}

			if dsn == "" {
				log.Fatal("PostgreSQL 使用時は DB_DSN または DATABASE_URL の設定が必要です")
			}
		}
	}

	// ロガーの設定
	logLevel := logger.Silent
	if os.Getenv("LOG_LEVEL") == "debug" {
		logLevel = logger.Info
	}

	config := &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	}

	// ドライバに基づいてデータベースに接続
	switch driver {
	case "sqlite":
		log.Printf("SQLite に接続しています: %s", dsn)
		DB, err = gorm.Open(sqlite.Open(dsn), config)
		if err != nil {
			log.Fatalf("SQLite への接続に失敗しました: %v", err)
		}

		// SQLite の設定
		sqlDB, err := DB.DB()
		if err != nil {
			log.Fatalf("SQLite DB インスタンスの取得に失敗しました: %v", err)
		}
		sqlDB.SetMaxOpenConns(1) // SQLite は同時接続数の制限があるため

	case "postgres":
		log.Printf("PostgreSQL に接続しています")
		DB, err = gorm.Open(postgres.Open(dsn), config)
		if err != nil {
			log.Fatalf("PostgreSQL への接続に失敗しました: %v", err)
		}

		// PostgreSQL の設定
		sqlDB, err := DB.DB()
		if err != nil {
			log.Fatalf("PostgreSQL DB インスタンスの取得に失敗しました: %v", err)
		}
		sqlDB.SetMaxIdleConns(10)
		sqlDB.SetMaxOpenConns(100)

	default:
		log.Fatalf("サポートされていないデータベースドライバです: %s", driver)
	}

	log.Printf("%s への接続に成功しました", driver)
}

// AutoMigrateModels は指定されたモデルのマイグレーションを実行する
func AutoMigrateModels(models ...interface{}) {
	if DB == nil {
		log.Fatal("データベース接続が初期化されていません")
	}

	err := DB.AutoMigrate(models...)
	if err != nil {
		log.Fatalf("マイグレーションに失敗しました: %v", err)
	}

	log.Println("マイグレーションが完了しました")
}

// GetDBStats はデータベース接続の統計情報を返す
func GetDBStats() map[string]interface{} {
	if DB == nil {
		return map[string]interface{}{
			"status": "not_connected",
		}
	}

	sqlDB, err := DB.DB()
	if err != nil {
		return map[string]interface{}{
			"status": "error",
			"error":  fmt.Sprintf("DB インスタンスの取得に失敗しました: %v", err),
		}
	}

	stats := sqlDB.Stats()
	return map[string]interface{}{
		"status":          "connected",
		"max_open_conns":  stats.MaxOpenConnections,
		"open_conns":      stats.OpenConnections,
		"in_use":          stats.InUse,
		"idle":            stats.Idle,
		"wait_count":      stats.WaitCount,
		"wait_duration":   stats.WaitDuration.String(),
		"max_idle_closed": stats.MaxIdleClosed,
		"max_idle_time":   stats.MaxIdleTimeClosed,
	}
}
