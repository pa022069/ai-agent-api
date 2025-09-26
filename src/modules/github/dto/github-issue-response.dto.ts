import { ApiProperty } from '@nestjs/swagger';

export class GitHubUserDto {
  @ApiProperty({ description: '用戶名稱', example: 'octocat' })
  login: string;

  @ApiProperty({ description: '用戶 ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Node ID', example: 'MDQ6VXNlcjE=' })
  node_id: string;

  @ApiProperty({ description: '頭像 URL', example: 'https://github.com/images/error/octocat_happy.gif' })
  avatar_url: string;

  @ApiProperty({ description: 'Gravatar ID', example: '' })
  gravatar_id: string;

  @ApiProperty({ description: '用戶 API URL', example: 'https://api.github.com/users/octocat' })
  url: string;

  @ApiProperty({ description: '用戶頁面 URL', example: 'https://github.com/octocat' })
  html_url: string;

  @ApiProperty({ description: '追蹤者 URL', example: 'https://api.github.com/users/octocat/followers' })
  followers_url: string;

  @ApiProperty({ description: '追蹤中 URL', example: 'https://api.github.com/users/octocat/following{/other_user}' })
  following_url: string;

  @ApiProperty({ description: 'Gists URL', example: 'https://api.github.com/users/octocat/gists{/gist_id}' })
  gists_url: string;

  @ApiProperty({ description: '星標 URL', example: 'https://api.github.com/users/octocat/starred{/owner}{/repo}' })
  starred_url: string;

  @ApiProperty({ description: '訂閱 URL', example: 'https://api.github.com/users/octocat/subscriptions' })
  subscriptions_url: string;

  @ApiProperty({ description: '組織 URL', example: 'https://api.github.com/users/octocat/orgs' })
  organizations_url: string;

  @ApiProperty({ description: '儲存庫 URL', example: 'https://api.github.com/users/octocat/repos' })
  repos_url: string;

  @ApiProperty({ description: '事件 URL', example: 'https://api.github.com/users/octocat/events{/privacy}' })
  events_url: string;

  @ApiProperty({ description: '接收事件 URL', example: 'https://api.github.com/users/octocat/received_events' })
  received_events_url: string;

  @ApiProperty({ description: '用戶類型', example: 'User' })
  type: string;

  @ApiProperty({ description: '是否為管理員', example: false })
  site_admin: boolean;
}

export class GitHubLabelDto {
  @ApiProperty({ description: '標籤 ID', example: 208045946 })
  id: number;

  @ApiProperty({ description: 'Node ID', example: 'MDU6TGFiZWwyMDgwNDU5NDY=' })
  node_id: string;

  @ApiProperty({ description: '標籤 URL', example: 'https://api.github.com/repos/octocat/Hello-World/labels/bug' })
  url: string;

  @ApiProperty({ description: '標籤名稱', example: 'bug' })
  name: string;

  @ApiProperty({ description: '標籤描述', example: 'Something isn\'t working', nullable: true })
  description: string | null;

  @ApiProperty({ description: '標籤顏色', example: 'f29513' })
  color: string;

  @ApiProperty({ description: '是否為預設標籤', example: true })
  default: boolean;
}

export class GitHubMilestoneDto {
  @ApiProperty({ description: '里程碑 URL', example: 'https://api.github.com/repos/octocat/Hello-World/milestones/1' })
  url: string;

  @ApiProperty({ description: '里程碑頁面 URL', example: 'https://github.com/octocat/Hello-World/milestone/1' })
  html_url: string;

  @ApiProperty({ description: '里程碑標籤 URL', example: 'https://api.github.com/repos/octocat/Hello-World/milestones/1/labels' })
  labels_url: string;

  @ApiProperty({ description: '里程碑 ID', example: 1002604 })
  id: number;

  @ApiProperty({ description: 'Node ID', example: 'MDk6TWlsZXN0b25lMTAwMjYwNA==' })
  node_id: string;

  @ApiProperty({ description: '里程碑編號', example: 1 })
  number: number;

  @ApiProperty({ description: '里程碑狀態', example: 'open' })
  state: string;

  @ApiProperty({ description: '里程碑標題', example: 'v1.0' })
  title: string;

  @ApiProperty({ description: '里程碑描述', example: 'Tracking milestone for version 1.0', nullable: true })
  description: string | null;

  @ApiProperty({ description: '建立者資訊', type: GitHubUserDto })
  creator: GitHubUserDto;

