FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
# GOTOOLCHAIN=auto を設定して必要に応じて高いGoバージョンをダウンロードできるようにする
ENV GOTOOLCHAIN=auto
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

FROM alpine:3.18

RUN apk --no-cache add ca-certificates
WORKDIR /root/

COPY --from=builder /app/main .

EXPOSE 8080

ENV GO_ENV=prod

CMD ["./main"]
