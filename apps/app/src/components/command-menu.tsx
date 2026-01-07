"use client";

import { UserProfile, useClerk } from "@clerk/nextjs";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@quaver/ui/components/command";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@quaver/ui/components/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Compass,
  Folder,
  GraduationCap,
  Home,
  Laptop,
  LayoutTemplate,
  LogOut,
  Moon,
  Settings,
  Star,
  Sun,
  User,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const navigation = [
  { title: "Home", href: "/", icon: Home },
  { title: "All projects", href: "/projects", icon: Folder },
  { title: "Starred", href: "/projects/starred", icon: Star },
  { title: "Shared with me", href: "/projects/shared", icon: Users },
];

const resources = [
  { title: "Discover", href: "/discover", icon: Compass },
  { title: "Templates", href: "/templates", icon: LayoutTemplate },
  { title: "Learn", href: "/learn", icon: GraduationCap },
];

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();
  const { signOut } = useClerk();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    const handleOpen = () => setOpen(true);

    document.addEventListener("keydown", down);
    document.addEventListener("open-command-menu", handleOpen);

    return () => {
      document.removeEventListener("keydown", down);
      document.removeEventListener("open-command-menu", handleOpen);
    };
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <>
      <CommandDialog onOpenChange={setOpen} open={open} showCloseButton={false}>
        <CommandInput placeholder="Search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Navigation">
            {navigation.map((item) => (
              <CommandItem
                key={item.href}
                onSelect={() => runCommand(() => router.push(item.href))}
              >
                <item.icon />
                {item.title}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Resources">
            {resources.map((item) => (
              <CommandItem
                key={item.href}
                onSelect={() => runCommand(() => router.push(item.href))}
              >
                <item.icon />
                {item.title}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Appearance">
            <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
              <Sun />
              Light
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
              <Moon />
              Dark
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme("system"))}>
              <Laptop />
              System
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Account">
            <CommandItem>
              <Settings />
              Settings
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => setAccountOpen(true))}
            >
              <User />
              Account
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => signOut({ redirectUrl: "/" }))}
            >
              <LogOut />
              Sign out
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <Dialog onOpenChange={setAccountOpen} open={accountOpen}>
        <DialogContent className="max-w-4xl p-0 [&>button]:hidden">
          <VisuallyHidden>
            <DialogTitle>Account Settings</DialogTitle>
          </VisuallyHidden>
          <UserProfile routing="hash" />
        </DialogContent>
      </Dialog>
    </>
  );
}

export function openCommandMenu() {
  document.dispatchEvent(new CustomEvent("open-command-menu"));
}
