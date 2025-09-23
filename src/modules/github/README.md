# GitHub 模組

這個模組提供了與 GitHub API 互動的功能，包括建立和取得 GitHub issues。

## 功能

- 建立 GitHub issue
- 取得 GitHub issue 詳情
- 測試端點

## 環境變數

在 `.env` 文件中設置以下環境變數：

```bash
GITHUB_TOKEN=your_github_token_here
```

## API 端點

### 建立 Issue

```http
POST /github/repos/:owner/:repo/issues
```

**請求體：**

```json
{
  "title": "Issue 標題",
  "body": "Issue 描述（可選）",
  "assignees": ["username1", "username2"],
  "labels": ["bug", "enhancement"],
  "milestone": "1"
}
```

**注意：**

- `assignees` 和 `labels` 可以是陣列或逗號分隔的字串
- 字串格式會自動轉換為陣列（例如：`"username1,username2"` → `["username1", "username2"]`）
- 空值會被自動過濾

### 取得 Issue

```http
GET /github/repos/:owner/:repo/issues/:issueNumber
```

### 測試端點

```http
GET /github/test
```

## 使用範例

### 建立 Issue

**使用陣列格式：**

```bash
curl -X POST http://localhost:3000/github/repos/owner/repo/issues \
  -H "Content-Type: application/json" \
  -d '{
    "title": "新功能請求",
    "body": "請添加這個新功能",
    "labels": ["enhancement", "feature"],
    "assignees": ["username1", "username2"]
  }'
```

**使用字串格式（自動轉換為陣列）：**

```bash
curl -X POST http://localhost:3000/github/repos/owner/repo/issues \
  -H "Content-Type: application/json" \
  -d '{
    "title": "新功能請求",
    "body": "請添加這個新功能",
    "labels": "enhancement,feature",
    "assignees": "username1,username2"
  }'
```

### 取得 Issue

```bash
curl http://localhost:3000/github/repos/owner/repo/issues/1
```

## 錯誤處理

API 會返回適當的 HTTP 狀態碼和錯誤訊息：

- `400 Bad Request` - 無效的請求參數
- `401 Unauthorized` - GitHub token 無效
- `404 Not Found` - Repository 或 issue 不存在
- `500 Internal Server Error` - 伺服器內部錯誤

## 注意事項

1. 確保設置有效的 GitHub token
2. 確保有權限存取目標 repository
3. 所有 API 調用都需要有效的 GitHub token
