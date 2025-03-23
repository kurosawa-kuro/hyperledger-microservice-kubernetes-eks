package main

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"errors"
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
	"gorm.io/gorm"
)

// Constants for configuration
const (
	defaultPort       = "8080"
	defaultAPIVersion = "v1"
	defaultRegion     = "ap-northeast-1"
	tokenExpiration   = 3600       // 1 hour in seconds
	refreshExpiration = 86400 * 30 // 30 days in seconds
	defaultEnv        = "development"
)

// APIレスポンスのHTTPステータスコード
const (
	StatusOK           = 200
	StatusCreated      = 201
	StatusBadRequest   = 400
	StatusUnauthorized = 401
	StatusNotFound     = 404
	StatusServerError  = 500
)

// エラー定義
var (
	ErrInvalidInput     = "入力データが不正です"
	ErrDatabaseError    = "データベースエラー"
	ErrAuthRequired     = "認証が必要です"
	ErrUserNotFound     = "ユーザーが見つかりません"
	ErrTokenNotFound    = "トークンが見つかりません"
	ErrTokenFetchFailed = "認証トークンが取得できませんでした"
)

// Global variables
var (
	// Cognito configuration
	cognitoClient *cognito.Client
	userPoolID    string
	clientID      string
	clientSecret  string

	// Environment
	albHost = "http://fullstack-03-alb-463226433.ap-northeast-1.elb.amazonaws.com"
)

// JWTClaims はJWTトークンのクレーム
type JWTClaims struct {
	Email string `json:"email"`
	jwt.RegisteredClaims
}

// Config represents application configuration
type Config struct {
	Env            string
	Port           string
	LogLevel       string
	APIVersion     string
	AllowedOrigins []string
	CognitoRegion  string
}

//
// Utility functions
//

// 環境変数からポート番号を取得
func getPort() string {
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}
	return port
}

// errorResponse はJSONエラーレスポンスを送信します
func errorResponse(c *gin.Context, status int, message string, details ...string) {
	resp := gin.H{"error": message}
	if len(details) > 0 && details[0] != "" {
		resp["details"] = details[0]
	}
	c.JSON(status, resp)
}

// successResponse はJSON成功レスポンスを送信します
func successResponse(c *gin.Context, status int, data gin.H) {
	c.JSON(status, data)
}

//
// 初期化関連の関数
//

// 環境変数の初期化
func initEnv() *Config {
	env := os.Getenv("GO_ENV")
	if env == "" {
		env = defaultEnv
	}

	// Dockerコンテナ内では環境変数が直接設定されるため、ファイル読み込みをスキップする可能性も考慮
	envFile := fmt.Sprintf(".env.%s", env)
	err := godotenv.Load(envFile)
	if err != nil {
		log.Printf("警告: %s ファイルが見つかりません。環境変数が直接設定されていることを確認してください。", envFile)
	} else {
		log.Printf("環境設定を %s から読み込みました", envFile)
	}

	region := os.Getenv("COGNITO_REGION")
	if region == "" {
		region = defaultRegion
	}

	config := &Config{
		Env:           os.Getenv("ENV"),
		Port:          getPort(),
		LogLevel:      os.Getenv("LOG_LEVEL"),
		APIVersion:    os.Getenv("API_VERSION"),
		CognitoRegion: region,
	}

	if config.APIVersion == "" {
		config.APIVersion = defaultAPIVersion
	}

	// 環境変数のログ出力（デバッグ用）
	if config.LogLevel == "debug" {
		log.Println("環境変数:")
		log.Printf("ENV: %s", config.Env)
		log.Printf("PORT: %s", config.Port)
		log.Printf("LOG_LEVEL: %s", config.LogLevel)
		log.Printf("API_VERSION: %s", config.APIVersion)
		log.Printf("COGNITO_REGION: %s", config.CognitoRegion)
		log.Printf("DB_DRIVER: %s", os.Getenv("DB_DRIVER"))
		log.Printf("DB_DSN: %s", os.Getenv("DB_DSN"))
	}

	return config
}

