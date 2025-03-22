# variables.tf - 変数の定義
variable "database_url" {
  description = "データベース接続文字列"
  type        = string
  sensitive   = true  # ログやコンソール出力で値を隠す
}

variable "environment" {
  description = "デプロイ環境（production, staging, development）"
  type        = string
  default     = "production"
}

variable "application_name" {
  description = "アプリケーション名"
  type        = string
  default     = "app"
}

# 他のSSMパラメータ用の変数
variable "node_env" {
  description = "Node.js環境変数"
  type        = string
  default     = "production"
}

variable "backend_port" {
  description = "バックエンドアプリケーションポート"
  type        = string
  default     = "8080"
}

variable "frontend_port" {
  description = "フロントエンドアプリケーションポート"
  type        = string
  default     = "3000"
}

variable "jwt_secret_key" {
  description = "JWT認証用シークレットキー"
  type        = string
  sensitive   = true
}

variable "upload_dir" {
  description = "アップロードディレクトリパス"
  type        = string
  default     = "uploads"
}