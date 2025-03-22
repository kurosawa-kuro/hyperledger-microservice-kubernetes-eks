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

# スタンドアロンビルドからのフォルダコピー
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 所有権設定
RUN chown -R nextjs:nodejs /app
USER nextjs

# アプリケーション起動
ENV PORT 3000
ENV NODE_ENV production
EXPOSE 3000
CMD ["node", "server.js"]