// initCognito はCognitoクライアントを初期化します
func initCognito(cfg *Config) error {
	// Cognito設定の読み込み
	userPoolID = os.Getenv("COGNITO_USER_POOL_ID")
	clientID = os.Getenv("COGNITO_CLIENT_ID")
	clientSecret = os.Getenv("COGNITO_CLIENT_SECRET")

	// 明示的に認証情報を設定
	awsAccessKey := os.Getenv("AWS_ACCESS_KEY_ID")
	awsSecretKey := os.Getenv("AWS_SECRET_ACCESS_KEY")

	var awsCfg aws.Config
	var err error

	if awsAccessKey != "" && awsSecretKey != "" {
		// 静的認証情報を使用
		log.Println("AWS静的認証情報を使用します")
		awsCfg, err = config.LoadDefaultConfig(context.TODO(),
			config.WithRegion(cfg.CognitoRegion),
			config.WithCredentialsProvider(aws.CredentialsProviderFunc(
				func(ctx context.Context) (aws.Credentials, error) {
					return aws.Credentials{
						AccessKeyID:     awsAccessKey,
						SecretAccessKey: awsSecretKey,
					}, nil
				},
			)),
		)
	} else {
		// デフォルト認証プロバイダーチェーンを使用
		log.Println("AWSデフォルト認証チェーンを使用します")
		awsCfg, err = config.LoadDefaultConfig(context.TODO(), config.WithRegion(cfg.CognitoRegion))
	}

	if err != nil {
		return fmt.Errorf("AWS SDKの設定エラー: %w", err)
	}

	// Cognitoクライアントの作成
	cognitoClient = cognito.NewFromConfig(awsCfg)

	return nil
}

// getAllowedOrigins はCORS許可オリジンリストを取得します
func getAllowedOrigins(env string) []string {
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
		if env != "production" {
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
		if env != "production" {
			allowedOrigins = append(allowedOrigins,
				"http://52.199.151.155:3000",
				"http://52.199.151.155:8080")
		}
	}

	return allowedOrigins
}

//
// Cognito認証関連の関数
//

// getSecretHash はCognitoのSECRET_HASHを計算します
func getSecretHash(username string) string {
	mac := hmac.New(sha256.New, []byte(clientSecret))
	mac.Write([]byte(username + clientID))
	return base64.StdEncoding.EncodeToString(mac.Sum(nil))
}

// 本格的なCognito JWTトークン検証
// https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html
func verifyCognitoJWT(tokenString string, cfg *Config) (*jwt.Token, error) {
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
		expectedIss := fmt.Sprintf("https://cognito-idp.%s.amazonaws.com/%s", cfg.CognitoRegion, userPoolID)
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

// getSubFromToken はJWTからsubクレームを取得する
func getSubFromToken(c *gin.Context) (string, error) {
	token, err := c.Cookie("id_token")
	if err != nil {
		return "", fmt.Errorf("idトークンが見つかりません")
	}

	// トークン解析（検証なし）
	parsedToken, err := jwt.Parse(token, func(token *jwt.Token) (interface{}, error) {
		// 検証はスキップ（ここでは解析のみ）
		return nil, nil
	})

	// 検証エラーは期待通りなので無視（検証なしでパースしているため）
	if err != nil && !strings.Contains(err.Error(), "key is of invalid type") {
		return "", fmt.Errorf("トークン解析エラー: %w", err)
	}

	// クレーム取得
	claims, ok := parsedToken.Claims.(jwt.MapClaims)
	if !ok {
		return "", fmt.Errorf("クレーム取得失敗")
	}

	// subクレーム取得
	sub, ok := claims["sub"].(string)
	if !ok || sub == "" {
		return "", fmt.Errorf("subクレームがありません")
	}

	return sub, nil
}

//
// ミドルウェア
//

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
			errorResponse(c, StatusUnauthorized, ErrAuthRequired)
			c.Abort()
			return
		}

		// TODO: JWTの検証を実装（本番環境では必須）
		// ここではトークンの有無のみをチェックして簡略化

		// 認証成功、次のハンドラへ
		c.Next()
	}
}

