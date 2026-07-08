import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  GripVertical,
  MoreHorizontal,
  CalendarDays,
  Edit3,
  Check,
  X,
  Pin,
  Folder,
  FileText,
  ListChecks,
  Sparkles,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import type { Task, Note } from "./data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePickerPopover } from "@/components/ui/date-picker-popover";
import { parseNaturalInput } from "@/lib/deepseek";

// ─── Types ───

interface TasksNotesViewProps {
  tasks: Task[];
  notes: Note[];
  folders: string[];
  addTask: (title: string, priority: Task["priority"], dueDate?: string) => Promise<void>;
  updateTaskStatus: (id: string, status: Task["status"]) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addSubtask?: (taskId: string, title: string) => Promise<void>;
  toggleSubtask?: (taskId: string, subtaskId: string) => Promise<void>;
  updateTags?: (taskId: string, tags: string[]) => Promise<void>;
  updateTask?: (id: string, data: { title?: string; priority?: Task["priority"]; due_date?: string | null; description?: string }) => Promise<void>;
  addNote: (title: string, content: string, folder_path?: string) => Promise<void>;
  togglePinNote: (id: string, cur: boolean) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  updateNote?: (id: string, title: string, content: string) => Promise<void>;
  onNoteSelect?: (note: Note) => void;
}

// ─── Constants ───

const PRIORITY_LABELS = { high: "High", medium: "Medium", low: "Low" } as const;

const TAG_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  "bg-pink-100 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400",
  "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
  "bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400",
];

// ─── Subtask Item ───

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

// ─── Task Card ───

