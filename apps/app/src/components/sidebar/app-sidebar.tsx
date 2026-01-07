"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@quaver/ui/components/sidebar";
import {
  Beaker,
  Compass,
  Folder,
  GraduationCap,
  Home,
  LayoutTemplate,
  Search,
  Star,
  Users,
} from "lucide-react";
import type { ComponentProps } from "react";
import { NavMain } from "./nav-main";
import { NavProjects } from "./nav-projects";
import { NavUser } from "./nav-user";
import { TeamSwitcher } from "./team-switcher";

const data = {
  teams: [
    {
      name: "Quaver",
      logo: Beaker,
      plan: "Pro",
    },
  ],
  navMain: [
    {
      title: "Home",
      url: "/",
      icon: Home,
      isActive: true,
    },
    {
      title: "Search",
      url: "#",
      icon: Search,
      shortcut: "⌘K",
    },
  ],
  projects: [
    {
      name: "All projects",
      url: "/projects",
      icon: Folder,
    },
    {
      name: "Starred",
      url: "/projects/starred",
      icon: Star,
    },
    {
      name: "Shared with me",
      url: "/projects/shared",
      icon: Users,
    },
  ],
  resources: [
    {
      name: "Discover",
      url: "/discover",
      icon: Compass,
    },
    {
      name: "Templates",
      url: "/templates",
      icon: LayoutTemplate,
    },
    {
      name: "Learn",
      url: "/learn",
      icon: GraduationCap,
    },
  ],
};

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects label="Projects" projects={data.projects} />
        <NavProjects label="Resources" projects={data.resources} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
