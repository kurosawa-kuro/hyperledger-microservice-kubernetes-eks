package models

import (
	"time"

	"gorm.io/gorm"
)

// User はユーザー情報を表すモデル
type User struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Email    string `gorm:"type:varchar(100);uniqueIndex;not null" json:"email"`
	Password string `gorm:"type:varchar(255);not null" json:"-"` // JSONレスポンスには含めない
	Name     string `gorm:"type:varchar(100);not null" json:"name"`
	Role     string `gorm:"type:varchar(20);default:'user'" json:"role"` // 'user', 'admin', 'read-only-admin'
}

// DefaultUsers はデフォルトのユーザーを返す
func DefaultUsers() []User {
	return []User{
		{
			Email:    "user@example.com",
			Password: "password", // 実際の運用では必ずハッシュ化する
			Name:     "DefaultUser",
			Role:     "user",
		},
		{
			Email:    "admin@example.com",
			Password: "password", // 実際の運用では必ずハッシュ化する
			Name:     "SystemAdmin",
			Role:     "admin",
		},
	}
}
