import { useState, useCallback, useRef } from "react";
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
  Settings2,
  Pencil,
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import type { Task, Note, TaskCategory } from "./data";
import { CATEGORY_COLORS } from "./data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePickerPopover } from "@/components/ui/date-picker-popover";
import { parseNaturalInput } from "@/lib/deepseek";

// ─── Types ───

interface TasksNotesViewProps {
  tasks: Task[];
  notes: Note[];
  folders: string[];
  categories: TaskCategory[];
  addTask: (title: string, priority: Task["priority"], dueDate?: string, status?: string) => Promise<void>;
  updateTaskStatus: (id: string, status: string) => Promise<void>;
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
  togglePinTask?: (taskId: string) => Promise<void>;
  reorderTask?: (taskId: string, newOrder: number) => Promise<void>;
  reorderCategory?: (fromIndex: number, toIndex: number) => Promise<void>;
  sortTasks?: (tasks: Task[]) => Task[];
  addCategory?: (label: string, colorIndex?: number) => Promise<void>;
  updateCategory?: (id: string, label: string) => Promise<void>;
  updateCategoryColor?: (id: string, colorIndex: number) => Promise<void>;
  deleteCategory?: (id: string) => Promise<void>;
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
  onTogglePin,
}: {
  task: Task;
  index: number;
  onDelete: (id: string) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onAddSubtask?: (taskId: string, title: string) => void;
  onUpdateTags?: (taskId: string, tags: string[]) => void;
  onRemoveTag?: (taskId: string, tag: string) => void;
  onEdit?: (task: Task) => void;
  onTogglePin?: (taskId: string) => void;
}) {
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [newSubtask, setNewSubtask] = useState("");
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");

  // All available tags = defaults + custom
  const DEFAULT_TAGS = ["frontend","backend","design","bug","feature","docs","urgent","research"];
  const allAvailableTags = [...DEFAULT_TAGS, ...customTags];

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
          className={`group relative rounded-lg border transition-all ${
            sn.isDragging
              ? "z-50 shadow-2xl ring-2 ring-amber-400/30 scale-[1.02] rotate-[1deg] bg-card"
              : task.is_pinned
                ? "border-border/80 bg-red-50/40 dark:bg-red-500/5 shadow-sm"
                : "border-border bg-card hover:shadow-sm"
          } ${
            task.is_pinned
              ? "border-l-[3px] border-l-red-500"
              : isOverdue
                ? "border-l-2 border-l-destructive"
                : ""
          }`}
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
              {/* Pin button — with stopPropagation to prevent drag trigger. Always visible when pinned */}
              {onTogglePin && (
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => onTogglePin(task.id)}
                  className={`mt-0.5 rounded p-1 transition-opacity ${
                    task.is_pinned
                      ? "text-red-500 opacity-100"
                      : "text-muted-foreground/40 opacity-0 hover:text-foreground group-hover:opacity-100"
                  }`}
                  title={task.is_pinned ? "Unpin" : "Pin to top"}
                >
                  <Pin size={12} fill={task.is_pinned ? "currentColor" : "none"} />
                </button>
              )}
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
                      className="absolute right-0 top-full z-10 mt-1 w-52 rounded-lg border border-border bg-card p-2 shadow-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-wrap gap-1">
                        {allAvailableTags.map((tag) => {
                          const isActive = task.tags?.includes(tag);
                          const isCustom = customTags.includes(tag);
                          return (
                            <span key={tag} className="inline-flex items-center gap-0.5">
                              <button
                                onClick={() => handleSelectTag(tag)}
                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                                  isActive
                                    ? "bg-foreground text-background"
                                    : "bg-muted text-muted-foreground hover:bg-accent"
                                }`}
                              >
                                {tag}
                              </button>
                              {isCustom && (
                                <button
                                  onClick={() => setCustomTags((prev) => prev.filter((t) => t !== tag))}
                                  className="rounded-full p-0.5 text-muted-foreground/30 hover:text-destructive"
                                  title="Remove tag"
                                >
                                  <X size={9} />
                                </button>
                              )}
                            </span>
                          );
                        })}
                      </div>
                      {/* Add custom tag input */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const tag = newTagInput.trim().toLowerCase();
                          if (tag && !allAvailableTags.includes(tag)) {
                            setCustomTags((prev) => [...prev, tag]);
                            setNewTagInput("");
                          }
                        }}
                        className="mt-2 flex gap-1 border-t border-border pt-2"
                      >
                        <input
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          placeholder="+ Add tag..."
                          className="min-w-0 flex-1 rounded border-0 bg-transparent px-1 py-0.5 text-[10px] outline-none ring-1 ring-border focus:ring-ring"
                        />
                        <button
                          type="submit"
                          disabled={!newTagInput.trim()}
                          className="rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-accent disabled:opacity-40"
                        >
                          Add
                        </button>
                      </form>
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
              {pinned.map((note, i) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  index={i}
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
              {unpinned.map((note, i) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  index={pinned.length + i}
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
  index,
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
  index: number;
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

  // Don't allow dragging while editing
  if (isEditing) {
    return (
      <div className="rounded-lg border border-border bg-card px-3 py-2 ring-1 ring-ring">
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
      </div>
    );
  }

  return (
    <Draggable draggableId={`note-${note.id}`} index={index}>
      {(p, sn) => (
        <div
          ref={p.innerRef}
          {...p.draggableProps}
          className={`group relative rounded-lg border px-3 py-2 transition-all ${
            sn.isDragging ? "z-50 shadow-lg ring-2 ring-amber-400/40 opacity-90" : ""
          } ${
            note.is_pinned
              ? "border-l-2 border-l-amber-400 border-border bg-amber-50/30 dark:bg-amber-500/5"
              : "border-transparent hover:border-border hover:bg-accent/30"
          }`}
        >
          <div className="flex items-start gap-2">
            {/* Dedicated drag handle — appears on hover */}
            <div
              {...p.dragHandleProps}
              className="mt-0.5 cursor-grab text-muted-foreground/20 opacity-0 transition-opacity hover:text-muted-foreground/50 group-hover:opacity-100"
            >
              <GripVertical size={12} />
            </div>
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
        </div>
      )}
    </Draggable>
  );
}

// ─── Combined View ───

export function TasksNotesView({
  tasks,
  notes,
  folders,
  categories,
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
  togglePinTask,
  reorderTask,
  reorderCategory,
  sortTasks,
  addCategory,
  updateCategory,
  updateCategoryColor,
  deleteCategory,
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

  const categoryIds = categories.map((c) => c.id);

  const onDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;

      const { draggableId, destination, source } = result;
      const isNote = draggableId.startsWith("note-");
      const destIsNotePanel = destination.droppableId === "notes";
      const destIsTaskColumn = categoryIds.includes(destination.droppableId);

      // Note dropped on task column → create task from note, then remove note
      if (isNote && destIsTaskColumn) {
        const noteId = draggableId.replace("note-", "");
        const note = notes.find((n) => n.id === noteId);
        if (note) {
          const title = note.content
            ? `${note.title}: ${note.content}`
            : note.title;
          addTask(title.slice(0, 100), "medium", undefined, destination.droppableId);
          deleteNote(noteId);
        }
        return;
      }

      // Task dropped on notes panel → create note from task, then remove task
      if (!isNote && destIsNotePanel) {
        const task = tasks.find((t) => t.id === draggableId);
        if (task) {
          const content = task.description || task.due_date
            ? `Priority: ${task.priority}${task.due_date ? ` | Due: ${task.due_date}` : ""}${task.description ? `\n${task.description}` : ""}`
            : `Dari task: ${task.title}`;
          addNote(task.title, content);
          deleteTask(draggableId);
        }
        return;
      }

      // Task dropped on task column → update status and reorder
      if (!isNote && destIsTaskColumn) {
        const sameColumn = source.droppableId === destination.droppableId;
        if (sameColumn) {
          // Reorder within same column: update order based on position
          const itemsInCol = tasks
            .filter((t) => t.status === destination.droppableId)
            .sort((a, b) => a.order - b.order);
          const movedTask = tasks.find((t) => t.id === draggableId);
          if (movedTask) {
            const withoutMoved = itemsInCol.filter((t) => t.id !== draggableId);
            withoutMoved.splice(destination.index, 0, movedTask);
            withoutMoved.forEach((t, i) => {
              reorderTask?.(t.id, i);
            });
          }
        } else {
          updateTaskStatus(draggableId, destination.droppableId);
        }
        return;
      }

      // Note dropped on notes panel → ignore
      if (isNote && destIsNotePanel) return;
    },
    [updateTaskStatus, reorderTask, notes, tasks, addTask, addNote, categoryIds, deleteNote, deleteTask]
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

  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState(0);
  const [editingCategory, setEditingCategory] = useState<{ id: string; label: string } | null>(null);
  const [editingColor, setEditingColor] = useState<number | null>(null);

  const activeTasks = tasks.filter((t) => t.status !== (categories.find((c) => c.label === "Done")?.id || "done"));
  const doneCount = tasks.filter((t) => t.status === (categories.find((c) => c.label === "Done")?.id || "done")).length;

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    addCategory?.(newCategoryName.trim(), newCategoryColor);
    setNewCategoryName("");
    setNewCategoryColor(0);
  };

  const handleEditCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.label.trim()) return;
    updateCategory?.(editingCategory.id, editingCategory.label.trim());
    setEditingCategory(null);
  };

  const handleDeleteCategory = (id: string) => {
    deleteCategory?.(id);
  };

  const onCategoryDragEnd = (result: DropResult) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    reorderCategory?.(result.source.index, result.destination.index);
  };

  // ─── Native HTML5 column drag for kanban board reorder ───
  const dragColIndex = useRef<number | null>(null);

  const handleColDragStart = (idx: number) => (e: React.DragEvent) => {
    dragColIndex.current = idx;
    e.dataTransfer.effectAllowed = "move";
    (e.currentTarget as HTMLElement).classList.add("opacity-40");
  };

  const handleColDragOver = (targetIdx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const from = dragColIndex.current;
    if (from === null || from === targetIdx) return;
    // Reorder categories visually
    reorderCategory?.(from, targetIdx);
    dragColIndex.current = targetIdx;
  };

  const handleColDragEnd = () => (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove("opacity-40");
    dragColIndex.current = null;
  };

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
        <div className="flex items-center gap-2">
          <Button
            onClick={() => { setShowCategoryManager(!showCategoryManager); }}
            size="sm"
            variant="outline"
            className="gap-1.5"
            title="Manage categories"
          >
            <Settings2 size={13} />
            {showCategoryManager ? "Done" : "Columns"}
          </Button>
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

      {/* Category Manager */}
      <AnimatePresence>
        {showCategoryManager && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden rounded-lg border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold">Manage Columns</h4>
              <form onSubmit={handleAddCategory} className="flex items-center gap-1.5">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New column name..."
                  className="h-7 w-32 text-xs"
                />
                <div className="flex -space-x-0.5">
                  {CATEGORY_COLORS.map((c, ci) => (
                    <button
                      key={ci}
                      type="button"
                      onClick={() => setNewCategoryColor(ci)}
                      className={`h-4 w-4 rounded-full border-2 transition-all ${
                        ci === newCategoryColor
                          ? "border-foreground scale-125"
                          : "border-transparent hover:scale-110"
                      } ${c.dot}`}
                      title={`Color ${ci + 1}`}
                    />
                  ))}
                </div>
                <Button type="submit" size="sm" disabled={!newCategoryName.trim()} className="h-7 text-xs">
                  <Plus size={12} /> Add
                </Button>
              </form>
            </div>
            <DragDropContext onDragEnd={onCategoryDragEnd}>
              <Droppable droppableId="category-list">
                {(p, sn) => (
                  <div
                    ref={p.innerRef}
                    {...p.droppableProps}
                    className={`space-y-1 ${sn.isDraggingOver ? "min-h-[60px]" : ""}`}
                  >
                    {categories.map((cat, idx) => (
                      <Draggable key={cat.id} draggableId={`cat-${cat.id}`} index={idx}>
                        {(dp, dsn) => (
                          <div
                            ref={dp.innerRef}
                            {...dp.draggableProps}
                            className={`flex items-center justify-between rounded-md px-3 py-2 transition-all ${
                              dsn.isDragging
                                ? "z-50 rounded-lg border-2 border-amber-400 bg-card shadow-xl"
                                : "bg-muted/30 hover:bg-muted/50"
                            } ${
                              editingCategory?.id === cat.id ? "ring-1 ring-ring" : ""
                            }`}
                          >
                            {editingCategory?.id === cat.id ? (
                              <form onSubmit={handleEditCategory} className="flex w-full items-center gap-2 py-1">
                                <Input
                                  value={editingCategory.label}
                                  onChange={(e) => setEditingCategory({ ...editingCategory, label: e.target.value })}
                                  className="h-7 w-40 text-xs"
                                  autoFocus
                                />
                                <Button type="submit" size="sm" className="h-7 text-xs">Save</Button>
                                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingCategory(null)}>Cancel</Button>
                              </form>
                            ) : (
                              <>
                                <div className="flex items-center gap-2 min-w-0">
                                  {/* Drag handle */}
                                  <div
                                    {...dp.dragHandleProps}
                                    className="cursor-grab text-muted-foreground/30 hover:text-muted-foreground/60"
                                  >
                                    <GripVertical size={13} />
                                  </div>
                                  <span className={`h-2 w-2 shrink-0 rounded-full ${cat.dot}`} />
                                  <span className="text-sm font-medium truncate">{cat.label}</span>
                                  <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                    {tasks.filter((t) => t.status === cat.id).length}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => setEditingCategory({ id: cat.id, label: cat.label })}
                                    className="rounded p-1 text-muted-foreground/50 hover:bg-accent hover:text-foreground"
                                    title="Rename"
                                  >
                                    <Pencil size={12} />
                                  </button>
                                  {categories.length > 1 && (
                                    <button
                                      onClick={() => handleDeleteCategory(cat.id)}
                                      className="rounded p-1 text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive"
                                      title="Delete column"
                                    >
                                      <X size={12} />
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {p.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Two-column layout with cross-type drag-and-drop */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* Left: Kanban Board */}
          <div className="min-w-0 flex-1">
            <div
              className="grid grid-cols-1 gap-3"
              style={{
                gridTemplateColumns: `repeat(${Math.min(categories.length, 4)}, minmax(0, 1fr))`,
              }}
            >
              {categories.map((col, colIdx) => {
                const items = sortTasks
                  ? sortTasks(tasks.filter((t) => t.status === col.id))
                  : tasks.filter((t) => t.status === col.id);
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
                        {/* Draggable column header */}
                        <div
                          draggable
                          onDragStart={handleColDragStart(colIdx)}
                          onDragOver={handleColDragOver(colIdx)}
                          onDragEnd={handleColDragEnd()}
                          className="flex cursor-grab items-center justify-between rounded-t-md px-3 py-2.5 active:cursor-grabbing"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <GripVertical size={12} className="shrink-0 text-muted-foreground/30" />
                            <span className={`h-2 w-2 shrink-0 rounded-full ${col.dot}`} />
                            <h3 className="text-sm font-semibold truncate">{col.label}</h3>
                            <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
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
                              onTogglePin={togglePinTask}
                            />
                          ))}
                          {p.placeholder}
                          {items.length === 0 && !sn.isDraggingOver && (
                            <div className="flex flex-col items-center justify-center py-8">
                              <MoreHorizontal size={16} className="text-muted-foreground/30" />
                              <p className="mt-1.5 text-[11px] text-muted-foreground/40">
                                Drop tasks or notes here
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
          </div>

          {/* Right: Notes Panel — now a droppable area */}
          <Droppable droppableId="notes">
            {(p, sn) => (
              <div
                ref={p.innerRef}
                {...p.droppableProps}
                className={`w-full shrink-0 lg:w-72 transition-all ${
                  sn.isDraggingOver
                    ? "rounded-lg ring-2 ring-amber-400/50 ring-offset-2 ring-offset-background"
                    : ""
                }`}
              >
                <NotesPanel
                  notes={notes}
                  togglePinNote={togglePinNote}
                  deleteNote={deleteNote}
                  updateNote={updateNote}
                  onNoteSelect={onNoteSelect}
                />
                {p.placeholder}
                {sn.isDraggingOver && (
                  <div className="mt-2 rounded-lg border-2 border-dashed border-amber-400/40 bg-amber-50/20 p-3 text-center dark:bg-amber-500/5">
                    <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                      Drop here to create a Note from this Task
                    </p>
                  </div>
                )}
              </div>
            )}
          </Droppable>
        </div>
      </DragDropContext>

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