//
// 認証関連ハンドラー
//

// registerHandler はユーザー登録を処理します
func registerHandler(c *gin.Context) {
	var req models.AuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errorResponse(c, StatusBadRequest, ErrInvalidInput, err.Error())
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
		errorResponse(c, StatusBadRequest, "ユーザー登録に失敗しました", err.Error())
		return
	}

	// Cognitoからsubを取得
	adminUser, err := cognitoClient.AdminGetUser(context.TODO(), &cognito.AdminGetUserInput{
		UserPoolId: aws.String(userPoolID),
		Username:   aws.String(req.Email),
	})
	if err != nil {
		log.Printf("Cognitoからsubの取得に失敗: %v", err)
		errorResponse(c, StatusServerError, "ユーザー情報取得失敗", err.Error())
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
		errorResponse(c, StatusServerError, "Cognitoからsubが取得できませんでした")
		return
	}

	// ユーザーをDBにも保存する前に既存レコードチェック
	var exists bool
	err = db.DB.Model(&models.User{}).Select("count(*) > 0").
		Where("email = ? OR cognito_sub = ?", req.Email, cognitoSub).
		Find(&exists).Error
	if err != nil {
		errorResponse(c, StatusServerError, ErrDatabaseError, err.Error())
		return
	}

	// 既に存在する場合は成功として処理
	if exists {
		log.Printf("既に登録済みのユーザー（email=%s, sub=%s）→ スキップ", req.Email, cognitoSub)
		successResponse(c, StatusOK, gin.H{"message": "ユーザー登録が完了しました。メールを確認して確認コードを入力してください。"})
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
			successResponse(c, StatusOK, gin.H{"message": "ユーザー登録が完了しました。メールを確認して確認コードを入力してください。"})
			return
		}
		errorResponse(c, StatusServerError, ErrDatabaseError, result.Error.Error())
		return
	}

	successResponse(c, StatusCreated, gin.H{"message": "ユーザー登録が完了しました。メールを確認して確認コードを入力してください。"})
}

// confirmRegistrationHandler は登録確認コードを処理します
func confirmRegistrationHandler(c *gin.Context) {
	type ConfirmRequest struct {
		Email            string `json:"email" binding:"required,email"`
		ConfirmationCode string `json:"confirmation_code" binding:"required"`
	}

	var req ConfirmRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errorResponse(c, StatusBadRequest, ErrInvalidInput, err.Error())
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
		errorResponse(c, StatusBadRequest, "確認コードの検証に失敗しました", err.Error())
		return
	}

	successResponse(c, StatusOK, gin.H{"message": "ユーザー登録が確認されました。ログインしてください。"})
}

// loginHandler はユーザーログインを処理します
func loginHandler(c *gin.Context) {
	var req models.AuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errorResponse(c, StatusBadRequest, ErrInvalidInput, err.Error())
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
		errorResponse(c, StatusUnauthorized, "ログインに失敗しました", err.Error())
		return
	}

	// トークンをクッキーに設定
	if resp.AuthenticationResult != nil {
		if resp.AuthenticationResult.IdToken != nil {
			c.SetCookie("id_token", *resp.AuthenticationResult.IdToken, tokenExpiration, "/", "", false, true)
		}
		if resp.AuthenticationResult.AccessToken != nil {
			c.SetCookie("access_token", *resp.AuthenticationResult.AccessToken, tokenExpiration, "/", "", false, true)
		}
		if resp.AuthenticationResult.RefreshToken != nil {
			c.SetCookie("refresh_token", *resp.AuthenticationResult.RefreshToken, refreshExpiration, "/", "", false, true)
		}

		// レスポンスを構築
		authResponse := models.AuthResponse{
			TokenType: "Bearer",
			Message:   "ログインに成功しました",
		}

		// セキュリティのため、トークンは直接JSONで返さない（クッキーのみで送信）
		successResponse(c, StatusOK, gin.H{"token_type": authResponse.TokenType, "message": authResponse.Message})
	} else {
		errorResponse(c, StatusServerError, ErrTokenFetchFailed)
	}
}

