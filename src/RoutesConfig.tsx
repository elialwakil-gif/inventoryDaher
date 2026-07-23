import React from "react";
import { PrivateRoute } from "@/components/auth/PrivateRoute";
import type { AppPermission } from "@/config/permissions";

// Lazy Loading للصفحات
const Products = React.lazy(() => import("@/pages/Products"));
const Dashboard = React.lazy(() => import("@/pages/Dashboard"));
const SellProduct = React.lazy(() => import("@/pages/SellProduct"));
const Vehicles = React.lazy(() => import("@/pages/Vehicles"));
const DriverSales = React.lazy(() => import("@/pages/DriverSales"));
const Quotations = React.lazy(() => import("@/pages/Quotations"));
const Home = React.lazy(() => import("@/pages/Home"));
const NotFound = React.lazy(() => import("@/pages/NotFound"));
const Login = React.lazy(() => import("@/pages/Login"));
const SignUp = React.lazy(() => import("@/pages/SignUp"));
const Suppliers = React.lazy(() => import("@/pages/Suppliers"));
const Customers = React.lazy(() => import("@/pages/Customers"));
const UnauthorizedPage = React.lazy(() => import("@/pages/Unauthorized"));
const FinancialStatement = React.lazy(() => import("@/pages/FinancialStatement"));
const CustomerDetails = React.lazy(() => import("@/pages/CustomerDetails"));
const SupplierDetails = React.lazy(() => import("@/pages/SupplierDetails"));
const ProductDetails = React.lazy(() => import("@/pages/ProductDetails"));
const Exchange = React.lazy(() => import("@/pages/Exchange"));
const Warehouses = React.lazy(() => import("@/pages/Warehouses"));
const SellDetails = React.lazy(() => import("@/pages/SellDetails"));
const WarehousesDetails = React.lazy(() => import("@/pages/WarehousesDetails"));
const Categories = React.lazy(() => import("@/pages/Categories"));
const CategoryDetails = React.lazy(() => import("@/pages/CategoryDetails"));
const ChartAccount = React.lazy(()=> import('@/pages/ChartAccount'))
const ChartAccountDetails = React.lazy(()=> import('@/pages/ChartAccountDetails'))
const JournalEntries = React.lazy(()=> import('@/pages/JournalEntries'))
const TrialBalance = React.lazy(()=> import('@/pages/TrialBalance'))
const GeneralLedger = React.lazy(()=> import('@/pages/GeneralLedger'))
const IncomeStatement = React.lazy(()=> import('@/pages/IncomeStatement'))
const ProfitAnalysis = React.lazy(()=> import('@/pages/ProfitAnalysis'))
const InventoryBalances = React.lazy(()=> import('@/pages/InventoryBalances'))
const Purchases =React.lazy(()=> import('@/pages/Purchases'))
const Users = React.lazy(() => import("@/pages/Users"));
const MaterialReservations = React.lazy(() => import("@/pages/MaterialReservations"));
//   const AskAi = React.lazy(() => import('@/pages/AskAi'))
// import AiReports from "@/pages/AiReports";

const protect = (
  element: JSX.Element,
  allowedRoles = ["admin"],
  permission?: AppPermission,
) => (
  <PrivateRoute allowedRoles={allowedRoles} permission={permission}>
    {element}
  </PrivateRoute>
);

export const routesConfig = [
  { path: "/", element: <Login /> },
  { path: "/login", element: <Login /> },
  { path: "/home", element: protect(<Home />, ["admin", "user"], "home") },
  { path: "/signUp", element: <SignUp /> },
  { path: "/unauthorized", element: <UnauthorizedPage /> },
  { path: "/Products", element: protect(<Products />, ["admin", "user"], "products")},
  { path: "/suppliers", element:  protect(<Suppliers />, ["admin"], "suppliers") },
  { path: "/customers", element:  protect(<Customers />, ["admin"], "customers") },
  { path: "/dashboard", element: protect(<Dashboard />, ["admin", "user"], "dashboard") },
  { path: "/sellProduct", element: protect(<SellProduct />, ["admin"], "sell-product") },
  { path: "/vehicles", element: protect(<Vehicles />, ["admin"], "vehicles") },
  { path: "/driver-sales", element: protect(<DriverSales />, ["admin", "driver"], "driver-sales") },
  { path: "/quotations", element: protect(<Quotations />, ["admin"], "quotations") },
  { path: "/material-reservations", element: protect(<MaterialReservations />, ["admin"], "material-reservations") },
  { path: "/financialStatement", element: protect(<FinancialStatement />, ["admin"], "financial-statement") },
  { path: "/SupplierDetails", element: protect(<SupplierDetails />, ["admin"], "suppliers") },
  { path: "/CustomerDetails", element: protect(<CustomerDetails />, ["admin"], "customers") },
  { path: "/productDetails", element: protect(<ProductDetails />, ["admin", "user"], "products") },
  { path: "/sellDetails", element: protect(<SellDetails />, ["admin"], "sell-product") },
  { path: "/Exchange", element: protect(<Exchange />) },
  { path: "/warehouses", element: protect(<Warehouses />, ["admin"], "warehouses") },
  { path: "/warehouses/:id", element: protect(<WarehousesDetails />, ["admin"], "warehouses") },
  { path: "/categories", element: protect(<Categories />, ["admin"], "categories") },
  { path: "/categories/:id", element: protect(<CategoryDetails />, ["admin"], "categories") },
  { path: "/accounts", element: protect(<ChartAccount />, ["admin"], "accounts") },
  {path : '/accounts/:id' , element: protect(<ChartAccountDetails />, ["admin"], "accounts")},
  { path: "/journal-entries", element: protect(<JournalEntries />, ["admin"], "journal-entries") },
  { path: "/trial-balance", element: protect(<TrialBalance />, ["admin"], "trial-balance") },
  { path: "/general-ledger", element: protect(<GeneralLedger />, ["admin"], "general-ledger") },
  { path: "/general-ledger/:id", element: protect(<GeneralLedger />, ["admin"], "general-ledger") },
  { path: "/income-statement", element: protect(<IncomeStatement />, ["admin"], "income-statement") },
  { path: "/profit-analysis", element: protect(<ProfitAnalysis />, ["admin"], "profit-analysis") },
  { path: "/inventory-balances", element: protect(<InventoryBalances />, ["admin"], "inventory-balances") },
  // { path: "/ai-reports", element: <AiReports /> },
  // { path: "/ai-chat", element: <AskAi /> },
  {path: '/purchases' , element: protect(<Purchases />, ["admin"], "purchases")},
  { path: "/users", element: protect(<Users />) },
  { path: "*", element: <NotFound /> }
];
