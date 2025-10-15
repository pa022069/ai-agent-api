# 團隊知識庫設計建議

## 🎯 目標

為 AI 提供更豐富的團隊信息，實現更準確和智能的團隊分配。

## 📋 當前問題分析

### 現有配置的局限性

1. **信息不足**: 只有關鍵字，缺乏團隊職責、技術棧、業務領域等詳細信息
2. **AI 分析受限**: 無法基於團隊專業能力做出智能判斷
3. **擴展性差**: 難以添加新團隊和更新團隊信息

## 🏗️ 建議的完整 Knowledge Base 結構

### 1. 團隊基本信息

```typescript
interface TeamInfo {
  team: string; // 團隊名稱
  description: string; // 團隊職責描述
  responsibilities: string[]; // 具體職責列表
  expertise: string[]; // 專業領域
  technologies: string[]; // 技術棧
  businessDomains: string[]; // 業務領域
}
```

### 2. 儲存庫信息

```typescript
interface RepositoryInfo {
  owner: string;
  repo: string;
  priority: number;
  description: string; // 儲存庫用途描述
  technologies: string[]; // 使用的技術
  purpose: string; // 主要用途
  teamResponsibilities: string[]; // 團隊對該儲存庫的職責
}
```

### 3. 關鍵字配置

```typescript
interface KeywordConfig {
  keyword: string;
  weight: number;
  category: 'technology' | 'business' | 'platform' | 'feature';
  description: string; // 關鍵字說明
}
```

## 📝 完整的團隊配置示例

```typescript
const enhancedTeamMapping = [
  {
    team: 'Desktop Team',
    description: '負責桌面應用程式的開發、維護和優化',
    responsibilities: [
      '桌面應用程式開發',
      '跨平台兼容性處理',
      '用戶界面設計與實現',
      '桌面應用性能優化',
      '系統集成與API開發',
    ],
    expertise: [
      '桌面應用開發',
      '跨平台開發',
      '系統集成',
      '用戶體驗設計',
      '性能優化',
    ],
    technologies: [
      'Electron',
      'React',
      'TypeScript',
      'Node.js',
      'Windows API',
      'macOS API',
      'C++',
      'Python',
    ],
    businessDomains: [
      '音樂製作軟體',
      '音頻處理',
      '用戶管理',
      '訂閱服務',
      '桌面工具',
    ],
    keywords: [
      {
        keyword: 'desktop',
        weight: 5,
        category: 'platform',
        description: '桌面應用相關',
      },
      {
        keyword: 'pc',
        weight: 4,
        category: 'platform',
        description: 'PC平台相關',
      },
      {
        keyword: 'windows',
        weight: 4,
        category: 'platform',
        description: 'Windows系統相關',
      },
      {
        keyword: 'mac',
        weight: 4,
        category: 'platform',
        description: 'Mac系統相關',
      },
      {
        keyword: 'application',
        weight: 3,
        category: 'technology',
        description: '應用程式開發',
      },
      {
        keyword: 'client',
        weight: 3,
        category: 'technology',
        description: '客戶端應用',
      },
      {
        keyword: 'electron',
        weight: 5,
        category: 'technology',
        description: 'Electron框架',
      },
      {
        keyword: 'ui',
        weight: 3,
        category: 'feature',
        description: '用戶界面',
      },
      {
        keyword: 'performance',
        weight: 3,
        category: 'feature',
        description: '性能優化',
      },
    ],
    repos: [
      {
        owner: 'Positive-LLC',
        repo: 'ai-agent-dev',
        priority: 1,
        description: 'AI代理開發平台，用於自動化任務處理',
        technologies: ['TypeScript', 'Node.js', 'AI/ML'],
        purpose: 'AI代理開發與管理',
        teamResponsibilities: [
          'AI代理功能開發',
          '自動化流程設計',
          'API集成與維護',
          '性能監控與優化',
        ],
      },
      {
        owner: 'Positive-LLC',
        repo: 'jira-analyze-dev',
        priority: 2,
        description: 'Jira分析工具，用於項目管理和需求分析',
        technologies: ['TypeScript', 'Node.js', 'Jira API'],
        purpose: '項目管理與分析',
        teamResponsibilities: [
          'Jira集成開發',
          '數據分析功能',
          '報告生成',
          '工作流程優化',
        ],
      },
    ],
  },
  // 可以添加更多團隊
  {
    team: 'Mobile Team',
    description: '負責移動應用程式的開發和維護',
    responsibilities: [
      'iOS應用開發',
      'Android應用開發',
      '移動端UI/UX設計',
      '移動端性能優化',
      '跨平台移動開發',
    ],
    expertise: [
      'iOS開發',
      'Android開發',
      'React Native',
      'Flutter',
      '移動端UI設計',
    ],
    technologies: [
      'Swift',
      'Kotlin',
      'React Native',
      'Flutter',
      'iOS SDK',
      'Android SDK',
    ],
    businessDomains: [
      '移動音樂應用',
      '移動音頻處理',
      '移動訂閱服務',
      '移動工具',
    ],
    keywords: [
      {
        keyword: 'mobile',
        weight: 5,
        category: 'platform',
        description: '移動應用相關',
      },
      {
        keyword: 'ios',
        weight: 4,
        category: 'platform',
        description: 'iOS平台相關',
      },
      {
        keyword: 'android',
        weight: 4,
        category: 'platform',
        description: 'Android平台相關',
      },
      {
        keyword: 'app',
        weight: 3,
        category: 'technology',
        description: '移動應用開發',
      },
      {
        keyword: 'react-native',
        weight: 5,
        category: 'technology',
        description: 'React Native框架',
      },
      {
        keyword: 'flutter',
        weight: 5,
        category: 'technology',
        description: 'Flutter框架',
      },
    ],
    repos: [
      {
        owner: 'Positive-LLC',
        repo: 'mobile-app',
        priority: 1,
        description: '主要移動應用程式',
        technologies: ['React Native', 'TypeScript'],
        purpose: '移動端音樂應用',
        teamResponsibilities: [
          '移動應用開發',
          '跨平台兼容性',
          '移動端性能優化',
          '用戶體驗設計',
        ],
      },
    ],
  },
];
```

