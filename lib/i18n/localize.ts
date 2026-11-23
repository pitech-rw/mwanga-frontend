import type { CreateResourceConfig, FieldSpec } from "../resource-create-config";
import type { MessageKey, TranslateFn } from "./translate";

function fieldKeyName(name: string): MessageKey {
  return `fields.keys.${name}` as MessageKey;
}

export function localizeField(field: FieldSpec, t: TranslateFn): FieldSpec {
  const key = fieldKeyName(field.name);
  const label = t(key);

  const options = field.options?.map((option) => ({
    ...option,
    label: t(`enums.${option.value}` as Parameters<TranslateFn>[0]),
  }));

  let placeholder = field.placeholder;
  if (field.placeholderKey) {
    placeholder = t(field.placeholderKey as MessageKey);
  } else if (placeholder) {
    const placeholderKey = `fields.placeholders.${field.name}` as Parameters<TranslateFn>[0];
    const localized = t(placeholderKey);
    if (localized !== placeholderKey) {
      placeholder = localized;
    }
  }

  return { ...field, label, options, placeholder };
}

export function localizeCreateConfig(config: CreateResourceConfig, t: TranslateFn): CreateResourceConfig {
  const section = config.section;
  return {
    ...config,
    title: t(`create.${section}.title` as MessageKey),
    description:
      config.description !== undefined
        ? t(`create.${section}.description` as MessageKey)
        : undefined,
    submitLabel: t(`create.${section}.submitLabel` as MessageKey),
    fields: config.fields.map((field) => localizeField(field, t)),
  };
}