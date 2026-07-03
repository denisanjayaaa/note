import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Trash2,
  GripVertical,
  MoreHorizontal,
  CalendarDays,
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import type { Task } from "./data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TasksViewProps {
  tasks: Task[];
  addTask: (
    title: string,
    priority: Task["priority"],
    dueDate?: string
  ) => Promise<void>;
  updateTaskStatus: (id: string, status: Task["status"]) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addSubtask?: (taskId: string, title: string) => Promise<void>;
  toggleSubtask?: (taskId: string, subtaskId: string) => Promise<void>;
  updateTags?: (taskId: string, tags: string[]) => Promise<void>;
}

const PRIORITY_LABELS = {
  high: "High",
  medium: "Medium",
  low: "Low",
} as const;

const TAG_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  "bg-pink-100 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400",
  "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
  "bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400",
];

const ALL_TAGS = ["frontend", "backend", "design", "bug", "feature", "docs", "urgent", "research"];

function SubtaskItem({
  subtask,
  onToggle,
}: {
  subtask: { id: string; title: string; done: boolean };
  onToggle: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onToggle(subtask.id)}
      className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs transition-colors hover:bg-accent/50"
    >
      <span
        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border transition-colors ${
          subtask.done
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-muted-foreground/30"
        }`}
      >
        {subtask.done && <span className="text-[8px]">✓</span>}
      </span>
      <span className={subtask.done ? "text-muted-foreground line-through" : ""}>
        {subtask.title}
      </span>
    </button>
  );
}

function TaskCard({
  task,
  index,
  onDelete,
  onToggleSubtask,
  onAddSubtask,
  onUpdateTags,
  onRemoveTag,
}: {
  task: Task;
  index: number;
  onDelete: (id: string) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onAddSubtask?: (taskId: string, title: string) => void;
  onUpdateTags?: (taskId: string, tags: string[]) => void;
  onRemoveTag?: (taskId: string, tag: string) => void;
}) {
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [newSubtask, setNewSubtask] = useState("");

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.trim() || !onAddSubtask) return;
    onAddSubtask(task.id, newSubtask.trim());
    setNewSubtask("");
  };

  const handleSelectTag = (tag: string) => {
    const current = task.tags || [];
    if (current.includes(tag)) {
      onRemoveTag?.(task.id, tag);
    } else {
      onUpdateTags?.(task.id, [...current, tag]);
    }
  };

  const isOverdue =
    task.due_date &&
    task.status !== "done" &&
    new Date(task.due_date + "T00:00:00") <
      new Date(new Date().toDateString());

  const doneSubtasks = task.subtasks?.filter((s) => s.done).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  return (
    <Draggable draggableId={task.id} index={index}>
      {(p, sn) => (
        <div
          ref={p.innerRef}
          {...p.draggableProps}
          className={`group relative rounded-lg border border-border bg-card transition-all ${
            sn.isDragging ? "z-50 shadow-lg" : ""
          } ${isOverdue ? "border-l-2 border-l-destructive" : ""}`}
        >
          <div className="flex items-start gap-2 p-3">
            <div
              {...p.dragHandleProps}
              className="mt-0.5 cursor-grab text-muted-foreground/30 opacity-0 transition-opacity hover:text-muted-foreground/60 group-hover:opacity-100"
            >
              <GripVertical size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{task.title}</p>

              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {task.tags.map((tag, ti) => (
                    <span
                      key={ti}
                      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                        TAG_COLORS[ti % TAG_COLORS.length]
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Subtasks */}
              {totalSubtasks > 0 && (
                <div className="mt-1.5">
                  <button
                    onClick={() => setShowSubtasks(!showSubtasks)}
                    className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    <div className="flex h-1 w-12 overflow-hidden rounded-full bg-muted-foreground/20">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${(doneSubtasks / totalSubtasks) * 100}%` }}
                      />
                    </div>
                    <span>{doneSubtasks}/{totalSubtasks}</span>
                    <span className="text-[8px]">{showSubtasks ? "▲" : "▼"}</span>
                  </button>
                  {showSubtasks && (
                    <div className="mt-1 space-y-0.5">
                      {task.subtasks.map((st) => (
                        <SubtaskItem
                          key={st.id}
                          subtask={st}
                          onToggle={(id) => onToggleSubtask?.(task.id, id)}
                        />
                      ))}
                      <form onSubmit={handleAddSubtask} className="mt-1 flex gap-1">
                        <input
                          value={newSubtask}
                          onChange={(e) => setNewSubtask(e.target.value)}
                          placeholder="+ Add subtask..."
                          className="flex-1 rounded border-0 bg-transparent px-2 py-0.5 text-xs outline-none ring-1 ring-border focus:ring-ring"
                        />
                      </form>
                    </div>
                  )}
                </div>
              )}

              {/* Priority & due date */}
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    task.priority === "high"
                      ? "bg-destructive/10 text-destructive"
                      : task.priority === "medium"
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                        : "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                  }`}
                >
                  {PRIORITY_LABELS[task.priority]}
                </span>
                {task.due_date && (
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] ${
                      isOverdue
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}
                  >
                    <CalendarDays size={10} />
                    {new Date(task.due_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 gap-0.5">
              {/* Tag button */}
              {onUpdateTags && (
                <div className="relative">
                  <button
                    onClick={() => setShowTags(!showTags)}
                    className="mt-0.5 rounded p-1 text-muted-foreground/40 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                    title="Add tag"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/>
                      <path d="M7 7h.01"/>
                    </svg>
                  </button>
                  {showTags && (
                    <div
                      className="absolute right-0 top-full z-10 mt-1 w-44 rounded-lg border border-border bg-card p-2 shadow-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-wrap gap-1">
                        {ALL_TAGS.map((tag) => {
                          const isActive = task.tags?.includes(tag);
                          return (
                            <button
                              key={tag}
                              onClick={() => handleSelectTag(tag)}
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                                isActive
                                  ? "bg-foreground text-background"
                                  : "bg-muted text-muted-foreground hover:bg-accent"
                              }`}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={() => onDelete(task.id)}
                className="mt-0.5 rounded p-1 text-muted-foreground/40 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                title="Delete task"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

export function TasksView({
  tasks,
  addTask,
  updateTaskStatus,
  deleteTask,
  addSubtask,
  toggleSubtask,
  updateTags,
}: TasksViewProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [dueDate, setDueDate] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await addTask(title.trim(), priority, dueDate || undefined);
    setTitle("");
    setPriority("medium");
    setDueDate("");
    setShowForm(false);
  };

  const onDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      updateTaskStatus(
        result.draggableId,
        result.destination.droppableId as Task["status"]
      );
    },
    [updateTaskStatus]
  );

  const handleUpdateTags = useCallback(
    (taskId: string, tags: string[]) => {
      updateTags?.(taskId, tags);
    },
    [updateTags]
  );

  const handleRemoveTag = useCallback(
    (taskId: string, tag: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      updateTags?.(
        taskId,
        (task.tags || []).filter((t) => t !== tag)
      );
    },
    [tasks, updateTags]
  );

  const columns = [
    {
      id: "todo" as const,
      label: "To Do",
      color: "border-t-sky-500",
      dot: "bg-sky-500",
    },
    {
      id: "in_progress" as const,
      label: "In Progress",
      color: "border-t-amber-500",
      dot: "bg-amber-500",
    },
    {
      id: "done" as const,
      label: "Done",
      color: "border-t-emerald-500",
      dot: "bg-emerald-500",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          size="sm"
          className="gap-1.5"
        >
          <Plus size={15} />
          Add Task
        </Button>
      </div>

      {showForm && (
        <motion.form
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleAdd}
          className="rounded-lg border border-border bg-card p-4"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task name..."
              className="sm:col-span-2"
            />
            <select
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as Task["priority"])
              }
              className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button type="submit" size="sm" disabled={!title.trim()}>
              Add
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowForm(false);
                setTitle("");
                setDueDate("");
              }}
            >
              Cancel
            </Button>
          </div>
        </motion.form>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {columns.map((col) => {
            const items = tasks.filter((t) => t.status === col.id);
            return (
              <Droppable key={col.id} droppableId={col.id}>
                {(p, sn) => (
                  <div
                    ref={p.innerRef}
                    {...p.droppableProps}
                    className={`flex min-h-[300px] flex-col rounded-lg border-2 border-t-4 bg-muted/30 ${
                      col.color
                    } ${
                      sn.isDraggingOver
                        ? "border-accent bg-accent/30"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${col.dot}`}
                        />
                        <h3 className="text-sm font-semibold">{col.label}</h3>
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {items.length}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2 px-3 pb-3">
                      {items.map((t, i) => (
                        <TaskCard
                          key={t.id}
                          task={t}
                          index={i}
                          onDelete={deleteTask}
                          onToggleSubtask={toggleSubtask}
                          onAddSubtask={addSubtask}
                          onUpdateTags={handleUpdateTags}
                          onRemoveTag={handleRemoveTag}
                        />
                      ))}
                      {p.placeholder}
                      {items.length === 0 && !sn.isDraggingOver && (
                        <div className="flex flex-col items-center justify-center py-10">
                          <MoreHorizontal
                            size={18}
                            className="text-muted-foreground/30"
                          />
                          <p className="mt-2 text-xs text-muted-foreground/50">
                            Drop tasks here
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </motion.div>
  );
}
