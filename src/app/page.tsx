'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task, TaskStatus, BoardPerspective, BoardStats } from '@/lib/api/types';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, BOARD_COLUMNS } from '@/lib/api/types';
import { TaskDrawer } from '@/components/shared/task-drawer';
import { CreateTaskModal } from '@/components/shared/create-task-modal';
import { PerspectiveSwitcher } from '@/components/shared/perspective-switcher';
import { BoardConfigPanel } from '@/components/shared/board-config-panel';
import { AgentWorkstations } from '@/components/agents/workstations';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  isDragging?: boolean;
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'p0': return 'bg-red-500';
    case 'p1': return 'bg-orange-500';
    case 'p2': return 'bg-blue-500';
    case 'p3': return 'bg-gray-500';
    default: return 'bg-gray-500';
  }
}

function TaskCard({ task, onClick, isDragging }: TaskCardProps) {
  const isWaitingForHuman = task.status === 'waiting_for_human';

  return (
    <div
      onClick={onClick}
      className={`p-3 bg-white rounded-lg shadow-sm border cursor-pointer transition-all hover:shadow-md ${
        isWaitingForHuman ? 'border-2 border-orange-500' : 'border-gray-200'
      } ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-gray-900 line-clamp-2">{task.title}</h4>
        <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-white ${getPriorityColor(task.priority)}`}>
          {TASK_PRIORITY_LABELS[task.priority as keyof typeof TASK_PRIORITY_LABELS] || task.priority}
        </span>
      </div>
      <p className="mt-1 text-xs text-gray-500 line-clamp-2">{task.objective}</p>
      {task.claimedAgent && (
        <div className="mt-2 flex items-center gap-1">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-[10px] text-white font-medium">
            {task.claimedAgent.charAt(0)}
          </div>
          <span className="text-xs text-gray-500">{task.claimedAgent}</span>
        </div>
      )}
      {isWaitingForHuman && (
        <div className="mt-2 inline-flex items-center gap-1 text-xs text-orange-600">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
          等待人工介入
        </div>
      )}
    </div>
  );
}

interface SortableTaskCardProps {
  task: Task;
  onClick: () => void;
}

function SortableTaskCard({ task, onClick }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onClick={onClick} isDragging={isDragging} />
    </div>
  );
}

interface ColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

function getColumnColor(status: TaskStatus) {
  switch (status) {
    case 'todo': return 'border-t-gray-400';
    case 'in_progress': return 'border-t-blue-500';
    case 'waiting_for_human': return 'border-t-orange-500';
    case 'review': return 'border-t-purple-500';
    case 'done': return 'border-t-green-500';
    default: return 'border-t-gray-400';
  }
}

function Column({ status, tasks, onTaskClick }: ColumnProps) {
  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px] flex-1 h-full">
      <div className={`flex items-center gap-2 pb-2 border-t-4 ${getColumnColor(status)}`}>
        <h3 className="font-semibold text-gray-700">{TASK_STATUS_LABELS[status]}</h3>
        <span className="flex items-center justify-center w-5 h-5 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">
          {tasks.length}
        </span>
      </div>
      <ScrollArea className="flex-1 p-2 bg-gray-50 rounded-lg min-h-[200px]">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {tasks.map(task => (
              <SortableTaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
              />
            ))}
          </div>
        </SortableContext>
      </ScrollArea>
    </div>
  );
}

