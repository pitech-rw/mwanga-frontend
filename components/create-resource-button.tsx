"use client";

import { useState } from "react";
import type { Section } from "../lib/nav";
import { getCreateConfig } from "../lib/resource-create-config";
import { CreateResourceModal } from "./create-resource-modal";
import { IconPlus } from "./icons/icon";

type CreateResourceButtonProps = {
  section: Section;
  onCreated?: () => void;
  onError?: (message: string) => void;
};

export function CreateResourceButton({ section, onCreated, onError }: CreateResourceButtonProps) {
  const [open, setOpen] = useState(false);
  const config = getCreateConfig(section);

  if (!config) {
    return null;
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
