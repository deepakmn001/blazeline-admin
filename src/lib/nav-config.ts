import {
  LayoutGrid,
  Package,
  FolderTree,
  Award,
  Percent,
  LayoutTemplate,
  GalleryHorizontal,
  Users,
  BarChart3,
  ImagePlus,
  Settings,
  ShieldCheck,
  LogOut,
  Upload,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  description?: string;
};

export type NavSection = {
  title?: string;
  items: NavItem[];
};

export const navSections: NavSection[] = [
  {
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutGrid,
        description: "Overview of your store",
      },
    ],
  },

  {
    title: "Catalog",
    items: [
      {
        label: "Products",
        href: "/products",
        icon: Package,
        description: "Manage product listings",
      },
      {
        label: "Categories",
        href: "/categories",
        icon: FolderTree,
        description: "Organize your catalog",
      },
      {
        label: "Brands",
        href: "/brands",
        icon: Award,
        description: "Manufacturer directory",
      },
      {
        label: "Offers",
        href: "/offers",
        icon: Percent,
        description: "Discounts and campaigns",
      },

      // NEW
      {
        label: "Catalog Import",
        href: "/catalog-import",
        icon: Upload,
        description: "Upload supplier PDF catalog",
      },

      // NEW
      {
        label: "Catalog Review",
        href: "/catalog-review",
        icon: ClipboardCheck,
        description: "Review parsed products",
      },
    ],
  },

  {
    title: "Storefront",
    items: [
      {
        label: "Homepage CMS",
        href: "/homepage-cms",
        icon: LayoutTemplate,
        description: "Edit homepage sections",
      },
      {
        label: "Banner Manager",
        href: "/banners",
        icon: GalleryHorizontal,
        description: "Promotional banners",
      },
    ],
  },

  {
    title: "Growth",
    items: [
      {
        label: "Leads",
        href: "/leads",
        icon: Users,
        badge: "12",
        description: "Enquiries and quotations",
      },
      {
        label: "Analytics",
        href: "/analytics",
        icon: BarChart3,
        description: "Traffic and performance",
      },
    ],
  },

  {
    title: "Workspace",
    items: [
      {
        label: "Media Library",
        href: "/media",
        icon: ImagePlus,
        description: "Images, videos and files",
      },
      {
        label: "Settings",
        href: "/settings",
        icon: Settings,
        description: "Company and site settings",
      },
      {
        label: "Admin Users",
        href: "/admin-users",
        icon: ShieldCheck,
        description: "Team access and roles",
      },
    ],
  },
];

export const logoutItem: NavItem = {
  label: "Logout",
  href: "/logout",
  icon: LogOut,
};