## 🎨 改進的 AI Prompt 設計

````markdown
你是一個專業的團隊分配專家。請基於以下詳細的團隊信息，為 Jira ticket 選擇最適合的開發團隊。

## Ticket 信息

**標題：** {summary}
**描述：** {description}

## 團隊知識庫

### Desktop Team

**職責：** 負責桌面應用程式的開發、維護和優化
**專業領域：** 桌面應用開發、跨平台開發、系統集成、用戶體驗設計、性能優化
**技術棧：** Electron, React, TypeScript, Node.js, Windows API, macOS API, C++, Python
**業務領域：** 音樂製作軟體、音頻處理、用戶管理、訂閱服務、桌面工具
**儲存庫：**

- ai-agent-dev: AI代理開發平台，用於自動化任務處理
- jira-analyze-dev: Jira分析工具，用於項目管理和需求分析

### Mobile Team

**職責：** 負責移動應用程式的開發和維護
**專業領域：** iOS開發、Android開發、React Native、Flutter、移動端UI設計
**技術棧：** Swift, Kotlin, React Native, Flutter, iOS SDK, Android SDK
**業務領域：** 移動音樂應用、移動音頻處理、移動訂閱服務、移動工具
**儲存庫：**

- mobile-app: 主要移動應用程式

## 分析要求

請基於以下標準進行分析：

1. **技術匹配度 (40%)**: 團隊技術棧與需求匹配程度
2. **業務熟悉度 (30%)**: 團隊對相關業務領域的熟悉程度
3. **職責範圍 (20%)**: 需求是否在團隊職責範圍內
4. **專業能力 (10%)**: 團隊專業能力與需求複雜度匹配

## 輸出格式

請以 JSON 格式返回分析結果：

```json
{
  "bestMatch": {
    "team": "Desktop Team",
    "owner": "Positive-LLC",
    "repo": "ai-agent-dev",
    "score": 90,
    "confidence": 0.9,
    "reasoning": "這個需求涉及桌面應用開發和AI代理功能，Desktop Team在Electron開發和AI集成方面有豐富經驗，且ai-agent-dev儲存庫專門用於AI代理開發..."
  },
  "allTeamRepos": [
    {
      "owner": "Positive-LLC",
      "repo": "ai-agent-dev",
      "priority": 1,
      "score": 90,
      "reasoning": "主要匹配理由：技術棧匹配、職責範圍符合、專業能力強..."
    }
  ]
}
```
````

```

## 🚀 實施建議

### Phase 1: 擴展現有配置
1. 為 Desktop Team 添加更詳細的信息
2. 更新 AI prompt 以使用新信息
3. 測試改進效果

### Phase 2: 添加更多團隊
1. 添加 Mobile Team 配置
2. 添加 Backend Team 配置
3. 添加 DevOps Team 配置

### Phase 3: 動態配置管理
1. 將配置移到數據庫
2. 添加配置管理界面
3. 支持動態更新團隊信息

## 📊 預期效果

1. **更準確的分配**: AI 能基於團隊專業能力做出更智能的判斷
2. **更好的解釋**: 提供更詳細的分配理由
3. **更強的擴展性**: 容易添加新團隊和更新信息
4. **更高的置信度**: 基於豐富信息做出更可靠的決策

## 💡 結論

**是的，需要更完整的 knowledge base！** 當前的配置過於簡單，限制了 AI 的分析能力。建議實施上述的完整知識庫設計，以實現更智能和準確的團隊分配。
```
