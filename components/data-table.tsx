"use client";

import { useMemo, useState, type ReactNode } from "react";
import { IconSearch } from "./icons/icon";

export type SortDirection = "asc" | "desc";

export type DataTableSelectFilter<T> = {
  id: string;
  label: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  match: (row: T, value: string) => boolean;
};

export type DataTableSortOption = {
  key: string;
  label: string;
};

export type Column<T> = {
  key: string;
  header: string;
  align?: "left" | "right";
  sortable?: boolean;
  /** Extra class on `<td>` (e.g. truncation for long strings). */
  cellClassName?: string;
  searchValue?: (row: T) => string;
  sortValue?: (row: T) => string | number;
  render: (row: T) => React.ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  empty?: string;
  loading?: boolean;
  searchPlaceholder?: string;
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  toolbarActions?: ReactNode;
  showSearch?: boolean;
  /** Select filters applied before search and sort. */
  selectFilters?: DataTableSelectFilter<T>[];
  /** Toolbar sort control (column headers remain sortable). */
  sortOptions?: DataTableSortOption[];
  defaultSortKey?: string | null;
  defaultSortDirection?: SortDirection;
  /** Extra class on the outer `.data-table` wrapper (e.g. panel table styling). */
  className?: string;
};

function defaultSearchValue<T>(row: T, column: Column<T>): string {
  if (column.searchValue) {
    return column.searchValue(row);
  }

  if (column.sortValue) {
    return String(column.sortValue(row));
  }

  const record = row as Record<string, unknown>;
  const value = record[column.key];

  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function defaultSortValue<T>(row: T, column: Column<T>): string | number {
  if (column.sortValue) {
    return column.sortValue(row);
  }

  const record = row as Record<string, unknown>;
  const value = record[column.key];

  if (typeof value === "number") {
    return value;
  }

  return String(value ?? "");
}

function compareValues(a: string | number, b: string | number, direction: SortDirection): number {
  const factor = direction === "asc" ? 1 : -1;

  if (typeof a === "number" && typeof b === "number") {
    return (a - b) * factor;
  }

  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" }) * factor;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  empty = "Nothing to show.",
  loading = false,
  searchPlaceholder = "Search this table…",
  pageSizeOptions = [10, 25, 50],
  defaultPageSize = 10,
  toolbarActions,
  showSearch = true,
  selectFilters,
  sortOptions,
  defaultSortKey = null,
  defaultSortDirection = "asc",
  className,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [page, setPage] = useState(0);
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const filter of selectFilters ?? []) {
      initial[filter.id] = filter.defaultValue ?? "";
    }
    return initial;
  });

  const needle = query.trim().toLowerCase();
  const filtersActive = useMemo(() => {
    if (!selectFilters?.length) {
      return false;
    }
    return selectFilters.some((filter) => {
      const value = filterValues[filter.id] ?? "";
      return value !== (filter.defaultValue ?? "");
    });
  }, [filterValues, selectFilters]);

  const filteredRows = useMemo(() => {
    let next = rows;

    if (selectFilters?.length) {
      next = next.filter((row) =>
        selectFilters.every((filter) => {
          const value = filterValues[filter.id] ?? filter.defaultValue ?? "";
          return filter.match(row, value);
        }),
      );
    }

    if (!needle) {
      return next;
    }

    return next.filter((row) =>
      columns.some((column) => defaultSearchValue(row, column).toLowerCase().includes(needle)),
    );
  }, [columns, filterValues, needle, rows, selectFilters]);

  const sortedRows = useMemo(() => {
    if (!sortKey) {
      return filteredRows;
    }

    const column = columns.find((entry) => entry.key === sortKey);

    if (!column || column.sortable === false) {
      return filteredRows;
    }

    return [...filteredRows].sort((left, right) =>
      compareValues(defaultSortValue(left, column), defaultSortValue(right, column), sortDirection),
    );
  }, [columns, filteredRows, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);

  const pageRows = useMemo(() => {
    const start = safePage * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [pageSize, safePage, sortedRows]);

  const toggleSort = (key: string) => {
    const column = columns.find((entry) => entry.key === key);

    if (!column || column.sortable === false) {
      return;
    }

    setPage(0);

    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection("asc");
      return;
    }

    if (sortDirection === "asc") {
      setSortDirection("desc");
      return;
    }

    setSortKey(null);
    setSortDirection("asc");
  };

  const rangeStart = sortedRows.length === 0 ? 0 : safePage * pageSize + 1;
  const rangeEnd = Math.min(sortedRows.length, (safePage + 1) * pageSize);

  return (
    <div className={className ? `data-table ${className}` : "data-table"}>
      <div className="data-table-toolbar">
        {showSearch ? (
          <label className="data-table-search">
            <IconSearch size={16} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
              placeholder={searchPlaceholder}
              aria-label="Search table"
            />
          </label>
        ) : (
          <span />
        )}
        {selectFilters && selectFilters.length > 0 ? (
          <div className="data-table-filters" role="group" aria-label="Table filters">
            {selectFilters.map((filter) => (
              <label key={filter.id} className="data-table-filter">
                <span>{filter.label}</span>
                <select
                  value={filterValues[filter.id] ?? filter.defaultValue ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    setFilterValues((current) => ({ ...current, [filter.id]: value }));
                    setPage(0);
                  }}
                >
                  {filter.options.map((option) => (
                    <option key={option.value || "__all__"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        ) : null}
        <div className="data-table-toolbar-actions">
          {sortOptions && sortOptions.length > 0 ? (
            <label className="data-table-sort">
              <span>Sort</span>
              <select
                value={sortKey ?? ""}
                onChange={(event) => {
                  const key = event.target.value;
                  setPage(0);
                  if (!key) {
                    setSortKey(null);
                    setSortDirection("asc");
                    return;
                  }
                  setSortKey(key);
                  setSortDirection("asc");
                }}
                aria-label="Sort table"
              >
                <option value="">Default</option>
                {sortOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={sortDirection}
                disabled={!sortKey}
                onChange={(event) => {
                  setSortDirection(event.target.value as SortDirection);
                  setPage(0);
                }}
                aria-label="Sort direction"
              >
                <option value="asc">A → Z</option>
                <option value="desc">Z → A</option>
              </select>
            </label>
          ) : null}
          {toolbarActions}
          <label className="data-table-pagesize">
            <span>Rows</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(0);
              }}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              {columns.map((column) => {
                const sortable = column.sortable !== false;
                const active = sortKey === column.key;
                const ariaSort = active ? (sortDirection === "asc" ? "ascending" : "descending") : "none";

                return (
                  <th key={column.key} className={column.align === "right" ? "right" : undefined} aria-sort={sortable ? ariaSort : undefined}>
                    {sortable ? (
                      <button type="button" className="th-sort" onClick={() => toggleSort(column.key)}>
                        <span>{column.header}</span>
                        <span className="sort-indicator" aria-hidden="true">
                          {active ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="empty" colSpan={columns.length}>
                  Loading…
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td className="empty" colSpan={columns.length}>
                  {empty}
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? "button" : undefined}
                >
                  {columns.map((column) => {
                    const classes = [column.cellClassName, column.align === "right" ? "right" : ""].filter(Boolean).join(" ");
                    return (
                      <td key={column.key} className={classes || undefined}>
                        {column.render(row)}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="data-table-foot">
        <span>
          {sortedRows.length === 0
            ? "0 rows"
            : `${rangeStart}–${rangeEnd} of ${sortedRows.length}${needle || filtersActive ? " (filtered)" : ""}`}
        </span>
        <div className="data-table-pager">
          <button type="button" className="btn ghost" disabled={safePage <= 0} onClick={() => setPage((value) => value - 1)}>
            Previous
          </button>
          <span>
            Page {safePage + 1} / {totalPages}
          </span>
          <button
            type="button"
            className="btn ghost"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
