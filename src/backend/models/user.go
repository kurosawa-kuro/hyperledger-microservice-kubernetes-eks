package models

// User はユーザー情報を表すモデル
type User struct {
	ID         uint   `gorm:"primaryKey"`
	Email      string `gorm:"uniqueIndex;not null"`
	Name       string
	Role       string // user / admin / etc.
	CognitoSub string `gorm:"uniqueIndex"` // JWTの `sub` と紐づける
}

// DefaultUsers はデフォルトのユーザーを返す
func DefaultUsers() []User {
	return []User{
		{
			Email: "user@example.com",
			Name:  "DefaultUser",
			Role:  "user",
		},
		{
			Email: "admin@example.com",
			Name:  "SystemAdmin",
			Role:  "admin",
		},
	}
}

// AuthRequest は認証リクエストの構造体
type AuthRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	Name     string `json:"name,omitempty"`
}

// AuthResponse は認証レスポンスの構造体
type AuthResponse struct {
	AccessToken  string `json:"access_token,omitempty"`
	RefreshToken string `json:"refresh_token,omitempty"`
	IdToken      string `json:"id_token,omitempty"`
	ExpiresIn    int    `json:"expires_in,omitempty"`
	TokenType    string `json:"token_type,omitempty"`
	Message      string `json:"message,omitempty"`
	Error        string `json:"error,omitempty"`
}
