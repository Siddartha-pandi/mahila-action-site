"use client";

import { useState, useMemo, useEffect } from "react";

export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
}

export function usePagination<T>(
  items: T[],
  options: UsePaginationOptions = {}
) {
  const { initialPage = 1, initialPageSize = 10 } = options;

  const [page, setPage] = useState<number>(initialPage);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Reset to page 1 if current page becomes invalid due to item filtering
  useEffect(() => {
    if (page > totalPages) {
      setPage(1);
    }
  }, [totalItems, totalPages, page]);

  const paginatedItems = useMemo(() => {
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize, totalPages]);

  const handlePageChange = (newPage: number) => {
    const safePage = Math.min(Math.max(1, newPage), totalPages);
    setPage(safePage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    paginatedItems,
    setPage: handlePageChange,
    setPageSize: handlePageSizeChange,
  };
}
