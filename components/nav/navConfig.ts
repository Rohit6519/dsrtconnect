import {
  House,
  MagnifyingGlass,
  Plus,
  Briefcase,
  Users,
  Compass,
  Bell,
  EnvelopeSimple,
  SquaresFour,
  User,
  MicrophoneStage,
  RocketLaunch,
  Target,
} from "@phosphor-icons/react";
import { CocoIcon } from "@/components/icons/CocoIcon";

export type NavGroup = "main" | "open_mic" | "explore" | "user" | "bottom";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: any;
  group: NavGroup;
  badgeKey?: string;
  exact?: boolean;
}

export const dsrtNavigation: NavItem[] = [
  // ── MAIN ──
  { id: "home", label: "Home", href: "/home", icon: House, group: "main" },
  {
    id: "projects",
    label: "Projects",
    href: "/projects",
    icon: SquaresFour,
    group: "main",
  },
  {
    id: "ventures",
    label: "Ventures",
    href: "/ventures",
    icon: RocketLaunch,
    group: "main",
  },
  {
    id: "looking-for",
    label: "Looking For",
    href: "/looking-for",
    icon: Target,
    group: "main",
  },
  {
    id: "inbox",
    label: "DSRT Mail",
    href: "/inbox",
    icon: EnvelopeSimple,
    group: "main",
    badgeKey: "unreadMessages",
  },
  { id: "coco", label: "COCO", href: "/coco", icon: CocoIcon, group: "main" },

  // ── OPEN MIC (Replaces Community) ──
  {
    id: "open-mic",
    label: "Open Mic",
    href: "/open-mic",
    icon: MicrophoneStage,
    group: "open_mic",
  },

  // ── EXPLORE ──
  {
    id: "events",
    label: "Events",
    href: "/events",
    icon: Compass,
    group: "explore",
  },
  {
    id: "resources",
    label: "Resources",
    href: "/resources",
    icon: Briefcase,
    group: "explore",
  },
];
