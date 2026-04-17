export type AppNoticeType = "success" | "warning" | "error" | "info";

type AppNoticeDetail = {
  message: string;
  type?: AppNoticeType;
};

export function notify(message: string, type: AppNoticeType = "error") {
  const text = String(message || "").trim();
  if (!text) {
    return;
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<AppNoticeDetail>("app-notice", { detail: { message: text, type } }));
    return;
  }
}

export function notifyOrAlert(message: string, type: AppNoticeType = "error") {
  const text = String(message || "").trim();
  if (!text) {
    return;
  }

  if (typeof window !== "undefined") {
    notify(text, type);
    return;
  }

  // Fallback for non-browser contexts.
  // eslint-disable-next-line no-alert
  alert(text);
}

