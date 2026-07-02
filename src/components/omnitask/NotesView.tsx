import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Pin,
  Trash2,
  GripVertical,
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
  addNote: (title: string, content: string) => Promise<void>;
  togglePinNote: (id: string, cur: boolean) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
}

export function NotesView({
  notes,
  addNote,
  togglePinNote,
  deleteNote,
}: NotesViewProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await addNote(title.trim(), content.trim());
    setTitle("");
    setContent("");
    setShowForm(false);
  };

  const onDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      // In a mock scenario, we'll just reorder based on the result
      // This is a simplified version
    },
    []
  );

  const pinned = notes.filter((n) => n.is_pinned);
  const unpinned = notes.filter((n) => !n.is_pinned);
  const ordered = [...pinned, ...unpinned];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-5xl space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {notes.length} note{notes.length !== 1 ? "s" : ""}
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
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="submit" size="sm" disabled={!title.trim()}>
              Save
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
                        sn.isDragging
                          ? "z-50 shadow-lg"
                          : ""
                      } ${note.is_pinned ? "border-l-2 border-l-amber-400" : ""}`}
                    >
                      <div className="flex items-start gap-2 p-4">
                        <div
                          {...p.dragHandleProps}
                          className="mt-0.5 cursor-grab text-muted-foreground/30 opacity-0 transition-opacity hover:text-muted-foreground/60 group-hover:opacity-100"
                        >
                          <GripVertical size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-medium">{note.title}</h3>
                            <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                              <button
                                onClick={() =>
                                  togglePinNote(note.id, note.is_pinned)
                                }
                                className={`rounded p-1 transition-colors hover:bg-accent ${
                                  note.is_pinned
                                    ? "text-amber-500"
                                    : "text-muted-foreground/50"
                                }`}
                              >
                                <Pin size={13} />
                              </button>
                              <button
                                onClick={() => deleteNote(note.id)}
                                className="rounded p-1 text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                          {note.content && (
                            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                              {note.content}
                            </p>
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
          <p className="text-sm text-muted-foreground">
            No notes yet. Create your first note.
          </p>
        </div>
      )}
    </motion.div>
  );
}
