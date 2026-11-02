"use client";

import { Fragment } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useData } from "@/data/DataProvider";
import { scopeBreadcrumbs } from "@/domain/selectors";
import type { Scope } from "@/domain/types";

export function ScopeBreadcrumbs({
  scope,
  onNavigate,
}: {
  scope: Scope;
  onNavigate: (s: Scope) => void;
}) {
  const index = useData();
  const crumbs = scopeBreadcrumbs(index, scope);
  return (
    <Breadcrumb aria-label="Drill path">
      <BreadcrumbList>
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <Fragment key={`${c.level}:${c.id ?? "root"}`}>
              {i > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem>
                {last ? (
                  <BreadcrumbPage>{c.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <button type="button" onClick={() => onNavigate(c.scope)}>
                      {c.label}
                    </button>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
