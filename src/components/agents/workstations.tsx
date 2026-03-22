'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import type { AgentWorkstation as AgentWorkstationType } from '@/lib/api/types';

export function AgentWorkstations() {
  const [workstations, setWorkstations] = useState<AgentWorkstationType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWorkstations = async () => {
      try {
        const response = await fetch('/api/agents/workstations');
        if (response.ok) {
          const data = await response.json();
          setWorkstations(data);
        }
      } catch (error) {
        console.error('Failed to fetch workstations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkstations();
    const interval = setInterval(fetchWorkstations, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (workstations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14-8v-4m8 0V8m-4 4h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p>暂无注册的 Agent</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {workstations.map(workstation => (
        <div
          key={workstation.id}
          className={`relative p-4 bg-white rounded-xl shadow-sm border-2 transition-all ${
            workstation.status === 'online'
              ? 'border-green-400'
              : workstation.status === 'idle'
              ? 'border-yellow-400'
              : 'border-gray-200'
          }`}
        >
          {workstation.status === 'online' && (
            <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 animate-pulse" />
            </div>
          )}

          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold ${
                workstation.status === 'online'
                  ? 'bg-gradient-to-br from-blue-400 to-purple-500 text-white'
                  : workstation.status === 'idle'
                  ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {workstation.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{workstation.name}</h3>
                <p className="text-xs text-gray-500 line-clamp-1">{workstation.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${
                workstation.status === 'online'
                  ? 'bg-green-500 animate-pulse'
                  : workstation.status === 'idle'
                  ? 'bg-yellow-500'
                  : 'bg-gray-300'
              }`} />
              <span className="text-xs text-gray-500">
                {workstation.status === 'online' ? '在线' : workstation.status === 'idle' ? '空闲' : '离线'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-blue-600">{workstation.taskStats.inProgress}</div>
              <div className="text-xs text-gray-500">进行中</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-orange-600">{workstation.taskStats.todo}</div>
              <div className="text-xs text-gray-500">待认领</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-green-600">{workstation.taskStats.completedToday}</div>
              <div className="text-xs text-gray-500">今日完成</div>
            </div>
          </div>

          {workstation.capabilities && workstation.capabilities.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {workstation.capabilities.slice(0, 3).map((cap, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                >
                  {cap}
                </span>
              ))}
              {workstation.capabilities.length > 3 && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  +{workstation.capabilities.length - 3}
                </span>
              )}
            </div>
          )}

          {workstation.status === 'offline' && workstation.offlineDuration && (
            <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              离线 {workstation.offlineDuration}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