// logoutHandler はユーザーログアウトを処理します
func logoutHandler(c *gin.Context) {
	// トークンをクッキーから削除
	c.SetCookie("access_token", "", -1, "/", "", false, true)
	c.SetCookie("id_token", "", -1, "/", "", false, true)
	c.SetCookie("refresh_token", "", -1, "/", "", false, true)

	successResponse(c, StatusOK, gin.H{"message": "ログアウトしました"})
}

// refreshTokenHandler はトークンの更新を処理します
func refreshTokenHandler(c *gin.Context) {
	// リフレッシュトークンをクッキーから取得
	refreshToken, err := c.Cookie("refresh_token")
	if err != nil {
		errorResponse(c, StatusUnauthorized, "リフレッシュトークンが見つかりません")
		return
	}

	// ユーザー名（メール）もリクエストから取得
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		errorResponse(c, StatusBadRequest, "メールアドレスが必要です", err.Error())
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
		errorResponse(c, StatusUnauthorized, "トークンの更新に失敗しました", err.Error())
		return
	}

	// 新しいトークンをクッキーに設定
	if resp.AuthenticationResult != nil {
		if resp.AuthenticationResult.IdToken != nil {
			c.SetCookie("id_token", *resp.AuthenticationResult.IdToken, tokenExpiration, "/", "", false, true)
		}
		if resp.AuthenticationResult.AccessToken != nil {
			c.SetCookie("access_token", *resp.AuthenticationResult.AccessToken, tokenExpiration, "/", "", false, true)
		}

		successResponse(c, StatusOK, gin.H{"message": "トークンが更新されました"})
	} else {
		errorResponse(c, StatusServerError, ErrTokenFetchFailed)
	}
}

//
// ユーザー関連ハンドラー
//

// getProfileHandler はユーザープロファイル情報を取得します
func getProfileHandler(c *gin.Context) {
	// JWTからsubを取得
	sub, err := getSubFromToken(c)
	if err != nil {
		log.Printf("トークン解析エラー: %v", err)
		errorResponse(c, StatusUnauthorized, "認証情報の解析に失敗しました", err.Error())
		return
	}

	// subを使ってユーザー情報をDBから取得
	var user models.User
	if result := db.DB.Where("cognito_sub = ?", sub).First(&user); result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			errorResponse(c, StatusNotFound, ErrUserNotFound)
		} else {
			errorResponse(c, StatusServerError, ErrDatabaseError, result.Error.Error())
		}
		return
	}

	successResponse(c, StatusOK, gin.H{
		"message": "プロフィール情報を取得しました",
		"user":    user,
	})
}

// listUsersHandler はユーザー一覧を取得します
func listUsersHandler(c *gin.Context) {
	var users []models.User
	result := db.DB.Find(&users)
	if result.Error != nil {
		errorResponse(c, StatusServerError, ErrDatabaseError, result.Error.Error())
		return
	}
	successResponse(c, StatusOK, gin.H{"users": users})
}

// getUserHandler は指定IDのユーザーを取得します
func getUserHandler(c *gin.Context) {
	id := c.Param("id")
	var user models.User
	result := db.DB.First(&user, id)
	if result.Error != nil {
		errorResponse(c, StatusNotFound, ErrUserNotFound)
		return
	}
	successResponse(c, StatusOK, gin.H{"user": user})
}

