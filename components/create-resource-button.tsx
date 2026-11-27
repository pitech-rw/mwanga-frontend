"use client";

import { useState } from "react";
import type { Section } from "../lib/nav";
import { PERMISSIONS } from "../lib/permission-strings";
import { sectionWritePermission } from "../lib/nav-permissions";
import { getCreateConfig } from "../lib/resource-create-config";
import { userMayUsePermission } from "../lib/table-row-actions";
import { CreateResourceModal } from "./create-resource-modal";
import { IconPlus } from "./icons/icon";

type CreateResourceButtonProps = {
  section: Section;
  permissions?: readonly string[];
  onCreated?: (created?: Record<string, unknown>) => void;
  onError?: (message: string) => void;
};

export function CreateResourceButton({ section, permissions = [], onCreated, onError }: CreateResourceButtonProps) {
  const [open, setOpen] = useState(false);
  const config = getCreateConfig(section);
  if (!config) {
    return null;
  }

  if (section === "riders") {
    const allowed =
      userMayUsePermission(permissions, PERMISSIONS.riders.write) ||
      userMayUsePermission(permissions, PERMISSIONS.owners.write) ||
      userMayUsePermission(permissions, PERMISSIONS.users.write);
    if (!allowed) {
      return null;
    }
  } else {
    const writePerm = sectionWritePermission(section);
    if (writePerm && !userMayUsePermission(permissions, writePerm)) {
      return null;
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn icon-only primary"
        aria-label={config.title}
        title={config.title}
        onClick={() => setOpen(true)}
      >
        <IconPlus size={18} />
      </button>
      <CreateResourceModal
        open={open}
        section={section}
        onClose={() => setOpen(false)}
        onCreated={onCreated}
        onError={onError}
      />
    </>
  );
}
