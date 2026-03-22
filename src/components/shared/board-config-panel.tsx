'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import type { BoardPerspective } from '@/lib/api/types';

interface BoardConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  perspectiveId: string;
  perspectiveType: 'human' | 'agent';
  onConfigChange: () => void;
}

interface ColumnConfig {
  status: string;
  visible: boolean;
  order: number;
}

interface SortConfig {
  field: string;
  order: 'asc' | 'desc';
}

export function BoardConfigPanel({
  isOpen,
  onClose,
  perspectiveId,
  perspectiveType,
  onConfigChange,
}: BoardConfigPanelProps) {
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { status: 'todo', visible: true, order: 1 },
    { status: 'in_progress', visible: true, order: 2 },
    { status: 'waiting_for_human', visible: true, order: 3 },
    { status: 'review', visible: true, order: 4 },
    { status: 'done', visible: true, order: 5 },
  ]);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(
          `/api/board/config?owner_id=${perspectiveId}&owner_type=${perspectiveType}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.columns && data.columns.length > 0) {
            setColumns(data.columns);
          }
          if (data.sort) {
            setSortField(data.sort.field || 'created_at');
            setSortOrder(data.sort.order || 'desc');
          }
        }
      } catch (error) {
        console.error('Failed to fetch board config:', error);
      }
    };
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen, perspectiveId, perspectiveType]);

  const handleSave = async () => {
    try {
      await fetch('/api/board/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_id: perspectiveId,
          owner_type: perspectiveType,
          columns,
          sort: { field: sortField, order: sortOrder },
        }),
      });
      onConfigChange();
      onClose();
    } catch (error) {
      console.error('Failed to save board config:', error);
    }
  };

  if (!isOpen) return null;

  const statusLabels: Record<string, string> = {
    todo: '待处理',
    in_progress: '进行中',
    waiting_for_human: '等待人工',
    review: '审核中',
    done: '已完成',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">看板配置</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">列显示</h3>
            <div className="space-y-2">
              {columns.map(col => (
                <label key={col.status} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={col.visible}
                    onChange={e => {
                      setColumns(prev =>
                        prev.map(c => (c.status === col.status ? { ...c, visible: e.target.checked } : c))
                      );
                    }}
                    className="w-4 h-4 text-blue-500 rounded"
                  />
                  <span className="text-sm text-gray-600">{statusLabels[col.status] || col.status}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">排序</h3>
            <div className="flex gap-2">
              <select
                value={sortField}
                onChange={e => setSortField(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="created_at">创建时间</option>
                <option value="priority">优先级</option>
                <option value="updated_at">更新时间</option>
              </select>
              <select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="desc">降序</option>
                <option value="asc">升序</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </div>
      </div>
    </div>
  );
}
