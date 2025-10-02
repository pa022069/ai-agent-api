# Analyze 模組

## 概述

Analyze 模組負責執行多儲存庫分析流程，根據 Jira 需求在多個 GitHub 儲存庫中進行分析，找出最適合的儲存庫並建立相應的 issue。

## 功能流程

### 三階段分析流程

#### 階段1: 建立 Analyze Issues

1. **接收分析請求** - 從 Jira Automation 接收需求描述
2. **儲存到資料庫** - 將分析請求和 Jira 資料儲存到 MySQL
3. **建立 Analyze Issues** - 在各個目標儲存庫中建立分析用的 issue
4. **記錄 Issue 資訊** - 將每個 analyze issue 的資訊儲存到資料庫

#### 階段2: 接收分析結果

1. **GitHub Action 觸發** - Claude Code 分析各儲存庫
2. **Webhook 回調** - GitHub Action 完成後透過 webhook 回傳評分
3. **更新資料庫** - 將評分和分析結果儲存到資料庫
4. **檢查完成狀態** - 判斷是否所有分析都已完成

#### 階段3: 完成分析流程

1. **選擇最佳匹配** - 根據評分選擇最適合的儲存庫
2. **建立最終 Issue** - 在最佳匹配的儲存庫中建立正式的 issue
3. **清理 Analyze Issues** - 關閉或標記分析用的 issue
4. **更新完成狀態** - 將分析請求標記為完成

## API 端點

### POST /analyze/repositories

執行階段1：建立 analyze issues 並儲存到資料庫。

**請求範例：**

```json
{
  "requirement": "需要實作用戶登入功能，包含帳號密碼驗證和記住登入狀態",
  "jiraTicket": {
    "key": "PROJ-123",
    "summary": "實作用戶登入功能",
    "description": "需要實作用戶登入功能，包含帳號密碼驗證和記住登入狀態",
    "self": "https://company.atlassian.net/browse/PROJ-123"
  },
  "repositories": [
    {
      "owner": "octocat",
      "repo": "Hello-World",
      "analysisPrompt": "請分析這個需求並給出評分（0-100分）"
    },
    {
      "owner": "octocat",
      "repo": "Another-Repo",
      "analysisPrompt": "請分析這個需求並給出評分（0-100分）"
    }
  ],
  "assignees": "user1,user2",
  "labels": "feature,analysis",
  "milestone": "1"
}
```

**回應範例：**

```json
{
  "requestId": "req_1234567890_abc123",
  "jiraTicketKey": "PROJ-123",
  "repositoryResults": [
    {
      "owner": "octocat",
      "repo": "Hello-World",
      "score": 85,
      "analysis": "此儲存庫適合實作登入功能，已有相關基礎架構",
      "analyzeIssueNumber": 123,
      "analyzeIssueUrl": "https://github.com/octocat/Hello-World/issues/123"
    }
  ],
  "bestMatch": {
    "owner": "octocat",
    "repo": "Hello-World",
    "score": 85
  },
  "finalIssueNumber": 124,
  "finalIssueUrl": "https://github.com/octocat/Hello-World/issues/124",
  "status": "completed"
}
```

### POST /analyze/webhook/analysis-update

執行階段2：接收 Claude Code 分析結果的 webhook 回調。

**請求範例：**

```json
{
  "owner": "octocat",
  "repo": "Hello-World",
  "issueNumber": 123,
  "analysis": "此儲存庫適合實作登入功能，已有相關基礎架構",
  "score": 85
}
```

### GET /analyze/status/:requestId

查詢分析請求的當前狀態。

**回應範例：**

```json
{
  "id": 1,
  "requestId": "req_1234567890_abc123",
  "jiraTicketKey": "PROJ-123",
  "status": "completed",
  "bestMatchOwner": "octocat",
  "bestMatchRepo": "Hello-World",
  "bestMatchScore": 85,
  "finalIssueNumber": 124,
  "finalIssueUrl": "https://github.com/octocat/Hello-World/issues/124",
  "analysisResults": [
    {
      "id": 1,
      "owner": "octocat",
      "repo": "Hello-World",
      "score": 85,
      "analysis": "此儲存庫適合實作登入功能...",
      "status": "completed"
    }
  ]
}
```

## 評分標準

Claude Code 分析時會根據以下標準給出 0-100 分的評分：

- **技術可行性** (30分) - 技術實現的難易程度
- **架構匹配度** (25分) - 與現有架構的契合度
- **開發複雜度** (20分) - 開發工作量的評估
- **維護成本** (15分) - 後續維護的難易程度
- **業務價值** (10分) - 對業務目標的貢獻度

## 依賴模組

- **GitHub 模組** - 用於建立和管理 GitHub issues
- **Config 模組** - 用於環境變數配置
- **TypeORM 模組** - 用於資料庫操作

## 環境變數

需要設定以下環境變數：

- `GITHUB_TOKEN` - GitHub API 存取權杖
- `DB_HOST` - 資料庫主機 (預設: localhost)
- `DB_PORT` - 資料庫埠號 (預設: 3306)
- `DB_USERNAME` - 資料庫使用者名稱 (預設: root)
- `DB_PASSWORD` - 資料庫密碼
- `DB_DATABASE` - 資料庫名稱 (預設: ai_agent_api)

## 注意事項

1. **三階段流程** - 分析流程分為三個階段，每個階段都有明確的職責
2. **資料庫持久化** - 所有分析請求和結果都會儲存在 MySQL 資料庫中
3. **非同步處理** - 階段1完成後立即返回，後續階段透過 webhook 觸發
4. **Issue 清理** - GitHub API 不支援直接刪除 issue，目前實作為關閉或標記
5. **錯誤處理** - 即使某個儲存庫分析失敗，流程仍會繼續處理其他儲存庫
6. **狀態追蹤** - 可透過 GET /analyze/status/:requestId 查詢分析進度

## 未來改進

1. **Issue 清理機制** - 實作更完善的 analyze issue 清理邏輯
2. **通知系統** - 分析完成後發送通知
3. **重試機制** - 分析失敗時的自動重試
4. **分析歷史** - 記錄和分析歷史資料
5. **效能優化** - 大量分析請求的批次處理
6. **監控儀表板** - 分析流程的即時監控
