# Serverless 部署指南

這個 NestJS 專案現在支援 serverless 部署到 AWS Lambda。

## 環境變數配置

創建 `.env` 文件來配置環境變數：

```bash
# 應用程式配置
NODE_ENV=development
PORT=3000

# 資料庫配置
# DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# API 金鑰
# API_KEY=your_api_key_here

# 其他配置
# LOG_LEVEL=info
```

## 本地開發

### 傳統模式

```bash
# 開發模式
yarn start:dev

# 生產模式
yarn build
yarn start:prod
```

### Serverless 模式

```bash
# 本地 serverless 開發
yarn offline
```

## 部署到 AWS

### 前置要求

1. 安裝 AWS CLI
2. 配置 AWS 憑證
3. 安裝 Serverless Framework

```bash
npm install -g serverless
```

### 部署命令

```bash
# 部署到開發環境
yarn deploy:dev

# 部署到生產環境
yarn deploy:prod

# 部署到預設環境
yarn deploy

# 移除部署
yarn remove
```

## 專案結構

- `src/lambda.ts` - Lambda 處理器
- `serverless.yml` - Serverless 配置
- `src/main.ts` - 傳統模式啟動文件

## 注意事項

1. 確保在部署前執行 `yarn build`
2. 環境變數會在 `serverless.yml` 中自動配置
3. 支援 CORS 和 API Gateway 代理
4. 記憶體設定為 512MB，超時時間為 30 秒
