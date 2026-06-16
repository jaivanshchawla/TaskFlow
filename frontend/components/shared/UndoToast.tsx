"use client";
import { useCallback, useRef } from "react";
import { useDeleteTask, useBulkAction } from "@/hooks/useTasks";
import { toast } from "sonner";
import { Undo2, X } from "lucide-react";

interface PendingDelete {
  id: string;
  title: string;
}

interface PendingBulkDelete {
  taskIds: string[];
  count: number;
}

const DELETE_DELAY_MS = 5000;

export function useUndoDelete() {
  const deleteTask = useDeleteTask();
  const timerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const undoDelete = useCallback(
    (task: PendingDelete) => {
      const toastId = `delete-${task.id}`; // eslint-disable-line @typescript-eslint/no-unused-vars -- used by sonner internally

      toast(
        `"${task.title}" deleted`,
        {
          duration: DELETE_DELAY_MS,
          action: {
            label: (
              <span className="flex items-center gap-1">
                <Undo2 size={12} />
                Undo
              </span>
            ) as unknown as string,
            onClick: () => {
              if (timerRef.current.has(task.id)) {
                clearTimeout(timerRef.current.get(task.id));
                timerRef.current.delete(task.id);
              }
              toast.success(`"${task.title}" restored`);
            },
          },
          cancel: {
            label: (
              <span className="flex items-center gap-1">
                <X size={12} />
              </span>
            ) as unknown as string,
            onClick: () => {
              if (timerRef.current.has(task.id)) {
                clearTimeout(timerRef.current.get(task.id));
                timerRef.current.delete(task.id);
              }
            },
          },
        }
      );

      const timer = setTimeout(() => {
        deleteTask.mutate(task.id);
        timerRef.current.delete(task.id);
      }, DELETE_DELAY_MS);

      timerRef.current.set(task.id, timer);
    },
    [deleteTask]
  );

  return { undoDelete };
}

export function useUndoBulkDelete() {
  const bulkAction = useBulkAction();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const undoBulkDelete = useCallback(
    (data: PendingBulkDelete) => {
      const toastId = "bulk-delete"; // eslint-disable-line @typescript-eslint/no-unused-vars -- used by sonner internally

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      toast(
        `${data.count} tasks deleted`,
        {
          duration: DELETE_DELAY_MS,
          action: {
            label: (
              <span className="flex items-center gap-1">
                <Undo2 size={12} />
                Undo
              </span>
            ) as unknown as string,
            onClick: () => {
              if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
              }
              toast.success("Bulk delete cancelled");
            },
          },
          cancel: {
            label: (
              <span className="flex items-center gap-1">
                <X size={12} />
              </span>
            ) as unknown as string,
            onClick: () => {
              if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
              }
            },
          },
        }
      );

      timerRef.current = setTimeout(() => {
        bulkAction.mutate({ taskIds: data.taskIds, action: "delete" });
        timerRef.current = null;
      }, DELETE_DELAY_MS);
    },
    [bulkAction]
  );

  return { undoBulkDelete };
}