// createUserHandler は新しいユーザーを作成します
func createUserHandler(c *gin.Context) {
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		errorResponse(c, StatusBadRequest, ErrInvalidInput, err.Error())
		return
	}

	result := db.DB.Create(&user)
	if result.Error != nil {
		errorResponse(c, StatusServerError, ErrDatabaseError, result.Error.Error())
		return
	}

	successResponse(c, StatusCreated, gin.H{"message": "ユーザーを作成しました", "user": user})
}

//
// ルーター関連の関数
//

// setupAuthRoutes は認証関連のルートを設定します
func setupAuthRoutes(api *gin.RouterGroup) {
	auth := api.Group("/auth")
	{
		auth.POST("/register", registerHandler)
		auth.POST("/confirm", confirmRegistrationHandler)
		auth.POST("/login", loginHandler)
		auth.POST("/logout", logoutHandler)
		auth.POST("/refresh", refreshTokenHandler)
	}
}

// setupProtectedRoutes は認証が必要なルートを設定します
func setupProtectedRoutes(api *gin.RouterGroup) {
	protected := api.Group("")
	protected.Use(authMiddleware())
	{
		// プロフィール情報
		protected.GET("/profile", getProfileHandler)
	}
}

// setupUserRoutes はユーザー関連のルートを設定します
func setupUserRoutes(api *gin.RouterGroup) {
	users := api.Group("/users")
	users.Use(authMiddleware()) // 認証が必要
	{
		// ユーザー一覧取得
		users.GET("", listUsersHandler)

		// 単一ユーザー取得
		users.GET("/:id", getUserHandler)

		// ユーザー作成
		users.POST("", createUserHandler)
	}
}

// setupRouter はルーターの設定を行います
func setupRouter(config *Config) *gin.Engine {
	// Ginルーターの初期化
	router := gin.Default()

	// 許可するオリジンを設定
	allowedOrigins := getAllowedOrigins(config.Env)

	if config.LogLevel == "debug" {
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

	// ルートパスのハンドラ
	router.GET("/", func(c *gin.Context) {
		successResponse(c, StatusOK, gin.H{"status": "healthy"})
	})

	// APIエンドポイント
	api := router.Group(fmt.Sprintf("/api/%s", config.APIVersion))
	{
		api.GET("/hello", func(c *gin.Context) {
			successResponse(c, StatusOK, gin.H{"message": "hello world"})
		})

		api.GET("/health", func(c *gin.Context) {
			successResponse(c, StatusOK, gin.H{"status": "healthy"})
		})

		// データベース接続情報
		api.GET("/db/stats", func(c *gin.Context) {
			stats := db.GetDBStats()
			successResponse(c, StatusOK, stats)
		})

		// 認証関連のエンドポイント
		setupAuthRoutes(api)

		// 保護されたエンドポイント（認証が必要）
		setupProtectedRoutes(api)

		// ユーザー関連のエンドポイント
		setupUserRoutes(api)
	}

	return router
}

func main() {
	// 環境変数の初期化
	config := initEnv()

	// Ginモードの設定
	if config.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}

	// Cognitoの初期化
	if err := initCognito(config); err != nil {
		log.Fatalf("Cognito初期化エラー: %v", err)
	}

	// データベース接続
	db.ConnectDatabase()

	// マイグレーションの実行
	db.AutoMigrateModels(&models.User{})

	// ルーターのセットアップ
	router := setupRouter(config)

	// サーバー起動
	log.Printf("サーバーを起動しています: http://localhost:%s", config.Port)

	// センシティブな情報はデバッグモードでのみログ出力する
	if config.LogLevel == "debug" {
		log.Printf("DATABASE_URL: %s", os.Getenv("DATABASE_URL"))
		log.Printf("SECRET: %s", os.Getenv("SECRET"))
		log.Printf("COGNITO_USER_POOL_ID: %s", userPoolID)
		log.Printf("COGNITO_CLIENT_ID: %s", clientID)
	}

	router.Run("0.0.0.0:" + config.Port)
}
