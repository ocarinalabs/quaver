"use client";

import { api } from "@quaver/backend/convex/_generated/api";
import type { Id } from "@quaver/backend/convex/_generated/dataModel";
import { Button } from "@quaver/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@quaver/ui/components/dialog";
import { Input } from "@quaver/ui/components/input";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@quaver/ui/components/sidebar";
import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { columns } from "./columns";
import { DataTable } from "./data-table";

export default function ProjectsPage() {
  const projects = useQuery(api.projects.queries.listForCurrentUser);
  const renameMutation = useMutation(api.projects.mutations.rename);
  const removeMutation = useMutation(api.projects.mutations.remove);

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleRenameClick = (id: string) => {
    const project = projects?.find((p) => p._id === id);
    setRenameId(id);
    setRenameName(project?.name ?? "");
    setRenameOpen(true);
  };

  const handleRenameSubmit = () => {
    if (renameId && renameName.trim()) {
      renameMutation({
        projectId: renameId as Id<"projects">,
        name: renameName.trim(),
      });
      setRenameOpen(false);
      setRenameId(null);
      setRenameName("");
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deleteId) {
      removeMutation({ projectId: deleteId as Id<"projects"> });
      setDeleteOpen(false);
      setDeleteId(null);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <div className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h1 className="font-semibold text-2xl">Projects</h1>
            <Link href="/">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New project
              </Button>
            </Link>
          </div>

          <DataTable
            columns={columns}
            data={projects ?? []}
            meta={{ onRename: handleRenameClick, onDelete: handleDeleteClick }}
          />
        </div>
      </SidebarInset>

      <Dialog onOpenChange={setRenameOpen} open={renameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
            <DialogDescription>
              Enter a new name for this project.
            </DialogDescription>
          </DialogHeader>
          <Input
            onChange={(e) => setRenameName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleRenameSubmit();
              }
            }}
            placeholder="Project name"
            value={renameName}
          />
          <DialogFooter>
            <Button onClick={() => setRenameOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleRenameSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setDeleteOpen} open={deleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setDeleteOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleDeleteConfirm} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