  @ApiProperty({ description: '開放中的 issues 數量', example: 4 })
  open_issues: number;

  @ApiProperty({ description: '已關閉的 issues 數量', example: 8 })
  closed_issues: number;

  @ApiProperty({ description: '建立時間', example: '2011-04-10T20:09:31Z' })
  created_at: string;

  @ApiProperty({ description: '更新時間', example: '2014-03-03T18:58:10Z' })
  updated_at: string;

  @ApiProperty({ description: '關閉時間', example: '2013-02-12T13:22:01Z', nullable: true })
  closed_at: string | null;

  @ApiProperty({ description: '到期時間', example: '2012-10-09T23:39:01Z', nullable: true })
  due_on: string | null;
}

export class GitHubPullRequestDto {
  @ApiProperty({ description: 'Pull Request URL', example: 'https://api.github.com/repos/octocat/Hello-World/pulls/1347' })
  url: string;

  @ApiProperty({ description: 'Pull Request 頁面 URL', example: 'https://github.com/octocat/Hello-World/pull/1347' })
  html_url: string;

  @ApiProperty({ description: 'Diff URL', example: 'https://github.com/octocat/Hello-World/pull/1347.diff' })
  diff_url: string;

  @ApiProperty({ description: 'Patch URL', example: 'https://github.com/octocat/Hello-World/pull/1347.patch' })
  patch_url: string;
}

export class GitHubIssueResponseDto {
  @ApiProperty({ description: 'Issue ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Node ID', example: 'MDU6SXNzdWUx' })
  node_id: string;

  @ApiProperty({ description: 'Issue API URL', example: 'https://api.github.com/repos/octocat/Hello-World/issues/1347' })
  url: string;

  @ApiProperty({ description: '儲存庫 URL', example: 'https://api.github.com/repos/octocat/Hello-World' })
  repository_url: string;

  @ApiProperty({ description: '標籤 URL', example: 'https://api.github.com/repos/octocat/Hello-World/issues/1347/labels{/name}' })
  labels_url: string;

  @ApiProperty({ description: '評論 URL', example: 'https://api.github.com/repos/octocat/Hello-World/issues/1347/comments' })
  comments_url: string;

  @ApiProperty({ description: '事件 URL', example: 'https://api.github.com/repos/octocat/Hello-World/issues/1347/events' })
  events_url: string;

  @ApiProperty({ description: 'Issue 頁面 URL', example: 'https://github.com/octocat/Hello-World/issues/1347' })
  html_url: string;

  @ApiProperty({ description: 'Issue 編號', example: 1347 })
  number: number;

  @ApiProperty({ description: 'Issue 狀態', example: 'open', enum: ['open', 'closed'] })
  state: string;

  @ApiProperty({ description: 'Issue 標題', example: 'Found a bug' })
  title: string;

  @ApiProperty({ description: 'Issue 內容', example: 'I\'m having a problem with this.', nullable: true })
  body: string | null;

  @ApiProperty({ description: '建立者資訊', type: GitHubUserDto })
  user: GitHubUserDto;

  @ApiProperty({ description: '標籤列表', type: [GitHubLabelDto] })
  labels: GitHubLabelDto[];

  @ApiProperty({ description: '主要指派者', type: GitHubUserDto, nullable: true })
  assignee: GitHubUserDto | null;

  @ApiProperty({ description: '指派者列表', type: [GitHubUserDto] })
  assignees: GitHubUserDto[];

  @ApiProperty({ description: '里程碑', type: GitHubMilestoneDto, nullable: true })
  milestone: GitHubMilestoneDto | null;

  @ApiProperty({ description: '是否被鎖定', example: false })
  locked: boolean;

  @ApiProperty({ description: '鎖定原因', example: null, nullable: true })
  active_lock_reason: string | null;

  @ApiProperty({ description: '評論數量', example: 0 })
  comments: number;

  @ApiProperty({ description: 'Pull Request 資訊', type: GitHubPullRequestDto, required: false })
  pull_request?: GitHubPullRequestDto;

  @ApiProperty({ description: '關閉時間', example: null, nullable: true })
  closed_at: string | null;

  @ApiProperty({ description: '建立時間', example: '2011-04-22T13:33:48Z' })
  created_at: string;

  @ApiProperty({ description: '更新時間', example: '2011-04-22T13:33:48Z' })
  updated_at: string;

  @ApiProperty({ description: '關閉者資訊', type: GitHubUserDto, required: false })
  closed_by?: GitHubUserDto;
}
