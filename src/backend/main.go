package main

import (
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/example/terraform-fargate-backend/db"
	"github.com/example/terraform-fargate-backend/models"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

// 環境変数からポート番号を取得
func getPort() string {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // デフォルト値
	}
	return port
}

// 環境変数の初期化
func initEnv() {
	env := os.Getenv("GO_ENV")
	if env == "" {
		env = "development" // デフォルトは開発環境
	}

	// Dockerコンテナ内では環境変数が直接設定されるため、ファイル読み込みをスキップする可能性も考慮
	envFile := fmt.Sprintf(".env.%s", env)
	err := godotenv.Load(envFile)
	if err != nil {
		log.Printf("警告: %s ファイルが見つかりません。環境変数が直接設定されていることを確認してください。", envFile)
	} else {
		log.Printf("環境設定を %s から読み込みました", envFile)
	}

	// 環境変数のログ出力（デバッグ用）
	logLevel := os.Getenv("LOG_LEVEL")
	if logLevel == "debug" {
		log.Println("環境変数:")
		log.Printf("ENV: %s", os.Getenv("ENV"))
		log.Printf("PORT: %s", os.Getenv("PORT"))
		log.Printf("LOG_LEVEL: %s", os.Getenv("LOG_LEVEL"))
		log.Printf("API_VERSION: %s", os.Getenv("API_VERSION"))
		log.Printf("DB_DRIVER: %s", os.Getenv("DB_DRIVER"))
		log.Printf("DB_DSN: %s", os.Getenv("DB_DSN"))
	}
}

func main() {
	// 環境変数の初期化
	initEnv()

	// Ginモードの設定
	if os.Getenv("ENV") == "production" {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}

	// データベース接続
	db.ConnectDatabase()

	// マイグレーションの実行
	db.AutoMigrateModels(&models.User{})

	// Ginルーターの初期化
	router := gin.Default()

	albHost := "http://fullstack-03-alb-463226433.ap-northeast-1.elb.amazonaws.com"

	// 許可するオリジンを設定
	var allowedOrigins []string

	// 環境変数から許可オリジンを取得
	if origins := os.Getenv("ALLOWED_ORIGINS"); origins != "" {
		// カンマ区切りで複数のオリジンを指定可能
		for _, origin := range strings.Split(origins, ",") {
			allowedOrigins = append(allowedOrigins, strings.TrimSpace(origin))
		}
	}

	// デフォルトのオリジンを追加
	if len(allowedOrigins) == 0 {
		// 開発環境用のデフォルト設定
		if os.Getenv("ENV") != "production" {
			allowedOrigins = []string{
				"http://localhost:3000",
				"http://localhost:8080",
			}
		}

		// ALB関連のオリジンを追加
		allowedOrigins = append(allowedOrigins,
			albHost,
			albHost+":3000",
			albHost+":8080")

		// IPアドレス直接アクセス用（開発環境）
		if os.Getenv("ENV") != "production" {
			allowedOrigins = append(allowedOrigins,
				"http://52.199.151.155:3000",
				"http://52.199.151.155:8080")
		}
	}

	if os.Getenv("LOG_LEVEL") == "debug" {
		log.Println("許可オリジン:")
		for _, origin := range allowedOrigins {
			log.Printf("- %s", origin)
		}
	}

	// CORSミドルウェアの設定
	router.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// APIバージョン取得
	apiVersion := os.Getenv("API_VERSION")
	if apiVersion == "" {
		apiVersion = "v1"
	}

	// ルートパスのハンドラ
	router.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "healthy",
		})
	})

	// APIエンドポイント
	api := router.Group(fmt.Sprintf("/api/%s", apiVersion))
	{
		api.GET("/hello", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"message": "hello world",
			})
		})

		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"status": "healthy",
			})
		})

		// データベース接続情報
		api.GET("/db/stats", func(c *gin.Context) {
			stats := db.GetDBStats()
			c.JSON(200, stats)
		})

		// ユーザー関連のエンドポイント
		users := api.Group("/users")
		{
			// ユーザー一覧取得
			users.GET("", func(c *gin.Context) {
				var users []models.User
				result := db.DB.Find(&users)
				if result.Error != nil {
					c.JSON(500, gin.H{"error": result.Error.Error()})
					return
				}
				c.JSON(200, users)
			})

			// 単一ユーザー取得
			users.GET("/:id", func(c *gin.Context) {
				id := c.Param("id")
				var user models.User
				result := db.DB.First(&user, id)
				if result.Error != nil {
					c.JSON(404, gin.H{"error": "ユーザーが見つかりません"})
					return
				}
				c.JSON(200, user)
			})

			// ユーザー作成
			users.POST("", func(c *gin.Context) {
				var user models.User
				if err := c.ShouldBindJSON(&user); err != nil {
					c.JSON(400, gin.H{"error": err.Error()})
					return
				}

				result := db.DB.Create(&user)
				if result.Error != nil {
					c.JSON(500, gin.H{"error": result.Error.Error()})
					return
				}

				c.JSON(201, user)
			})
		}
	}

	// サーバー起動
	port := getPort()
	log.Printf("サーバーを起動しています: http://localhost:%s", port)

	// センシティブな情報はデバッグモードでのみログ出力する
	if os.Getenv("LOG_LEVEL") == "debug" {
		log.Printf("DATABASE_URL: %s", os.Getenv("DATABASE_URL"))
		log.Printf("SECRET: %s", os.Getenv("SECRET"))
	}

	router.Run("0.0.0.0:" + port)
}
