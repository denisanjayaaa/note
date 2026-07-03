import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pin,
  Trash2,
  GripVertical,
  Edit3,
  Check,
  X,
  Folder,
  FolderPlus,
  Pencil,
  FileText,
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import type { Note } from "./data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NotesViewProps {
  notes: Note[];
  folders: string[];
  addNote: (title: string, content: string, folder_path?: string) => Promise<void>;
  togglePinNote: (id: string, cur: boolean) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  updateNote?: (id: string, title: string, content: string) => Promise<void>;
  onNoteSelect?: (note: Note) => void;
  addFolder?: (name: string) => Promise<void>;
  renameFolder?: (oldName: string, newName: string) => Promise<void>;
  deleteFolder?: (name: string) => Promise<void>;
  moveNoteToFolder?: (noteId: string, folder: string) => Promise<void>;
}

export function NotesView({
  notes,
  folders,
  addNote,
  togglePinNote,
  deleteNote,
  updateNote,
  onNoteSelect,
  addFolder,
  renameFolder,
  deleteFolder,
  moveNoteToFolder,
}: NotesViewProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>("/");
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Filter notes by active folder
  const filteredNotes = activeFolder
    ? notes.filter((n) => n.folder_path === activeFolder)
    : notes;

  const pinned = filteredNotes.filter((n) => n.is_pinned);
  const unpinned = filteredNotes.filter((n) => !n.is_pinned);
  const ordered = [...pinned, ...unpinned];

  // Folder counts
  const folderCounts = folders.reduce(
    (acc, f) => {
      acc[f] = notes.filter((n) => n.folder_path === f).length;
      return acc;
    },
    {} as Record<string, number>
  );
  folderCounts["__all__"] = notes.length;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await addNote(title.trim(), content.trim(), selectedFolder);
    setTitle("");
    setContent("");
    setActiveFolder(selectedFolder);
    setShowForm(false);
  };

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

  const cancelEdit = () => setEditingId(null);

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") cancelEdit();
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveEdit();
  };

  const handleAddFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    await addFolder?.(newFolderName.trim());
    setNewFolderName("");
    setShowFolderForm(false);
  };

  const handleRenameFolder = async (oldName: string) => {
    if (!renameValue.trim() || renameValue === oldName) return;
    await renameFolder?.(oldName, renameValue.trim());
    setRenamingFolder(null);
    if (activeFolder === oldName) setActiveFolder(renameValue.trim());
  };

  const handleDeleteFolder = async (name: string) => {
    await deleteFolder?.(name);
    if (activeFolder === name) setActiveFolder(null);
  };

  // ─── Folder context menu state ───
  const [menuFolder, setMenuFolder] = useState<string | null>(null);

  const onDragEnd = useCallback(
    (_result: DropResult) => {
      // Drag reorder not yet implemented
    },
    []
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-6xl"
    >
      <div className="flex gap-6">
        {/* ─── Folder Sidebar ─── */}
        <div className="hidden w-56 shrink-0 md:block">
          <div className="sticky top-6 space-y-1">
            {/* Header */}
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Folders
              </h3>
              <button
                onClick={() => setShowFolderForm(!showFolderForm)}
                className="rounded p-1 text-muted-foreground/50 transition-colors hover:bg-accent hover:text-foreground"
                title="New folder"
              >
                <FolderPlus size={14} />
              </button>
            </div>

            {/* Add folder form */}
            <AnimatePresence>
              {showFolderForm && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  onSubmit={handleAddFolder}
                  className="mb-2 overflow-hidden"
                >
                  <Input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Folder name..."
                    className="h-8 text-xs"
                    autoFocus
                  />
                </motion.form>
              )}
            </AnimatePresence>

            {/* All Notes */}
            <button
              onClick={() => setActiveFolder(null)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                !activeFolder
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <FileText size={14} />
              <span className="flex-1">All Notes</span>
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {folderCounts["__all__"]}
              </span>
            </button>

            {/* Folder list */}
            {folders.map((folder) => {
              const isActive = activeFolder === folder;
              const count = folderCounts[folder] || 0;
              const isRenaming = renamingFolder === folder;

              return (
                <div key={folder} className="relative group">
                  {isRenaming ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleRenameFolder(folder);
                      }}
                      className="px-3 py-1"
                    >
                      <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="h-7 text-xs"
                        onBlur={() => setRenamingFolder(null)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setRenamingFolder(null);
                        }}
                      />
                    </form>
                  ) : (
                    <button
                      onClick={() => setActiveFolder(isActive ? null : folder)}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        isActive
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      }`}
                    >
                      <Folder
                        size={14}
                        className={isActive ? "text-amber-500" : "text-muted-foreground/60"}
                      />
                      <span className="flex-1 truncate">
                        {folder === "/" ? "Unfiled" : folder}
                      </span>
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {count}
                      </span>
                    </button>
                  )}

                  {/* Folder actions (hover) */}
                  {!isRenaming && folder !== "/" && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingFolder(folder);
                          setRenameValue(folder);
                        }}
                        className="rounded p-0.5 text-muted-foreground/50 hover:text-foreground"
                        title="Rename folder"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder);
                        }}
                        className="rounded p-0.5 text-muted-foreground/50 hover:text-destructive"
                        title="Delete folder"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Notes Content ─── */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {activeFolder
                  ? activeFolder === "/"
                    ? "Unfiled"
                    : activeFolder
                  : "Notes"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {filteredNotes.length} note{filteredNotes.length !== 1 ? "s" : ""}
                {activeFolder && (
                  <button
                    onClick={() => setActiveFolder(null)}
                    className="ml-2 text-xs text-muted-foreground/60 hover:text-foreground"
                  >
                    (show all)
                  </button>
                )}
              </p>
            </div>
            <Button
              onClick={() => setShowForm(!showForm)}
              size="sm"
              className="gap-1.5"
            >
              <Plus size={15} />
              New Note
            </Button>
          </div>

          {/* New note form */}
          {showForm && (
            <motion.form
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleAdd}
              className="rounded-lg border border-border bg-card p-5"
            >
              <div className="space-y-3">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Note title..."
                  className="border-0 bg-transparent px-0 text-base font-medium shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0"
                />
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write something..."
                  rows={3}
                  className="w-full resize-none border-0 bg-transparent px-0 text-sm text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                />
                {/* Folder selector */}
                <div className="flex items-center gap-2">
                  <Folder size={14} className="text-muted-foreground/50" />
                  <select
                    value={selectedFolder}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    className="rounded-md border-0 bg-muted/50 px-2 py-1 text-xs text-muted-foreground focus:outline-none"
                  >
                    {folders.map((f) => (
                      <option key={f} value={f}>
                        {f === "/" ? "Unfiled" : f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button type="submit" size="sm" disabled={!title.trim()}>
                  Save{selectedFolder && selectedFolder !== "/" ? ` to ${selectedFolder}` : ""}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowForm(false);
                    setTitle("");
                    setContent("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </motion.form>
          )}

          {/* Notes list */}
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="notes">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-2"
                >
                  {ordered.map((note, index) => (
                    <Draggable key={note.id} draggableId={note.id} index={index}>
                      {(p, sn) => (
                        <div
                          ref={p.innerRef}
                          {...p.draggableProps}
                          className={`group rounded-lg border border-border bg-card transition-all ${
                            sn.isDragging ? "z-50 shadow-lg" : ""
                          } ${note.is_pinned ? "border-l-2 border-l-amber-400" : ""} ${
                            editingId === note.id ? "ring-1 ring-ring" : ""
                          }`}
                        >
                          <div className="flex items-start gap-2 p-4">
                            <div
                              {...p.dragHandleProps}
                              className="mt-0.5 cursor-grab text-muted-foreground/30 opacity-0 transition-opacity hover:text-muted-foreground/60 group-hover:opacity-100"
                            >
                              <GripVertical size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                              {editingId === note.id ? (
                                <div className="space-y-3" onKeyDown={handleEditKeyDown}>
                                  <Input
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    placeholder="Note title..."
                                    className="border-0 bg-transparent px-0 text-base font-medium shadow-none focus-visible:ring-0"
                                    autoFocus
                                  />
                                  <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    placeholder="Write something..."
                                    rows={4}
                                    className="w-full resize-none border-0 bg-transparent px-0 text-sm text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                                  />
                                  {/* Folder move in edit mode */}
                                  {moveNoteToFolder && (
                                    <div className="flex items-center gap-2">
                                      <Folder size={14} className="text-muted-foreground/50" />
                                      <select
                                        value={note.folder_path}
                                        onChange={(e) => moveNoteToFolder(note.id, e.target.value)}
                                        className="rounded-md border-0 bg-muted/50 px-2 py-1 text-xs text-muted-foreground focus:outline-none"
                                      >
                                        {folders.map((f) => (
                                          <option key={f} value={f}>
                                            {f === "/" ? "Unfiled" : f}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={saveEdit} disabled={!editTitle.trim()} className="gap-1">
                                      <Check size={13} /> Save
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={cancelEdit} className="gap-1">
                                      <X size={13} /> Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-start justify-between gap-2">
                                    <h3
                                      className="text-sm font-medium cursor-pointer hover:text-foreground/80"
                                      onClick={() => { startEditing(note); onNoteSelect?.(note); }}
                                    >
                                      {note.title}
                                    </h3>
                                    <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                      <button
                                        onClick={() => { startEditing(note); onNoteSelect?.(note); }}
                                        className="rounded p-1 text-muted-foreground/50 transition-colors hover:bg-accent hover:text-foreground"
                                        title="Edit note"
                                      >
                                        <Edit3 size={13} />
                                      </button>
                                      <button
                                        onClick={() => togglePinNote(note.id, note.is_pinned)}
                                        className={`rounded p-1 transition-colors hover:bg-accent ${
                                          note.is_pinned ? "text-amber-500" : "text-muted-foreground/50"
                                        }`}
                                        title={note.is_pinned ? "Unpin" : "Pin"}
                                      >
                                        <Pin size={13} />
                                      </button>
                                      <button
                                        onClick={() => deleteNote(note.id)}
                                        className="rounded p-1 text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive"
                                        title="Delete note"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </div>
                                  {/* Folder badge */}
                                  {note.folder_path && note.folder_path !== "/" && !activeFolder && (
                                    <div className="mt-1 flex items-center gap-1">
                                      <Folder size={10} className="text-muted-foreground/40" />
                                      <span className="text-[10px] text-muted-foreground/50">{note.folder_path}</span>
                                    </div>
                                  )}
                                  {note.content && (
                                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                      {note.content}
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {ordered.length === 0 && !showForm && (
            <div className="py-16 text-center">
              <Folder size={32} className="mx-auto text-muted-foreground/20" />
              <p className="mt-2 text-sm text-muted-foreground">
                {activeFolder
                  ? `No notes in "${
                      activeFolder === "/" ? "Unfiled" : activeFolder
                    }"`
                  : "No notes yet. Create your first note."}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
