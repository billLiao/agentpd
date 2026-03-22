'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Task, BoardPerspective } from '@/lib/api/types';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentPerspective: BoardPerspective;
}

interface TaskOption {
  id: string;
  title: string;
  status: string;
}

export function CreateTaskModal({ isOpen, onClose, onSuccess, currentPerspective }: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [priority, setPriority] = useState('p2');
  const [followingAgents, setFollowingAgents] = useState<string[]>([]);
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [maxRetries, setMaxRetries] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [availableTasks, setAvailableTasks] = useState<TaskOption[]>([]);
  const [availableAgents, setAvailableAgents] = useState<{ id: string; name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableData();
    }
  }, [isOpen]);

  const fetchAvailableData = async () => {
    try {
      const [tasksRes, agentsRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/agents'),
      ]);

      if (tasksRes.ok) {
        const tasks = await tasksRes.json();
        setAvailableTasks(tasks.filter((t: Task) => t.status !== 'done').map((t: Task) => ({
          id: t.id,
          title: t.title,
          status: t.status,
        })));
      }

      if (agentsRes.ok) {
        const agents = await agentsRes.json();
        setAvailableAgents(agents.map((a: { id: string; name: string }) => ({
          id: a.id,
          name: a.name,
        })));
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          objective,
          priority,
          creator_type: currentPerspective.type,
          creator_id: currentPerspective.id,
          following_agents: followingAgents,
          dependencies,
          max_retries: maxRetries,
        }),
      });

      if (response.ok) {
        setTitle('');
        setObjective('');
        setPriority('p2');
        setFollowingAgents([]);
        setDependencies([]);
        setMaxRetries(0);
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAgent = (agentId: string) => {
    setFollowingAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const toggleDependency = (taskId: string) => {
    setDependencies(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">新建任务</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="输入任务标题"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">目标描述</label>
            <textarea
              value={objective}
              onChange={e => setObjective(e.target.value)}
              placeholder="输入任务目标描述"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
            <div className="flex gap-4">
              {['p0', 'p1', 'p2', 'p3'].map(p => (
                <label key={p} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="priority"
                    value={p}
                    checked={priority === p}
                    onChange={() => setPriority(p)}
                    className="w-4 h-4 text-blue-500"
                  />
                  <span className="text-sm text-gray-600">{p.toUpperCase()}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">跟进 Agent</label>
            <div className="flex flex-wrap gap-2">
              {availableAgents.length === 0 ? (
                <span className="text-sm text-gray-400">暂无注册 Agent</span>
              ) : (
                availableAgents.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => toggleAgent(agent.id)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      followingAgents.includes(agent.id)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {agent.name}
                    {followingAgents.includes(agent.id) && (
                      <span className="ml-1">×</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <svg
                className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span>⚙️ 高级设置</span>
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">上游依赖</label>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {availableTasks.length === 0 ? (
                      <span className="text-sm text-gray-400">暂无可用任务</span>
                    ) : (
                      availableTasks.map(task => (
                        <label key={task.id} className="flex items-center gap-2 py-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={dependencies.includes(task.id)}
                            onChange={() => toggleDependency(task.id)}
                            className="w-4 h-4 text-blue-500 rounded"
                          />
                          <span className="text-sm text-gray-600 truncate flex-1">{task.title}</span>
                          <span className="text-xs text-gray-400">{task.id}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">自动重试</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="retry"
                        checked={maxRetries === 0}
                        onChange={() => setMaxRetries(0)}
                        className="w-4 h-4 text-blue-500"
                      />
                      <span className="text-sm text-gray-600">关闭</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="retry"
                        checked={maxRetries > 0}
                        onChange={() => setMaxRetries(maxRetries === 0 ? 3 : maxRetries)}
                        className="w-4 h-4 text-blue-500"
                      />
                      <span className="text-sm text-gray-600">启用</span>
                    </label>
                    {maxRetries > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">最大次数:</span>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={maxRetries}
                          onChange={e => setMaxRetries(parseInt(e.target.value) || 0)}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || isSubmitting}>
            {isSubmitting ? '创建中...' : '创建任务'}
          </Button>
        </div>
      </div>
    </div>
  );
}
