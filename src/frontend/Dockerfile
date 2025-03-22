# ビルダーステージ
FROM node:18-alpine AS builder
WORKDIR /app

# 依存関係のインストール
COPY package.json package-lock.json* ./
RUN npm ci

# ソースコードのコピーとビルド
COPY . .
RUN npm run build

# ランタイムステージ
FROM node:18-alpine AS runner
WORKDIR /app

# 非rootユーザーの設定
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# スタンドアロンビルドからのフォルダコピー
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# アプリケーション起動
ENV PORT 3000
EXPOSE 3000
CMD ["node", "server.js"]