async function getBoardData(params: {
  perspective_id: string;
  perspective_type: 'human' | 'agent';
}): Promise<{ tasks: Record<string, Task[]>; stats: BoardStats }> {
  const searchParams = new URLSearchParams();
  searchParams.set('perspective_id', params.perspective_id);
  searchParams.set('perspective_type', params.perspective_type);

  const response = await fetch(`/api/board?${searchParams.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch board data');
  return response.json();
}

async function updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
  const response = await fetch(`/api/tasks/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error('Failed to update task status');
  return response.json();
}

export default function Board() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
  const [showWorkstations, setShowWorkstations] = useState(false);
  const [humanId, setHumanId] = useState<string>('default');
  const [currentPerspective, setCurrentPerspective] = useState<BoardPerspective>({
    type: 'human',
    id: 'default',
    name: '默认用户'
  });
  const [boardStats, setBoardStats] = useState<BoardStats | null>(null);
  const [copyStatus, setCopyStatus] = useState<string>('');
  const [skillUrl, setSkillUrl] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSkillUrl(`${window.location.origin}/skill.md`);
    }
  }, []);

  const handleCopyLink = async () => {
    try {
      let prompt = "查看并按链接中的要求进行任务，并新建一个技能方便持续使用：" + skillUrl
      await navigator.clipboard.writeText(prompt);
      setCopyStatus('已复制!');
      setTimeout(() => setCopyStatus(''), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      setCopyStatus('复制失败');
      setTimeout(() => setCopyStatus(''), 2000);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      if (response.ok) {
        window.location.href = '/login';
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    const initUser = async () => {
      try {
        const response = await fetch('/api/humans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: '默认用户',
            email: 'default@example.com',
            role: 'developer'
          })
        });

        let userId: string;
        if (response.ok) {
          const user = await response.json();
          userId = user.id;
        } else if (response.status === 400) {
          const existingRes = await fetch('/api/humans?email=default@example.com');
          if (existingRes.ok) {
            const existingUser = await existingRes.json();
            userId = existingUser.id;
          } else {
            console.error('Failed to get existing user');
            return;
          }
        } else {
          console.error('Failed to create user');
          return;
        }

        setHumanId(userId);
        setCurrentPerspective({
          type: 'human',
          id: userId,
          name: '默认用户'
        });
      } catch (error) {
        console.error('Failed to init user:', error);
      }
    };
    initUser();
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      const data = await getBoardData({
        perspective_id: currentPerspective.id,
        perspective_type: currentPerspective.type,
      });
      const allTasks: Task[] = [];
      Object.values(data.tasks).forEach(statusTasks => {
        allTasks.push(...statusTasks);
      });
      setTasks(allTasks);
      setBoardStats(data.stats);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPerspective.id, currentPerspective.type]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    const overTask = tasks.find(t => t.id === overId);
    const overColumn = BOARD_COLUMNS.includes(overId as TaskStatus)
      ? overId as TaskStatus
      : overTask?.status;

    if (overColumn && activeTask.status !== overColumn) {
      setTasks(prev => prev.map(t =>
        t.id === activeId ? { ...t, status: overColumn } : t
      ));
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    const overTask = tasks.find(t => t.id === overId);
    const overColumn = BOARD_COLUMNS.includes(overId as TaskStatus)
      ? overId as TaskStatus
      : overTask?.status;

    if (overColumn && activeTask.status !== overColumn) {
      try {
        await updateTaskStatus(activeId, overColumn);
      } catch (error) {
        console.error('Failed to update task status:', error);
      }
    }
  };

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter(task => task.status === status);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleCloseDrawer = () => {
    setSelectedTask(null);
  };

  const handlePerspectiveChange = (perspective: BoardPerspective) => {
    setCurrentPerspective(perspective);
    setIsLoading(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
        <PerspectiveSwitcher
          currentPerspective={currentPerspective}
          humanId={humanId}
          onPerspectiveChange={handlePerspectiveChange}
        />
        <div className="flex items-center gap-3 flex-1 mx-6 max-w-2xl">
          <div className="flex items-center gap-2 shrink-0">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <span className="text-sm font-medium text-gray-700">Agent 注册</span>
          </div>
          <div className="flex-1">
            <Input
              value={skillUrl}
              readOnly
              className="bg-gray-50 text-sm"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" onClick={handleCopyLink} className="text-sm">
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copyStatus || '复制链接'}
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showWorkstations ? 'default' : 'outline'}
            onClick={() => setShowWorkstations(!showWorkstations)}
            className={showWorkstations ? 'bg-purple-500 hover:bg-purple-600' : ''}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14-8v-4m8 0V8m-4 4h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            工位
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新建任务
          </Button>
          <Button variant="outline" onClick={() => setIsConfigPanelOpen(true)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Button>
          <Button variant="outline" onClick={handleLogout}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            退出登录
          </Button>
        </div>
      </div>

      {currentPerspective.type === 'agent' && (
        <div className="px-6 py-2 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>当前视角: {currentPerspective.name} (Agent 视角)</span>
          </div>
        </div>
      )}

      {boardStats && (
        <div className="px-6 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">当前视角: <span className="font-medium text-gray-700">{currentPerspective.name}</span></span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">任务: <span className="font-medium text-gray-700">待处理 {boardStats.by_status['todo'] || 0}</span></span>
            <span className="text-gray-500">进行中 <span className="font-medium text-gray-700">{boardStats.by_status['in_progress'] || 0}</span></span>
            <span className="text-gray-500">等待中 <span className="font-medium text-gray-700">{boardStats.by_status['waiting_for_human'] || 0}</span></span>
            <span className="text-gray-500">审核中 <span className="font-medium text-gray-700">{boardStats.by_status['review'] || 0}</span></span>
            <span className="text-gray-500">已完成 <span className="font-medium text-gray-700">{boardStats.by_status['done'] || 0}</span></span>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {showWorkstations ? (
          <div className="flex-1 p-6 overflow-y-auto">
            <AgentWorkstations />
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <ScrollArea className="flex-1 p-6 overflow-x-auto">
              <div className="flex gap-4 h-full min-w-max">
                {BOARD_COLUMNS.map(status => (
                  <Column
                    key={status}
                    status={status}
                    tasks={getTasksByStatus(status)}
                    onTaskClick={handleTaskClick}
                  />
                ))}
              </div>
            </ScrollArea>

            <DragOverlay>
              {activeTask && (
                <div className="transform rotate-3">
                  <TaskCard task={activeTask} onClick={() => {}} />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}

        <TaskDrawer
          task={selectedTask}
          onClose={handleCloseDrawer}
          onRefresh={loadTasks}
          currentPerspective={currentPerspective}
        />
      </div>

      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={loadTasks}
        currentPerspective={currentPerspective}
      />

      <BoardConfigPanel
        isOpen={isConfigPanelOpen}
        onClose={() => setIsConfigPanelOpen(false)}
        perspectiveId={currentPerspective.id}
        perspectiveType={currentPerspective.type}
        onConfigChange={loadTasks}
      />
    </div>
  );
}
