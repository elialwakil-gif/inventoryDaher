import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { inventoryUser } from "../layout/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  hidden?: boolean;
  onlyAdmin?: boolean;
}

interface TableData {
  [key: string]: any;
}

interface DataTableProps {
  title: string;
  description?: string;
  columns: TableColumn[];
  data: TableData[];
  searchable?: boolean;
  className?: string;
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  getRowClassName?: (row: TableData) => string;
  renderRowActions?: (row: TableData) => React.ReactNode;
  amountBold?: boolean;
  onRowClick?: any;
  selectedRows?: any[];
  titleButton?: React.ReactNode;
  isLoading?: boolean
}

export function DataTable({
  title,
  description,
  columns,
  data,
  searchable = true,
  className,
  pageSizeOptions = [5, 10, 20],
  defaultPageSize = 10,
  getRowClassName,
  renderRowActions,
  amountBold = false,
  onRowClick,
  titleButton,
  isLoading
}: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const [inventoryUser, setInventoryUser] = useState<inventoryUser>();
  useEffect(() => {
    const temUser = JSON.parse(localStorage.getItem("InventoryUser") || "null");
    setInventoryUser(temUser);
  }, []);

  const searchableColumns = columns.filter(
    (column) =>
      !column.hidden &&
      !(column.onlyAdmin && inventoryUser?.role !== "admin"),
  );

  const filteredData = data.filter((item) =>
    searchableColumns.some((column) =>
      item[column.key]
        ?.toString()
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
    ),
  );

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig) return 0;
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig?.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const isColumnVisible = (column: TableColumn) =>
    !column.hidden && !(column.onlyAdmin && inventoryUser?.role !== "admin");

  const visibleColumns = columns.filter(isColumnVisible);

  const renderCellContent = (value: any, key: string) => {
    if (key === "status") {
      const successStatuses = ["completed", "تم التسديد", "نقدي", "مسدد"];
      const warningStatuses = ["جاري التسديد", "جزئي", "مدفوع جزئيا"];

      return (
        <Badge
          variant={
            successStatuses.includes(value)
              ? "default"
              : warningStatuses.includes(value)
                ? "secondary"
                : "destructive"
          }
          className="capitalize text-center"
        >
          {value}
        </Badge>
      );
    }
    if (key === "email") {
      return <span className="text-muted-foreground">{value}</span>;
    }
    if (key === "createdAt" || key === "date" || key === "timestamp") {
      return (
        <span className="text-muted-foreground">
          {value instanceof Date
            ? value.toLocaleString("en-GB")
            : !isNaN(Date.parse(value))
              ? new Date(value).toLocaleString("en-GB")
              : value}
        </span>
      );
    }
    if (key === "amount" && amountBold) {
      return (
        <span className="text-primary font-extrabold text-xl">{value}</span>
      );
    }
    if (key === "quantity") {
      return (
        <span className="">
          {typeof value == "number" ? value.toFixed(2) : value}
        </span>
      );
    }
    if (key === "totalPrice") {
      return (
        <span className="">
          {typeof value == "number" ? value.toFixed(2) : value}
        </span>
      );
    }
    if (key === "balance") {
      return value > 0 ? (
        <span className="text-green-700 font-bold text-lg">له {value}</span>
      ) : (
        <span className="text-destructive font-bold text-lg">
          عليه {-value}
        </span>
      );
    }
    return value;
  };

  const SKELETON_ROWS = Array.from({ length: pageSize });

  return (
    <Card className={cn("w-full overflow-hidden", className)}>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center">
            <div className="min-w-0">
              <CardTitle className="text-lg sm:text-2xl">{title}</CardTitle>
              {description && (
                <CardDescription className="mt-2 break-words">
                  {description}
                </CardDescription>
              )}
            </div>
            {titleButton && (
              <div className="w-full shrink-0 md:w-auto">{titleButton}</div>
            )}
          </div>
          {searchable && (
            <div className="flex w-full items-center md:max-w-sm">
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-8"
                />
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
        <div className="space-y-3 md:hidden">
          {isLoading ? (
            SKELETON_ROWS.map((_, rowIndex) => (
              <div
                key={`mobile-skeleton-${rowIndex}`}
                className="rounded-md border bg-card p-3"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <Skeleton className="h-5 w-32 rounded-md" />
                  {renderRowActions && (
                    <Skeleton className="h-8 w-16 rounded-md" />
                  )}
                </div>
                <div className="space-y-2">
                  {visibleColumns.slice(0, 4).map((column) => (
                    <div
                      key={column.key}
                      className="flex items-center justify-between gap-3"
                    >
                      <Skeleton className="h-3 w-20 rounded-md" />
                      <Skeleton className="h-4 w-28 rounded-md" />
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : paginatedData.length > 0 ? (
            paginatedData.map((row, index) => {
              const firstColumn = visibleColumns[0];
              const detailColumns = visibleColumns.slice(1);

              return (
                <div
                  key={`mobile-row-${index}`}
                  role={onRowClick ? "button" : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={() => onRowClick?.(row)}
                  onKeyDown={(event) => {
                    if (!onRowClick) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onRowClick(row);
                    }
                  }}
                  className={cn(
                    "rounded-md border bg-card p-3 text-right shadow-sm",
                    onRowClick && "cursor-pointer active:bg-muted/60",
                    getRowClassName ? getRowClassName(row) : "",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {firstColumn ? (
                        <>
                          <p className="text-xs text-muted-foreground">
                            {firstColumn.label}
                          </p>
                          <div className="mt-1 break-words text-base font-semibold">
                            {renderCellContent(
                              row[firstColumn.key],
                              firstColumn.key,
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">-</p>
                      )}
                    </div>
                    {renderRowActions && (
                      <div
                        className="flex shrink-0 flex-wrap justify-end gap-1"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {renderRowActions(row)}
                      </div>
                    )}
                  </div>

                  {detailColumns.length > 0 && (
                    <div className="mt-3 grid gap-2 text-sm">
                      {detailColumns.map((column) => (
                        <div
                          key={column.key}
                          className="grid grid-cols-[minmax(6rem,40%)_1fr] items-start gap-3 border-t pt-2"
                        >
                          <span className="text-muted-foreground">
                            {column.label}
                          </span>
                          <span className="min-w-0 break-words text-right">
                            {renderCellContent(row[column.key], column.key)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
              No data found.
            </div>
          )}
        </div>

        <div className="hidden w-full overflow-x-auto rounded-md border md:block">
          <Table className="min-w-[720px] text-center">
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead
                    className={
                      column.hidden ||
                      (column.onlyAdmin && inventoryUser?.role !== "admin")
                        ? "hidden"
                        : "whitespace-nowrap text-center"
                    }
                    key={column.key}
                  >
                    {column.sortable ? (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          handleSort(column.key);
                          console.log(column.hidden);
                        }}
                        className="h-auto whitespace-nowrap p-0 font-medium"
                      >
                        {column.label}
                        {sortConfig?.key === column.key && (
                          <span className="ml-1">
                            {sortConfig.direction === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </Button>
                    ) : (
                      <span className="whitespace-nowrap">{column.label}</span>
                    )}
                  </TableHead>
                ))}
                {renderRowActions && (
                  <TableHead className="whitespace-nowrap text-center">
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>

            <TableBody className="">
              {isLoading ? (
                SKELETON_ROWS.map((_, rowIndex) => (
                  <TableRow key={`skeleton-${rowIndex}`}>
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={
                          column.hidden ||
                          (column.onlyAdmin && inventoryUser?.role !== "admin")
                            ? "hidden"
                            : "max-w-48 whitespace-nowrap"
                        }
                      >
                        <Skeleton className="h-4 w-full rounded-md" />
                      </TableCell>
                    ))}
                    {renderRowActions && (
                      <TableCell>
                        <Skeleton className="h-4 w-16 rounded-md" />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : paginatedData.length > 0 ? (
                paginatedData.map((row, index) => (
                  <TableRow
                    onClick={() => onRowClick?.(row)}
                    key={index}
                    className={getRowClassName ? getRowClassName(row) : ""}
                  >
                    {columns.map((column) => (
                      <TableCell
                        className={
                          column.hidden ||
                          (column.onlyAdmin && inventoryUser?.role !== "admin")
                            ? "hidden"
                            : "max-w-48 truncate whitespace-nowrap"
                        }
                        key={column.key}
                        title={
                          row[column.key] == null
                            ? undefined
                            : String(row[column.key])
                        }
                      >
                        {renderCellContent(row[column.key], column.key)}
                      </TableCell>
                    ))}
                    {renderRowActions && (
                      <TableCell className="whitespace-nowrap">
                        {renderRowActions(row)}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (renderRowActions ? 1 : 0)}
                    className="text-center"
                  >
                    No data found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between gap-2 md:justify-start">
            <span className="text-sm text-muted-foreground">عدد الاسطر :</span>
            <select
              className="h-9 rounded border bg-background px-2 py-1 text-sm"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between gap-2 md:justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-9 min-w-10"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="min-w-28 text-center text-sm">
              Page {currentPage} of {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-9 min-w-10"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
