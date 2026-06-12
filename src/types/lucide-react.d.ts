declare module 'lucide-react' {
  import { FC, SVGProps } from 'react';

  export interface LucideProps extends SVGProps<SVGSVGElement> {
    size?:        string | number;
    strokeWidth?: string | number;
    color?:       string;
    className?:   string;
  }

  export type LucideIcon = FC<LucideProps>;

  export const TreePine:    LucideIcon;
  export const Users:       LucideIcon;
  export const UserPlus:    LucideIcon;
  export const User:        LucideIcon;
  export const Heart:       LucideIcon;
  export const BookOpen:    LucideIcon;
  export const Menu:        LucideIcon;
  export const X:           LucideIcon;
  export const LogOut:      LucideIcon;
  export const Settings:    LucideIcon;
  export const Shield:      LucideIcon;
  export const Calendar:    LucideIcon;
  export const MapPin:      LucideIcon;
  export const Edit:        LucideIcon;
  export const Trash2:      LucideIcon;
  export const ArrowLeft:   LucideIcon;
  export const Camera:      LucideIcon;
  export const Loader2:     LucideIcon;
  export const Save:        LucideIcon;
  export const PlusCircle:  LucideIcon;
  export const Search:      LucideIcon;
  export const ArrowRight:  LucideIcon;
  export const ChevronDown: LucideIcon;
  export const Image:       LucideIcon;
  export const LayoutGrid:  LucideIcon;
  export const GitBranch:   LucideIcon;
  export const ArrowUpRight: LucideIcon;
  export const ChevronUp:    LucideIcon;
  export const ChevronRight: LucideIcon;
  export const Check:        LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const Clock:        LucideIcon;
  export const Send:         LucideIcon;
  export const XCircle:      LucideIcon;
  export const Download:     LucideIcon;
  export const ArrowLeftRight: LucideIcon;
  export const HeartHandshake: LucideIcon;
  export const Crown:          LucideIcon;
  export const Baby:           LucideIcon;
  export const Cake:           LucideIcon;
  export const Sparkles:       LucideIcon;
}
