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
}

const PRIORITY_COLORS = {
  high: "bg-destructive",
  medium: "bg-amber-500",
  low: "bg-blue-500",
} as const;

const PRIORITY_LABELS = {
  high: "High",
  medium: "Medium",
  low: "Low",
} as const;

function TaskCard({
  task,
  index,
  onDelete,
}: {
  task: Task;
  index: number;
  onDelete: (id: string) => void;
}) {
  const isOverdue =
    task.due_date &&
    task.status !== "done" &&
    new Date(task.due_date + "T00:00:00") <
      new Date(new Date().toDateString());

  return (
    <Draggable draggableId={task.id} index={index}>
      {(p, sn) => (
        <div
          ref={p.innerRef}
          {...p.draggableProps}
          className={`group rounded-lg border border-border bg-card transition-all ${
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
            <button
              onClick={() => onDelete(task.id)}
              className="mt-0.5 rounded p-1 text-muted-foreground/40 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
            >
              <Trash2 size={13} />
            </button>
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
