package main

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	cognito "github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider"
	cognitoTypes "github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider/types"
	"github.com/example/terraform-fargate-backend/db"
	"github.com/example/terraform-fargate-backend/models"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
)

// Cognitoクライアント
var cognitoClient *cognito.Client
var userPoolID string
var clientID string
var clientSecret string

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

// initCognito はCognitoクライアントを初期化します
func initCognito() error {
	// Cognito設定の読み込み
	region := "ap-northeast-1"
	if region == "" {
		region = "ap-northeast-1" // デフォルト値
	}

	userPoolID = "ap-northeast-1_1lWKl11yc"
	clientID = "5haf5l3h5kkqkt1dnaq3mb2h6n"
	clientSecret = "gkqljpr4b0v2911mmuj087kqrhn80kikgoj6klht6pah7ojmdd7"

	// AWS SDK設定の初期化
	cfg, err := config.LoadDefaultConfig(context.TODO(), config.WithRegion(region))
	if err != nil {
		return fmt.Errorf("AWS SDKの設定エラー: %w", err)
	}

	// Cognitoクライアントの作成
	cognitoClient = cognito.NewFromConfig(cfg)

	return nil
}

// getSecretHash はCognitoのSECRET_HASHを計算します
func getSecretHash(username string) string {
	mac := hmac.New(sha256.New, []byte(clientSecret))
	mac.Write([]byte(username + clientID))
	return base64.StdEncoding.EncodeToString(mac.Sum(nil))
}

// JWTClaims はJWTトークンのクレーム
type JWTClaims struct {
	Email string `json:"email"`
	jwt.RegisteredClaims
}

// authMiddleware は認証ミドルウェア
func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 認証トークンの取得
		var token string
		// まずCookieから取得を試行
		idToken, err := c.Cookie("id_token")
		if err == nil {
			token = idToken
		} else {
			// Cookieになければ、Authorizationヘッダから取得
			authHeader := c.GetHeader("Authorization")
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				token = parts[1]
			}
		}

		// トークンなしの場合は未認証
		if token == "" {
			c.JSON(401, gin.H{"error": "認証が必要です"})
			c.Abort()
			return
		}

		// TODO: JWTの検証を実装（本番環境では必須）
		// ここではトークンの有無のみをチェックして簡略化

		// 認証成功、次のハンドラへ
		c.Next()
	}
}

// 本格的なCognito JWTトークン検証（オプション）
// https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html
func verifyCognitoJWT(tokenString string) (*jwt.Token, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// アルゴリズムの検証
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("予期しない署名方式: %v", token.Header["alg"])
		}

		// JWKs（JSON Web Key Set）からキーを取得する実装が必要
		// 簡易実装のため、ここではスキップ
		return nil, nil // 実際の実装では公開鍵を返す
	})

	if err != nil {
		return nil, err
	}

	// クレームの検証
	if claims, ok := token.Claims.(jwt.MapClaims); ok {
		// 有効期限の検証
		exp, ok := claims["exp"].(float64)
		if !ok {
			return nil, fmt.Errorf("有効期限が見つかりません")
		}
		if time.Now().Unix() > int64(exp) {
			return nil, fmt.Errorf("トークンの有効期限が切れています")
		}

		// 発行者の検証
		iss, ok := claims["iss"].(string)
		if !ok {
			return nil, fmt.Errorf("発行者が見つかりません")
		}
		expectedIss := fmt.Sprintf("https://cognito-idp.%s.amazonaws.com/%s", os.Getenv("COGNITO_REGION"), userPoolID)
		if iss != expectedIss {
			return nil, fmt.Errorf("不正な発行者です")
		}

		// クライアントIDの検証
		audience, ok := claims["aud"].(string)
		if !ok {
			return nil, fmt.Errorf("対象者が見つかりません")
		}
		if audience != clientID {
			return nil, fmt.Errorf("不正なクライアントIDです")
		}

		// トークンの用途検証
		tokenUse, ok := claims["token_use"].(string)
		if !ok {
			return nil, fmt.Errorf("トークンの用途が見つかりません")
		}
		if tokenUse != "id" && tokenUse != "access" {
			return nil, fmt.Errorf("不正なトークン用途です: %s", tokenUse)
		}

		return token, nil
	}

	return nil, fmt.Errorf("トークンクレームの取得に失敗しました")
}

