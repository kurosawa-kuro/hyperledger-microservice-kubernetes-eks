#########################################
# プロバイダ設定 & ローカル変数
#########################################
provider "aws" {
  region = "ap-northeast-1"  # 東京リージョン
}

locals {
  account_id    = "503561449641"
  region        = "ap-northeast-1"
  
  # SSMパラメータのパス接頭辞
  ssm_prefix    = "/${var.application_name}/${var.environment}"
  prefix        = "${var.application_name}-${var.environment}"

  # 1.2 SSM パラメータを一括管理（キー名＝環境変数名）
  # type = "SecureString" などパラメータごとに必要なものを指定
  ssm_parameters = {
    BACKEND_PORT = {
      type        = "String"
      description = "Backend application port"
      value       = var.backend_port
    },
    FRONTEND_PORT = {
      type        = "String"
      description = "Frontend application port"
      value       = var.frontend_port
    },
    DATABASE_URL = {
      type        = "SecureString"
      description = "Database connection URL"
      value       = var.database_url
    },
    JWT_SECRET_KEY = {
      type        = "SecureString"
      description = "JWT secret key for authentication"
      value       = var.jwt_secret_key
    },
    NODE_ENV = {
      type        = "String"
      description = "Node environment"
      value       = var.node_env
    },
    UPLOAD_DIR = {
      type        = "String"
      description = "Upload directory path"
      value       = var.upload_dir
    },
    NEXT_PUBLIC_ASSET_PREFIX = {
      type        = "String"
      description = "Next.js static assets prefix"
      value       = var.next_public_asset_prefix
    },
    COGNITO_USER_POOL_ID = {
      type        = "String"
      description = "Cognito User Pool ID"
      value       = var.cognito_user_pool_id
    },
    COGNITO_CLIENT_ID = {
      type        = "String"
      description = "Cognito Client ID"
      value       = var.cognito_client_id
    },
    COGNITO_REGION = {
      type        = "String"
      description = "AWS Cognito Region"
      value       = var.cognito_region
    },
    COGNITO_CLIENT_SECRET = {
      type        = "SecureString"
      description = "Cognito Client Secret"
      value       = var.cognito_client_secret
    }
  }
}


#########################################
# SSM パラメータ (for_each)
#########################################
resource "aws_ssm_parameter" "parameters" {
  for_each    = local.ssm_parameters

  name        = "${local.ssm_prefix}/${each.key}"
  type        = each.value.type
  description = each.value.description
  value       = each.value.value
  
}

# SSMポリシー (SSM パラメータへのアクセス)
resource "aws_iam_policy" "ssm_parameter_access" {
  name        = "${local.prefix}-ssm-parameter-access"
  description = "Allow access to SSM parameters"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action   = ["ssm:GetParameters", "ssm:GetParameter"],
        Effect   = "Allow",
        Resource = "arn:aws:ssm:${local.region}:${local.account_id}:parameter${local.ssm_prefix}/*"
      }
    ]
  })
}