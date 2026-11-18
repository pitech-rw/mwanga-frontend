import { en } from "../messages/en";
import { readLocale, type LocaleCode } from "./locale-storage";
import { getTranslator, translateFieldKey, type MessageKey, type TranslateParams } from "./i18n/translate";

export const API_USER_MESSAGE_KEYS = {
  create: "errors.api.create",
  load: "errors.api.load",
  signIn: "errors.api.signIn",
  signInInvalid: "errors.api.signInInvalid",
  forgotPassword: "errors.api.forgotPassword",
  resetPassword: "errors.api.resetPassword",
  profileLoad: "errors.api.profileLoad",
  profileUpdate: "errors.api.profileUpdate",
  offline: "errors.api.offline",
} as const satisfies Record<string, MessageKey>;

export type ApiUserAction = keyof typeof API_USER_MESSAGE_KEYS;

export type ApiErrorBody = {
  statusCode?: number;
  code?: string;
  params?: Record<string, string | number>;
  message?: string | string[];
  errors?: Array<{ field: string; rule: string }>;
  error?: string;
};

export type ApiSuccessBody = {
  code?: string;
  params?: Record<string, string | number>;
  /** @deprecated legacy API shape — do not show to users in production */
  message?: string;
};

function isKnownMessageKey(key: unknown): key is MessageKey {
  return typeof key === "string" && key.length > 0 && Object.hasOwn(en, key);
}

const validationRuleToMessageKey: Record<string, MessageKey> = {
  required: "validation.required",
  invalid: "validation.invalid",
  isEmail: "validation.isEmail",
  isIn: "validation.isIn",
  isInt: "validation.isInt",
  isBoolean: "validation.isBoolean",
  isEnum: "validation.isEnum",
  minLength: "validation.minLength",
  maxLength: "validation.maxLength",
  isString: "validation.isString",
  isNumber: "validation.isNumber",
  min: "validation.min",
  max: "validation.max",
  whitelistValidation: "validation.whitelistValidation",
  forbidNonWhitelisted: "validation.forbidNonWhitelisted",
};

export function messageFromApiErrorBody(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const { message } = data as ApiErrorBody;

  if (typeof message === "string") {
    const trimmed = message.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(message)) {
    const parts = message
      .filter((part): part is string => typeof part === "string")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    return parts.length > 0 ? parts.join(" ") : null;
  }

  return null;
}

export function formatValidationIssues(
  issues: Array<{ field: string; rule: string }>,
  locale: LocaleCode,
): string {
  const first = issues[0];
  if (!first) {
    return translate(locale, "validation.failed");
  }

  const fieldLabel = translateFieldKey(locale, first.field);
  const messageKey =
    validationRuleToMessageKey[first.rule] ??
    (isKnownMessageKey(`validation.${first.rule}`)
      ? (`validation.${first.rule}` as MessageKey)
      : "validation.invalid");

  return translate(locale, messageKey, { field: fieldLabel });
}

function translate(locale: LocaleCode, key: MessageKey, params?: TranslateParams): string {
  const t = getTranslator(locale);
  return t(key, params);
}

export function resolveUserMessage(
  data: unknown,
  action: Exclude<ApiUserAction, "signInInvalid" | "offline">,
  status: number,
  locale?: LocaleCode,
): string {
  const loc = locale ?? readLocale();

  if (data && typeof data === "object") {
    const body = data as ApiErrorBody;

    if (body.code === "validation.failed" && Array.isArray(body.errors) && body.errors.length > 0) {
      return formatValidationIssues(body.errors, loc);
    }

    const apiCode = body.code;
    if (typeof apiCode === "string" && apiCode !== "unknown" && isKnownMessageKey(apiCode)) {
      return translate(loc, apiCode, body.params as TranslateParams | undefined);
    }
  }

  if (process.env.NODE_ENV === "development") {
    const legacy = messageFromApiErrorBody(data);
    if (legacy) {
      console.warn("[api-errors] Unmapped API message:", legacy);
      return legacy;
    }
  }

  return userMessageForStatus(action, status, loc);
}

export function userMessageFromApiCode(
  code: string | undefined,
  params?: TranslateParams,
  locale?: LocaleCode,
  legacyMessage?: string,
  fallbackKey: MessageKey = "errors.api.create",
): string {
  const loc = locale ?? readLocale();

  if (isKnownMessageKey(code)) {
    return translate(loc, code, params);
  }

  if (process.env.NODE_ENV === "development") {
    const legacy = legacyMessage?.trim();
    if (legacy) {
      return legacy;
    }
    if (typeof code === "string" && code !== "unknown") {
      return code;
    }
  }

  return translate(loc, fallbackKey);
}

export function userMessageForStatus(
  action: Exclude<ApiUserAction, "signInInvalid" | "offline">,
  status: number,
  locale?: LocaleCode,
): string {
  const loc = locale ?? readLocale();
  const t = getTranslator(loc);

  if (action === "signIn" && status === 401) {
    return t(API_USER_MESSAGE_KEYS.signInInvalid);
  }

  return t(API_USER_MESSAGE_KEYS[action]);
}

export async function userMessageFromResponse(
  action: Exclude<ApiUserAction, "signInInvalid" | "offline">,
  response: Response,
  locale?: LocaleCode,
): Promise<string> {
  try {
    const data: unknown = await response.json();
    return resolveUserMessage(data, action, response.status, locale);
  } catch {
    return userMessageForStatus(action, response.status, locale);
  }
}

export function userMessageForNetwork(action: Exclude<ApiUserAction, "signInInvalid">, locale?: LocaleCode): string {
  const loc = locale ?? readLocale();
  const t = getTranslator(loc);
  return t(API_USER_MESSAGE_KEYS[action === "offline" ? "offline" : action]);
}

/** @deprecated use API_USER_MESSAGE_KEYS */
export const API_USER_MESSAGES = API_USER_MESSAGE_KEYS;