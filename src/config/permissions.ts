import type { LucideIcon } from "lucide-react";
import {
  Book,
  BookOpen,
  ChartNoAxesCombined,
  ClipboardList,
  FileText,
  Home,
  LayoutDashboard,
  Package,
  Scale,
  ScrollText,
  Shapes,
  ShoppingCart,
  ReceiptText,
  ClipboardCheck,
  TrendingUp,
  Truck,
  UserCog,
  UserPlus,
  Users2,
  Warehouse,
} from "lucide-react";

export type AppPermission =
  | "home"
  | "dashboard"
  | "products"
  | "inventory-balances"
  | "purchases"
  | "sell-product"
  | "vehicles"
  | "driver-sales"
  | "quotations"
  | "material-reservations"
  | "suppliers"
  | "customers"
  | "financial-statement"
  | "warehouses"
  | "categories"
  | "accounts"
  | "journal-entries"
  | "trial-balance"
  | "general-ledger"
  | "income-statement"
  | "profit-analysis";

export interface InventoryUserWithPermissions {
  id?: string | number;
  _id?: string | number;
  username?: string;
  role?: string;
  permissions?: string[];
  allowedPages?: string[];
  pagePermissions?: string[];
}

export interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  allowed: string[];
  permission?: AppPermission;
}

export const dashboardNavigationItem: NavigationItem = {
  name: "Dashboard",
  href: "/dashboard",
  icon: LayoutDashboard,
  allowed: ["admin", "user"],
  permission: "dashboard",
};

export const navigationGroups: NavigationItem[] = [
  {
    name: "Home",
    href: "/home",
    icon: Home,
    allowed: ["admin", "user"],
    permission: "home",
  },
  {
    name: "All Products",
    href: "/Products",
    icon: Package,
    allowed: ["admin", "user"],
    permission: "products",
  },
  {
    name: "Inventory Balances",
    href: "/inventory-balances",
    icon: ClipboardList,
    allowed: ["admin"],
    permission: "inventory-balances",
  },
  {
    name: "Purchases",
    href: "/purchases",
    icon: Truck,
    allowed: ["admin"],
    permission: "purchases",
  },
  {
    name: "Sell Product",
    href: "/sellProduct",
    icon: ShoppingCart,
    allowed: ["admin"],
    permission: "sell-product",
  },
  {
    name: "Vehicles",
    href: "/vehicles",
    icon: Truck,
    allowed: ["admin"],
    permission: "vehicles",
  },
  {
    name: "Driver Sales",
    href: "/driver-sales",
    icon: ShoppingCart,
    allowed: ["admin", "driver"],
    permission: "driver-sales",
  },
  {
    name: "Quotations",
    href: "/quotations",
    icon: ReceiptText,
    allowed: ["admin"],
    permission: "quotations",
  },
  {
    name: "Material Reservations",
    href: "/material-reservations",
    icon: ClipboardCheck,
    allowed: ["admin"],
    permission: "material-reservations",
  },
  {
    name: "Suppliers",
    href: "/suppliers",
    icon: UserPlus,
    allowed: ["admin"],
    permission: "suppliers",
  },
  {
    name: "Customers",
    href: "/customers",
    icon: Users2,
    allowed: ["admin"],
    permission: "customers",
  },
  {
    name: "Financial Statement",
    href: "/financialStatement",
    icon: FileText,
    allowed: ["admin"],
    permission: "financial-statement",
  },
  {
    name: "Warehouses",
    href: "/warehouses",
    icon: Warehouse,
    allowed: ["admin"],
    permission: "warehouses",
  },
  {
    name: "Categories",
    href: "/categories",
    icon: Shapes,
    allowed: ["admin"],
    permission: "categories",
  },
  {
    name: "Chart of Accounts",
    href: "/accounts",
    icon: Book,
    allowed: ["admin"],
    permission: "accounts",
  },
  {
    name: "Journal Entries",
    href: "/journal-entries",
    icon: ScrollText,
    allowed: ["admin"],
    permission: "journal-entries",
  },
  {
    name: "Trial Balance",
    href: "/trial-balance",
    icon: Scale,
    allowed: ["admin"],
    permission: "trial-balance",
  },
  {
    name: "General Ledger",
    href: "/general-ledger",
    icon: BookOpen,
    allowed: ["admin"],
    permission: "general-ledger",
  },
  {
    name: "Income Statement",
    href: "/income-statement",
    icon: ChartNoAxesCombined,
    allowed: ["admin"],
    permission: "income-statement",
  },
  {
    name: "Profit Analysis",
    href: "/profit-analysis",
    icon: TrendingUp,
    allowed: ["admin"],
    permission: "profit-analysis",
  },
];

export const adminNavigationGroups: NavigationItem[] = [
  {
    name: "Users",
    href: "/users",
    icon: UserCog,
    allowed: ["admin"],
  },
];

export const sidebarNavigationGroups = [
  ...navigationGroups,
  ...adminNavigationGroups,
];

export const orderedNavigationItems = [
  dashboardNavigationItem,
  ...sidebarNavigationGroups,
];

export const assignablePagePermissions = [
  dashboardNavigationItem,
  ...navigationGroups,
].filter((item): item is NavigationItem & { permission: AppPermission } =>
  Boolean(item.permission),
);

export const allPagePermissions = assignablePagePermissions.map(
  (item) => item.permission,
);

export function getUserPermissions(user: InventoryUserWithPermissions | null) {
  if (!user) return [];

  const permissions =
    user.permissions || user.allowedPages || user.pagePermissions || [];

  return Array.isArray(permissions) ? permissions : [];
}

export function hasExplicitPermissions(
  user: InventoryUserWithPermissions | null,
) {
  return Boolean(
    user &&
      (Array.isArray(user.permissions) ||
        Array.isArray(user.allowedPages) ||
        Array.isArray(user.pagePermissions)),
  );
}

export function userHasPermission(
  user: InventoryUserWithPermissions | null,
  permission?: AppPermission,
) {
  if (!permission) return true;
  if (user?.role === "admin") return true;

  return getUserPermissions(user).includes(permission);
}

export function userCanAccessNavigation(
  user: InventoryUserWithPermissions | null,
  item: NavigationItem,
) {
  if (user?.role === "admin") return true;

  if (item.permission && hasExplicitPermissions(user)) {
    return userHasPermission(user, item.permission);
  }

  return Boolean(user?.role && item.allowed.includes(user.role));
}

export function getFirstAccessibleNavigationPath(
  user: InventoryUserWithPermissions | null,
) {
  if (!user) return "/login";

  return (
    orderedNavigationItems.find((item) => userCanAccessNavigation(user, item))
      ?.href || "/unauthorized"
  );
}