function TaskCard({
  task,
  index,
  onDelete,
  onToggleSubtask,
  onAddSubtask,
  onUpdateTags,
  onRemoveTag,
  onEdit,
}: {
  task: Task;
  index: number;
  onDelete: (id: string) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onAddSubtask?: (taskId: string, title: string) => void;
  onUpdateTags?: (taskId: string, tags: string[]) => void;
  onRemoveTag?: (taskId: string, tag: string) => void;
  onEdit?: (task: Task) => void;
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
    new Date(task.due_date + "T00:00:00") < new Date(new Date().toDateString());

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
                      isOverdue ? "text-destructive" : "text-muted-foreground"
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
              {onEdit && (
                <button
                  onClick={() => onEdit(task)}
                  className="mt-0.5 rounded p-1 text-muted-foreground/40 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                  title="Edit task"
                >
                  <Edit3 size={13} />
                </button>
              )}
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
                        {["frontend","backend","design","bug","feature","docs","urgent","research"].map((tag) => {
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

// ─── Edit Task Modal ───

function EditTaskModal({
  task,
  onSave,
  onClose,
}: {
  task: Task;
  onSave: (id: string, data: { title: string; priority: Task["priority"]; due_date: string | null; description: string }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(task.due_date || "");
  const [description, setDescription] = useState(task.description);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(task.id, { title: title.trim(), priority, due_date: dueDate || null, description: description.trim() });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl"
        >
          <form onSubmit={handleSave} className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Edit Task</h3>
              <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-accent">
                <X size={15} />
              </button>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" autoFocus />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Task description..."
                rows={2}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Task["priority"])}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Due Date</label>
                <DatePickerPopover
                  value={dueDate || undefined}
                  onChange={(d) => setDueDate(d || "")}
                  placeholder="Set due date"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" size="sm" disabled={!title.trim()} className="gap-1">
                <Check size={13} /> Save
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={onClose} className="gap-1">
                Cancel
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </>
  );
}

// ─── Notes Panel ───

function NotesPanel({
  notes,
  togglePinNote,
  deleteNote,
  updateNote,
  onNoteSelect,
}: {
  notes: Note[];
  togglePinNote: (id: string, cur: boolean) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  updateNote?: (id: string, title: string, content: string) => Promise<void>;
  onNoteSelect?: (note: Note) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  const pinned = notes.filter((n) => n.is_pinned);
  const unpinned = notes.filter((n) => !n.is_pinned);

  const startEditing = (note: Note) => {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
  };

  const saveEdit = async () => {
    if (!editingId || !editTitle.trim()) return;
    await updateNote?.(editingId, editTitle.trim(), editContent.trim());
    setEditingId(null);
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-muted-foreground" />
          <span className="text-sm font-semibold">Notes</span>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {notes.length}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground/50">{collapsed ? "▲" : "▼"}</span>
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="max-h-[500px] space-y-0.5 overflow-y-auto p-2">
              {/* Pinned notes */}
              {pinned.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  isEditing={editingId === note.id}
                  editTitle={editTitle}
                  editContent={editContent}
                  onEditTitle={setEditTitle}
                  onEditContent={setEditContent}
                  onStartEdit={() => startEditing(note)}
                  onSaveEdit={saveEdit}
                  onCancelEdit={() => setEditingId(null)}
                  onTogglePin={() => togglePinNote(note.id, note.is_pinned)}
                  onDelete={() => deleteNote(note.id)}
                  onNoteSelect={onNoteSelect}
                />
              ))}

              {/* Separator if both pinned and unpinned exist */}
              {pinned.length > 0 && unpinned.length > 0 && (
                <div className="my-1 border-t border-border/50" />
              )}

              {/* Unpinned notes */}
              {unpinned.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  isEditing={editingId === note.id}
                  editTitle={editTitle}
                  editContent={editContent}
                  onEditTitle={setEditTitle}
                  onEditContent={setEditContent}
                  onStartEdit={() => startEditing(note)}
                  onSaveEdit={saveEdit}
                  onCancelEdit={() => setEditingId(null)}
                  onTogglePin={() => togglePinNote(note.id, note.is_pinned)}
                  onDelete={() => deleteNote(note.id)}
                  onNoteSelect={onNoteSelect}
                />
              ))}

              {notes.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground/50">
                  No notes yet
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Note Card ───

function NoteCard({
  note,
  isEditing,
  editTitle,
  editContent,
  onEditTitle,
  onEditContent,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onTogglePin,
  onDelete,
  onNoteSelect,
}: {
  note: Note;
  isEditing: boolean;
  editTitle: string;
  editContent: string;
  onEditTitle: (v: string) => void;
  onEditContent: (v: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
  onNoteSelect?: (note: Note) => void;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onCancelEdit();
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSaveEdit();
  };

  return (
    <div
      className={`group rounded-lg border px-3 py-2 transition-all ${
        note.is_pinned
          ? "border-l-2 border-l-amber-400 border-border bg-amber-50/30 dark:bg-amber-500/5"
          : "border-transparent hover:border-border hover:bg-accent/30"
      } ${isEditing ? "border-border bg-card ring-1 ring-ring" : ""}`}
    >
      {isEditing ? (
        <div className="space-y-2" onKeyDown={handleKeyDown}>
          <Input
            value={editTitle}
            onChange={(e) => onEditTitle(e.target.value)}
            placeholder="Note title..."
            className="h-7 border-0 bg-transparent px-0 text-sm font-medium shadow-none focus-visible:ring-0"
            autoFocus
          />
          <textarea
            value={editContent}
            onChange={(e) => onEditContent(e.target.value)}
            placeholder="Write something..."
            rows={2}
            className="w-full resize-none border-0 bg-transparent px-0 text-xs text-muted-foreground placeholder:text-muted-foreground/40 focus:outline-none"
          />
          <div className="flex gap-1">
            <button
              onClick={onSaveEdit}
              disabled={!editTitle.trim()}
              className="rounded bg-foreground/10 px-2 py-0.5 text-[10px] font-medium text-foreground hover:bg-foreground/20 disabled:opacity-40"
            >
              Save
            </button>
            <button
              onClick={onCancelEdit}
              className="rounded px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <button
              onClick={() => { onStartEdit(); onNoteSelect?.(note); }}
              className="w-full text-left"
            >
              <p className="text-sm font-medium leading-tight truncate">{note.title}</p>
              {note.content && (
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{note.content}</p>
              )}
            </button>
            {note.folder_path && note.folder_path !== "/" && (
              <div className="mt-1 flex items-center gap-1">
                <Folder size={9} className="text-muted-foreground/40" />
                <span className="text-[9px] text-muted-foreground/40">{note.folder_path}</span>
              </div>
            )}
          </div>
          <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => { onStartEdit(); onNoteSelect?.(note); }}
              className="rounded p-0.5 text-muted-foreground/40 hover:text-foreground"
              title="Edit note"
            >
              <Edit3 size={11} />
            </button>
            <button
              onClick={onTogglePin}
              className={`rounded p-0.5 transition-colors ${
                note.is_pinned ? "text-amber-500" : "text-muted-foreground/40 hover:text-foreground"
              }`}
              title={note.is_pinned ? "Unpin" : "Pin"}
            >
              <Pin size={11} />
            </button>
            <button
              onClick={onDelete}
              className="rounded p-0.5 text-muted-foreground/40 hover:text-destructive"
              title="Delete note"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Combined View ───

export function TasksNotesView({
  tasks,
  notes,
  folders,
  addTask,
  updateTaskStatus,
  deleteTask,
  addSubtask,
  toggleSubtask,
  updateTags,
  updateTask,
  addNote,
  togglePinNote,
  deleteNote,
  updateNote,
  onNoteSelect,
}: TasksNotesViewProps) {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<Task["priority"]>("medium");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // AI Smart Add
  const [smartInput, setSmartInput] = useState("");
  const [smartLoading, setSmartLoading] = useState(false);
  const [smartResult, setSmartResult] = useState<string | null>(null);
  const [smartError, setSmartError] = useState<string | null>(null);

  const handleSmartAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smartInput.trim() || smartLoading) return;
    setSmartLoading(true);
    setSmartResult(null);
    setSmartError(null);

    try {
      const parsed = await parseNaturalInput(smartInput.trim());

      // Create note if AI detected one
      if (parsed.note) {
        await addNote(parsed.note.title, parsed.note.content);
      }

      // Create task if AI detected one
      if (parsed.task) {
        await addTask(parsed.task.title, parsed.task.priority, parsed.task.due_date || undefined);
      }

      // If neither, create both as fallback
      if (!parsed.note && !parsed.task) {
        await addNote(smartInput.trim(), `Auto-created from: ${smartInput.trim()}`);
        await addTask(smartInput.trim(), "medium");
      }

      setSmartResult(parsed.summary || "Created successfully!");
      setSmartInput("");
    } catch (err) {
      setSmartError("Failed to process. Creating note and task manually.");
      // Fallback: create manually
      await addNote(smartInput.trim(), `Auto-created from: ${smartInput.trim()}`);
      await addTask(smartInput.trim(), "medium");
      setSmartInput("");
    } finally {
      setSmartLoading(false);
      setTimeout(() => { setSmartResult(null); setSmartError(null); }, 3000);
    }
  };

  // Task handlers
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    await addTask(taskTitle.trim(), taskPriority, taskDueDate || undefined);
    setTaskTitle("");
    setTaskPriority("medium");
    setTaskDueDate("");
    setShowTaskForm(false);
  };

  const onDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      updateTaskStatus(result.draggableId, result.destination.droppableId as Task["status"]);
    },
    [updateTaskStatus]
  );

  const handleUpdateTags = useCallback(
    (taskId: string, tags: string[]) => updateTags?.(taskId, tags),
    [updateTags]
  );

  const handleRemoveTag = useCallback(
    (taskId: string, tag: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      updateTags?.(taskId, (task.tags || []).filter((t) => t !== tag));
    },
    [tasks, updateTags]
  );

  const handleEditSave = useCallback(
    (id: string, data: { title: string; priority: Task["priority"]; due_date: string | null; description: string }) => {
      updateTask?.(id, data);
    },
    [updateTask]
  );

  // Note handlers
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;
    await addNote(noteTitle.trim(), noteContent.trim());
    setNoteTitle("");
    setNoteContent("");
    setShowNoteForm(false);
  };

  const columns = [
    { id: "todo" as const, label: "To Do", color: "border-t-sky-500", dot: "bg-sky-500" },
    { id: "in_progress" as const, label: "In Progress", color: "border-t-amber-500", dot: "bg-amber-500" },
    { id: "done" as const, label: "Done", color: "border-t-emerald-500", dot: "bg-emerald-500" },
  ];

  const activeTasks = tasks.filter((t) => t.status !== "done");
  const doneCount = tasks.filter((t) => t.status === "done").length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-7xl"
    >
      {/* Unified Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <ListChecks size={22} className="text-muted-foreground" />
            Tasks &amp; Notes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeTasks.length} active task{activeTasks.length !== 1 ? "s" : ""}
            {doneCount > 0 && ` · ${doneCount} done`}
            {notes.length > 0 && ` · ${notes.length} note${notes.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => { setShowTaskForm(!showTaskForm); setShowNoteForm(false); }}
            size="sm"
            variant={showTaskForm ? "secondary" : "default"}
            className="gap-1.5"
          >
            <Plus size={14} />
            Task
          </Button>
          <Button
            onClick={() => { setShowNoteForm(!showNoteForm); setShowTaskForm(false); }}
            size="sm"
            variant={showNoteForm ? "secondary" : "outline"}
            className="gap-1.5"
          >
            <FileText size={14} />
            Note
          </Button>
        </div>
      </div>

      {/* AI Smart Add */}
      <form onSubmit={handleSmartAdd} className="relative mb-4">
        <div className={`flex items-center gap-2 rounded-lg border bg-card px-4 py-3 transition-all ${
          smartLoading ? "border-amber-400 ring-1 ring-amber-400/30" :
          smartResult ? "border-emerald-400 ring-1 ring-emerald-400/30" :
          smartError ? "border-destructive/50 ring-1 ring-destructive/20" :
          "border-border hover:border-muted-foreground/30"
        }`}>
          <Sparkles size={16} className={`shrink-0 ${
            smartLoading ? "text-amber-500 animate-pulse" :
            smartResult ? "text-emerald-500" :
            "text-amber-500/60"
          }`} />
          <input
            value={smartInput}
            onChange={(e) => setSmartInput(e.target.value)}
            placeholder="Tulis task atau note dengan AI... contoh: &quot;pertemuan meeting tanggal 10 jul 2026, high&quot;"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40"
            disabled={smartLoading}
          />
          {smartLoading ? (
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          ) : smartResult ? (
            <CheckCircle2 size={16} className="text-emerald-500" />
          ) : (
            <button
              type="submit"
              disabled={!smartInput.trim()}
              className="rounded-md bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-600 transition-colors hover:bg-amber-500/20 disabled:opacity-40 dark:text-amber-400"
            >
              AI Add
            </button>
          )}
        </div>
        {smartResult && (
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">✓ {smartResult}</p>
        )}
        {smartError && (
          <p className="mt-1 text-xs text-destructive">{smartError}</p>
        )}
      </form>

      {/* Quick-add forms */}
      <AnimatePresence>
        {showTaskForm && (
          <motion.form
            key="task-form"
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            onSubmit={handleAddTask}
            className="mb-4 overflow-hidden rounded-lg border border-border bg-card p-4"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <Input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Task name..."
                className="sm:col-span-2"
                autoFocus
              />
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value as Task["priority"])}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <DatePickerPopover
                value={taskDueDate || undefined}
                onChange={(d) => setTaskDueDate(d || "")}
                placeholder="Due date"
              />
            </div>
            <div className="mt-3 flex gap-2">
              <Button type="submit" size="sm" disabled={!taskTitle.trim()}>Add</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => { setShowTaskForm(false); setTaskTitle(""); setTaskDueDate(""); }}>Cancel</Button>
            </div>
          </motion.form>
        )}

        {showNoteForm && (
          <motion.form
            key="note-form"
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            onSubmit={handleAddNote}
            className="mb-4 overflow-hidden rounded-lg border border-border bg-card p-4"
          >
            <div className="space-y-3">
              <Input
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Note title..."
                className="border-0 bg-transparent px-0 text-base font-medium shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0"
                autoFocus
              />
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Write something..."
                rows={2}
                className="w-full resize-none border-0 bg-transparent px-0 text-sm text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none"
              />
            </div>
            <div className="mt-3 flex gap-2">
              <Button type="submit" size="sm" disabled={!noteTitle.trim()}>Save Note</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => { setShowNoteForm(false); setNoteTitle(""); setNoteContent(""); }}>Cancel</Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Two-column layout */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Left: Kanban Board */}
        <div className="min-w-0 flex-1">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {columns.map((col) => {
                const items = tasks.filter((t) => t.status === col.id);
                return (
                  <Droppable key={col.id} droppableId={col.id}>
                    {(p, sn) => (
                      <div
                        ref={p.innerRef}
                        {...p.droppableProps}
                        className={`flex min-h-[280px] flex-col rounded-lg border-2 border-t-4 bg-muted/30 ${
                          col.color
                        } ${sn.isDraggingOver ? "border-accent bg-accent/30" : "border-border"}`}
                      >
                        <div className="flex items-center justify-between px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                            <h3 className="text-sm font-semibold">{col.label}</h3>
                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {items.length}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 space-y-2 px-2 pb-2">
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
                              onEdit={updateTask ? setEditingTask : undefined}
                            />
                          ))}
                          {p.placeholder}
                          {items.length === 0 && !sn.isDraggingOver && (
                            <div className="flex flex-col items-center justify-center py-8">
                              <MoreHorizontal size={16} className="text-muted-foreground/30" />
                              <p className="mt-1.5 text-[11px] text-muted-foreground/40">
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
        </div>

        {/* Right: Notes Panel */}
        <div className="w-full shrink-0 lg:w-72">
          <NotesPanel
            notes={notes}
            togglePinNote={togglePinNote}
            deleteNote={deleteNote}
            updateNote={updateNote}
            onNoteSelect={onNoteSelect}
          />
        </div>
      </div>

      {/* Edit modal */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onSave={handleEditSave}
          onClose={() => setEditingTask(null)}
        />
      )}
    </motion.div>
  );
}