// registerHandler はユーザー登録を処理します
func registerHandler(c *gin.Context) {
	var req models.AuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "入力データが不正です", "details": err.Error()})
		return
	}

	// SECRET_HASHの計算
	secretHash := getSecretHash(req.Email)

	// Cognitoでユーザー登録
	_, err := cognitoClient.SignUp(context.TODO(), &cognito.SignUpInput{
		ClientId:   aws.String(clientID),
		Username:   aws.String(req.Email),
		Password:   aws.String(req.Password),
		SecretHash: aws.String(secretHash),
		UserAttributes: []cognitoTypes.AttributeType{
			{
				Name:  aws.String("email"),
				Value: aws.String(req.Email),
			},
			{
				Name:  aws.String("name"),
				Value: aws.String(req.Name),
			},
		},
	})

	if err != nil {
		c.JSON(400, gin.H{"error": "ユーザー登録に失敗しました", "details": err.Error()})
		return
	}

	// Cognitoからsubを取得
	adminUser, err := cognitoClient.AdminGetUser(context.TODO(), &cognito.AdminGetUserInput{
		UserPoolId: aws.String(userPoolID),
		Username:   aws.String(req.Email),
	})
	if err != nil {
		log.Printf("Cognitoからsubの取得に失敗: %v", err)
		c.JSON(500, gin.H{"error": "ユーザー情報取得失敗", "details": err.Error()})
		return
	}

	var cognitoSub string
	for _, attr := range adminUser.UserAttributes {
		if *attr.Name == "sub" {
			cognitoSub = *attr.Value
			break
		}
	}
	if cognitoSub == "" {
		log.Printf("警告: Cognitoからsubが取得できませんでした (email=%s)", req.Email)
		c.JSON(500, gin.H{"error": "Cognitoからsubが取得できませんでした"})
		return
	}

	// ユーザーをDBにも保存する前に既存レコードチェック
	var exists bool
	err = db.DB.Model(&models.User{}).Select("count(*) > 0").
		Where("email = ? OR cognito_sub = ?", req.Email, cognitoSub).
		Find(&exists).Error
	if err != nil {
		c.JSON(500, gin.H{"error": "DBエラー", "details": err.Error()})
		return
	}

	// 既に存在する場合は成功として処理
	if exists {
		log.Printf("既に登録済みのユーザー（email=%s, sub=%s）→ スキップ", req.Email, cognitoSub)
		c.JSON(200, gin.H{"message": "ユーザー登録が完了しました。メールを確認して確認コードを入力してください。"})
		return
	}

	// 新規ユーザーをDBに保存
	user := models.User{
		Email:      req.Email,
		Name:       req.Name,
		Role:       "user",
		CognitoSub: cognitoSub, // Cognitoから取得したsubを設定
	}

	log.Printf("DB登録予定: Email=%s, Sub=%s", user.Email, user.CognitoSub)
	result := db.DB.Create(&user)
	log.Printf("DB結果: RowsAffected=%d, Error=%v", result.RowsAffected, result.Error)

	if result.Error != nil {
		// 万が一の重複エラーもハンドリング（並行リクエスト対策）
		if strings.Contains(result.Error.Error(), "duplicate key") {
			log.Printf("並行処理による重複登録（email=%s, sub=%s）→ スキップ", req.Email, cognitoSub)
			c.JSON(200, gin.H{"message": "ユーザー登録が完了しました。メールを確認して確認コードを入力してください。"})
			return
		}
		c.JSON(500, gin.H{"error": "データベースエラー", "details": result.Error.Error()})
		return
	}

	c.JSON(201, gin.H{"message": "ユーザー登録が完了しました。メールを確認して確認コードを入力してください。"})
}

// confirmRegistrationHandler は登録確認コードを処理します
func confirmRegistrationHandler(c *gin.Context) {
	type ConfirmRequest struct {
		Email            string `json:"email" binding:"required,email"`
		ConfirmationCode string `json:"confirmation_code" binding:"required"`
	}

	var req ConfirmRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "入力データが不正です", "details": err.Error()})
		return
	}

	// SECRET_HASHの計算
	secretHash := getSecretHash(req.Email)

	// Cognito確認コードの検証
	_, err := cognitoClient.ConfirmSignUp(context.TODO(), &cognito.ConfirmSignUpInput{
		ClientId:         aws.String(clientID),
		Username:         aws.String(req.Email),
		ConfirmationCode: aws.String(req.ConfirmationCode),
		SecretHash:       aws.String(secretHash),
	})

	if err != nil {
		c.JSON(400, gin.H{"error": "確認コードの検証に失敗しました", "details": err.Error()})
		return
	}

	c.JSON(200, gin.H{"message": "ユーザー登録が確認されました。ログインしてください。"})
}

