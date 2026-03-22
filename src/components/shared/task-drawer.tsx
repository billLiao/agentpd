'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import type { Task, TaskComment, BoardPerspective } from '@/lib/api/types';
import { TASK_STATUS_LABELS } from '@/lib/api/types';

interface TaskDrawerProps {
  task: Task | null;
  onClose: () => void;
  onRefresh: () => void;
  currentPerspective: BoardPerspective;
}

export function TaskDrawer({ task, onClose, onRefresh, currentPerspective }: TaskDrawerProps) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dependencies, setDependencies] = useState<Task[]>([]);
  const [dependents, setDependents] = useState<Task[]>([]);
  const [showDependencies, setShowDependencies] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'dependencies'>('details');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editObjective, setEditObjective] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [editFollowingAgents, setEditFollowingAgents] = useState<string[]>([]);
  const [availableAgents, setAvailableAgents] = useState<{ id: string; name: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (task) {
      fetchComments();
      fetchDependencies();
      setEditTitle(task.title || '');
      setEditObjective(task.objective || '');
      setEditPriority(task.priority || 'p2');
      setEditFollowingAgents(Array.isArray(task.followingAgents) ? task.followingAgents : []);
    }
  }, [task]);

  useEffect(() => {
    if (isEditing) {
      fetchAgents();
    }
  }, [isEditing]);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents');
      if (response.ok) {
        const agents = await response.json();
        setAvailableAgents(agents.map((a: { id: string; name: string }) => ({
          id: a.id,
          name: a.name,
        })));
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    }
  };

  const toggleAgent = (agentId: string) => {
    setEditFollowingAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleSaveEdit = async () => {
    if (!task) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          objective: editObjective,
          priority: editPriority,
          following_agents: editFollowingAgents,
        }),
      });
      if (response.ok) {
        setIsEditing(false);
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const fetchComments = async () => {
    if (!task) return;
    try {
      const response = await fetch(`/api/tasks/${task.id}?include=comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const fetchDependencies = async () => {
    if (!task) return;
    try {
      const [depResponse, depenResponse] = await Promise.all([
        fetch(`/api/tasks/${task.id}?include=dependencies`),
        fetch(`/api/tasks/${task.id}?include=dependents`),
      ]);

      if (depResponse.ok) {
        const data = await depResponse.json();
        setDependencies(data.dependencies || []);
      }
      if (depenResponse.ok) {
        const data = await depenResponse.json();
        setDependents(data.dependents || []);
      }
    } catch (error) {
      console.error('Failed to fetch dependencies:', error);
    }
  };

  const handleAddComment = async () => {
    if (!task || !newComment.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_type: currentPerspective.type,
          author_id: currentPerspective.id,
          author_name: currentPerspective.name,
          content: newComment,
        }),
      });

      if (response.ok) {
        setNewComment('');
        fetchComments();
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return;

    try {
      await fetch(`/api/tasks/${task.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      onRefresh();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleRetry = async () => {
    if (!task) return;

    try {
      await fetch(`/api/tasks/${task.id}/retry`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      onRefresh();
    } catch (error) {
      console.error('Failed to retry task:', error);
    }
  };

  const handleResolveStuck = async (action: 'retry' | 'release' | 'fail') => {
    if (!task) return;

    try {
      await fetch(`/api/tasks/${task.id}/resolve-stuck`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      onRefresh();
    } catch (error) {
      console.error('Failed to resolve stuck task:', error);
    }
  };

  if (!task) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? '编辑任务' : '任务详情'}
          </h2>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {isSaving ? '保存中...' : '保存'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 text-sm text-blue-500 hover:text-blue-700"
              >
                编辑
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex border-b border-gray-200">
          {(['details', 'comments', 'dependencies'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'details' ? '详情' : tab === 'comments' ? `评论 (${comments.length})` : '依赖'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">描述/目标</label>
                    <textarea
                      value={editObjective}
                      onChange={e => setEditObjective(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
                    <select
                      value={editPriority}
                      onChange={e => setEditPriority(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="p0">P0 - 紧急</option>
                      <option value="p1">P1 - 高</option>
                      <option value="p2">P2 - 中</option>
                      <option value="p3">P3 - 低</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">跟进 Agent</label>
                    <div className="flex flex-wrap gap-2">
                      {availableAgents.length === 0 ? (
                        <span className="text-sm text-gray-400">加载中...</span>
                      ) : (
                        availableAgents.map(agent => (
                          <button
                            key={agent.id}
                            onClick={() => toggleAgent(agent.id)}
                            className={`px-3 py-1 rounded-full text-sm transition-colors ${
                              editFollowingAgents.includes(agent.id)
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {agent.name}
                            {editFollowingAgents.includes(agent.id) && (
                              <span className="ml-1">×</span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{task.title}</h3>
                    <p className="text-gray-600 whitespace-pre-wrap">{task.objective}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-500">状态</span>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          task.status === 'done' ? 'bg-green-100 text-green-800' :
                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          task.status === 'waiting_for_human' ? 'bg-orange-100 text-orange-800' :
                          task.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {TASK_STATUS_LABELS[task.status]}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-sm text-gray-500">优先级</span>
                      <div className="mt-1 font-medium">{task.priority?.toUpperCase()}</div>
                    </div>

                    <div>
                      <span className="text-sm text-gray-500">认领 Agent</span>
                      <div className="mt-1">{task.claimedAgent || '-'}</div>
                    </div>

                    <div>
                      <span className="text-sm text-gray-500">跟进 Agents</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Array.isArray(task.followingAgents) && task.followingAgents.length ? (
                          task.followingAgents.map(agent => (
                            <span key={agent} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                              {agent}
                            </span>
                          ))
                        ) : '-'}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {task.contextFromDeps && (
                <div>
                  <span className="text-sm text-gray-500">上游产出上下文</span>
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                    {task.contextFromDeps}
                  </div>
                </div>
              )}

              {!isEditing && Array.isArray(task.artifacts) && task.artifacts.length ? (
                <div>
                  <span className="text-sm text-gray-500">产出物</span>
                  <div className="mt-2 space-y-2">
                    {task.artifacts.map((artifact, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-700">{artifact.name}</span>
                        <a href={artifact.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-sm hover:underline">
                          查看
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {!isEditing && task.stuck && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700 font-medium mb-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    任务卡死
                  </div>
                  <div className="text-sm text-red-600 mb-3">
                    任务已进行中超过 30 分钟无状态更新
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" onClick={() => handleResolveStuck('retry')}>
                      重试
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleResolveStuck('release')}>
                      释放
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleResolveStuck('fail')}>
                      标记失败
                    </Button>
                  </div>
                </div>
              )}

              {task.retryCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-orange-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  重试次数: {task.retryCount}/{task.maxRetries}
                </div>
              )}
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-4">
              {comments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  暂无评论
                </div>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      comment.authorType === 'system'
                        ? 'bg-gray-200 text-gray-600'
                        : comment.authorType === 'agent'
                        ? 'bg-blue-500 text-white'
                        : 'bg-green-500 text-white'
                    }`}>
                      {comment.authorType === 'system' ? '⚙️' : comment.authorName.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{comment.authorName}</span>
                        {comment.authorType === 'system' && (
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">系统</span>
                        )}
                        <span className="text-xs text-gray-400">
                          {new Date(comment.createdAt).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      <div className="mt-1 text-gray-700">{comment.content}</div>
                    </div>
                  </div>
                ))
              )}

              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <input
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="输入评论..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                />
                <Button onClick={handleAddComment} disabled={isLoading || !newComment.trim()}>
                  发送
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'dependencies' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">上游依赖 ({dependencies.length})</h4>
                {dependencies.length === 0 ? (
                  <div className="text-sm text-gray-400">无上游依赖</div>
                ) : (
                  <div className="space-y-2">
                    {dependencies.map(dep => (
                      <div key={dep.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">{dep.title}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            dep.status === 'done' ? 'bg-green-100 text-green-700' :
                            dep.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {TASK_STATUS_LABELS[dep.status]}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{dep.id}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">下游任务 ({dependents.length})</h4>
                {dependents.length === 0 ? (
                  <div className="text-sm text-gray-400">无下游任务</div>
                ) : (
                  <div className="space-y-2">
                    {dependents.map(dep => (
                      <div key={dep.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">{dep.title}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            dep.status === 'done' ? 'bg-green-100 text-green-700' :
                            dep.status === 'todo' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {TASK_STATUS_LABELS[dep.status]}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{dep.id}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-2">
            {task.status === 'failed' && (
              <Button onClick={handleRetry} variant="outline">
                重试任务
              </Button>
            )}
            {task.status === 'todo' && (
              <Button onClick={() => handleStatusChange('in_progress')} variant="outline">
                开始处理
              </Button>
            )}
            {task.status === 'in_progress' && (
              <Button onClick={() => handleStatusChange('done')} variant="outline">
                标记完成
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
