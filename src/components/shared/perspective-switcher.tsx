'use client';

import { useState, useEffect } from 'react';
import type { BoardPerspective } from '@/lib/api/types';

interface PerspectiveSwitcherProps {
  currentPerspective: BoardPerspective;
  humanId: string;
  onPerspectiveChange: (perspective: BoardPerspective) => void;
}

interface AccessibleAgent {
  id: string;
  name: string;
  status: string;
}

export function PerspectiveSwitcher({
  currentPerspective,
  humanId,
  onPerspectiveChange,
}: PerspectiveSwitcherProps) {
  const [agents, setAgents] = useState<AccessibleAgent[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch('/api/agents');
        if (response.ok) {
          const data = await response.json();
          setAgents(data);
        }
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      }
    };
    fetchAgents();
  }, []);

  const handleChange = (agentId: string | 'human') => {
    if (agentId === 'human') {
      onPerspectiveChange({
        type: 'human',
        id: humanId,
        name: '我的视角',
      });
    } else {
      const agent = agents.find(a => a.id === agentId);
      onPerspectiveChange({
        type: 'agent',
        id: agentId,
        name: agent?.name || 'Agent',
      });
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
      >
        <span className="text-lg">
          {currentPerspective.type === 'human' ? '🧑' : '🤖'}
        </span>
        <span className="font-medium">{currentPerspective.name}</span>
        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="py-1">
            <button
              onClick={() => handleChange('human')}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                currentPerspective.type === 'human' ? 'bg-blue-50 text-blue-600' : ''
              }`}
            >
              <span>🧑</span>
              <span>我的视角</span>
            </button>

            {agents && agents.length > 0 && (
              <>
                <div className="border-t border-gray-100 my-1" />
                <div className="px-4 py-1 text-xs text-gray-400">Agent 视角</div>
                {agents.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => handleChange(agent.id)}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                      currentPerspective.type === 'agent' && currentPerspective.id === agent.id
                        ? 'bg-blue-50 text-blue-600'
                        : ''
                    }`}
                  >
                    <span>🤖</span>
                    <span className="flex-1 truncate">{agent.name}</span>
                    <span className={`w-2 h-2 rounded-full ${
                      agent.status === 'online' ? 'bg-green-500' :
                      agent.status === 'idle' ? 'bg-yellow-500' : 'bg-gray-300'
                    }`} />
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