// loginHandler はユーザーログインを処理します
func loginHandler(c *gin.Context) {
	var req models.AuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "入力データが不正です", "details": err.Error()})
		return
	}

	// SECRET_HASHの計算
	secretHash := getSecretHash(req.Email)

	// Cognitoでログイン認証
	resp, err := cognitoClient.InitiateAuth(context.TODO(), &cognito.InitiateAuthInput{
		AuthFlow: cognitoTypes.AuthFlowTypeUserPasswordAuth,
		ClientId: aws.String(clientID),
		AuthParameters: map[string]string{
			"USERNAME":    req.Email,
			"PASSWORD":    req.Password,
			"SECRET_HASH": secretHash,
		},
	})

	if err != nil {
		c.JSON(401, gin.H{"error": "ログインに失敗しました", "details": err.Error()})
		return
	}

	// トークンをクッキーに設定
	if resp.AuthenticationResult != nil {
		if resp.AuthenticationResult.IdToken != nil {
			c.SetCookie("id_token", *resp.AuthenticationResult.IdToken, 3600, "/", "", false, true)
		}
		if resp.AuthenticationResult.AccessToken != nil {
			c.SetCookie("access_token", *resp.AuthenticationResult.AccessToken, 3600, "/", "", false, true)
		}
		if resp.AuthenticationResult.RefreshToken != nil {
			c.SetCookie("refresh_token", *resp.AuthenticationResult.RefreshToken, 86400*30, "/", "", false, true)
		}

		// レスポンスを構築
		authResponse := models.AuthResponse{
			TokenType: "Bearer",
			Message:   "ログインに成功しました",
		}

		// セキュリティのため、トークンは直接JSONで返さない（クッキーのみで送信）
		c.JSON(200, authResponse)
	} else {
		c.JSON(500, gin.H{"error": "認証トークンが取得できませんでした"})
	}
}

// logoutHandler はユーザーログアウトを処理します
func logoutHandler(c *gin.Context) {
	// トークンをクッキーから削除
	c.SetCookie("access_token", "", -1, "/", "", false, true)
	c.SetCookie("id_token", "", -1, "/", "", false, true)
	c.SetCookie("refresh_token", "", -1, "/", "", false, true)

	c.JSON(200, gin.H{"message": "ログアウトしました"})
}

// refreshTokenHandler はトークンの更新を処理します
func refreshTokenHandler(c *gin.Context) {
	// リフレッシュトークンをクッキーから取得
	refreshToken, err := c.Cookie("refresh_token")
	if err != nil {
		c.JSON(401, gin.H{"error": "リフレッシュトークンが見つかりません"})
		return
	}

	// ユーザー名（メール）もリクエストから取得
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "メールアドレスが必要です", "details": err.Error()})
		return
	}

	// SECRET_HASHの計算
	secretHash := getSecretHash(req.Email)

	// Cognitoでトークンを更新
	resp, err := cognitoClient.InitiateAuth(context.TODO(), &cognito.InitiateAuthInput{
		AuthFlow: cognitoTypes.AuthFlowTypeRefreshTokenAuth,
		ClientId: aws.String(clientID),
		AuthParameters: map[string]string{
			"REFRESH_TOKEN": refreshToken,
			"SECRET_HASH":   secretHash,
		},
	})

	if err != nil {
		c.JSON(401, gin.H{"error": "トークンの更新に失敗しました", "details": err.Error()})
		return
	}

	// 新しいトークンをクッキーに設定
	if resp.AuthenticationResult != nil {
		if resp.AuthenticationResult.IdToken != nil {
			c.SetCookie("id_token", *resp.AuthenticationResult.IdToken, 3600, "/", "", false, true)
		}
		if resp.AuthenticationResult.AccessToken != nil {
			c.SetCookie("access_token", *resp.AuthenticationResult.AccessToken, 3600, "/", "", false, true)
		}

		c.JSON(200, gin.H{"message": "トークンが更新されました"})
	} else {
		c.JSON(500, gin.H{"error": "認証トークンが取得できませんでした"})
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

	// Cognitoの初期化
	if err := initCognito(); err != nil {
		log.Fatalf("Cognito初期化エラー: %v", err)
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

		// 認証関連のエンドポイント
		auth := api.Group("/auth")
		{
			auth.POST("/register", registerHandler)
			auth.POST("/confirm", confirmRegistrationHandler)
			auth.POST("/login", loginHandler)
			auth.POST("/logout", logoutHandler)
			auth.POST("/refresh", refreshTokenHandler)
		}

		// 保護されたエンドポイント（認証が必要）
		protected := api.Group("")
		protected.Use(authMiddleware())
		{
			// プロフィール情報
			protected.GET("/profile", func(c *gin.Context) {
				// IDトークンからユーザー情報を取得（簡易実装）
				// 実際の実装ではトークンを検証し、クレームからユーザー情報を取得する
				token, _ := c.Cookie("id_token")

				// ここでは簡易的にユーザーメールを返す
				// 本番環境では、JWTを検証してクレームからデータを取得する
				c.JSON(200, gin.H{
					"message":      "認証が必要なエンドポイントにアクセスしました",
					"token_length": len(token),
				})
			})
		}

		// ユーザー関連のエンドポイント
		users := api.Group("/users")
		users.Use(authMiddleware()) // 認証が必要
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
		log.Printf("COGNITO_USER_POOL_ID: %s", userPoolID)
		log.Printf("COGNITO_CLIENT_ID: %s", clientID)
	}

	router.Run("0.0.0.0:" + port)
}
