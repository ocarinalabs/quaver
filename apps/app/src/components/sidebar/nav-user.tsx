"use client";

import { UserProfile, useClerk, useUser } from "@clerk/nextjs";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@quaver/ui/components/avatar";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@quaver/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@quaver/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@quaver/ui/components/sidebar";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  AlertCircle,
  BookOpen,
  ChevronsUpDown,
  ExternalLink,
  FileText,
  HelpCircle,
  History,
  Laptop,
  LogOut,
  Moon,
  Settings,
  Shield,
  Sun,
  User,
  Users,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";

export function NavUser() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { isMobile } = useSidebar();
  const { setTheme } = useTheme();
  const [accountOpen, setAccountOpen] = useState(false);

  const userData = {
    name: user?.fullName ?? user?.firstName ?? "User",
    email: user?.primaryEmailAddress?.emailAddress ?? "",
    avatar: user?.imageUrl ?? "",
  };

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                size="lg"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage alt={userData.name} src={userData.avatar} />
                  <AvatarFallback className="rounded-lg">
                    {userData.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{userData.name}</span>
                  <span className="truncate text-xs">{userData.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage alt={userData.name} src={userData.avatar} />
                    <AvatarFallback className="rounded-lg">
                      {userData.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {userData.name}
                    </span>
                    <span className="truncate text-xs">{userData.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem>
                <Settings />
                Settings
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => setAccountOpen(true)}>
                <User />
                Account
              </DropdownMenuItem>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Sun className="size-4" />
                  Appearance
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => setTheme("light")}>
                      <Sun />
                      Light
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("dark")}>
                      <Moon />
                      Dark
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("system")}>
                      <Laptop />
                      System
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <HelpCircle className="size-4" />
                  Support
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem>
                      <HelpCircle />
                      Help Center
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <AlertCircle />
                      Report Abuse
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <History />
                      Status
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuSeparator />

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <BookOpen className="size-4" />
                  Documentation
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem>
                      <BookOpen />
                      Documentation
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <FileText />
                      Terms & Privacy
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <History />
                      Changelog
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Shield />
                      Security
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <a
                  href="https://github.com/quaver"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <Users />
                  Community
                  <ExternalLink className="ml-auto size-3" />
                </a>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => signOut({ redirectUrl: "/" })}>
                <LogOut />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

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
