"use client"

import * as React from "react"
import { Toast as ToastPrimitive } from "@base-ui/react/toast"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./toast"
import {
  TOAST_LIMIT,
  syncFromManager,
  toastManager,
  type ToastData,
} from "./use-toast"

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager()

  // Mirror provider-side removals (auto-timeout, swipe, close button) back
  // into the use-toast module so useToast().toasts never holds ghosts.
  React.useEffect(() => {
    syncFromManager(toasts)
  }, [toasts])

  return (
    <>
      {toasts
        .filter((toastObject) => !toastObject.limited)
        .map(function (toastObject) {
          const { id, title, description, data } = toastObject
          // SAFETY: `data` is what this hook itself stored on the toast, so its shape
          // is the ToastData written on the way in.
          const { action, rootProps } = (data ?? {}) as Partial<ToastData>
          return (
            <Toast key={id} toast={toastObject} {...rootProps}>
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
              {action}
              <ToastClose />
            </Toast>
          )
        })}
    </>
  )
}

export function Toaster() {
  return (
    <ToastProvider toastManager={toastManager} limit={TOAST_LIMIT}>
      <ToastViewport>
        <ToastList />
      </ToastViewport>
    </ToastProvider>
  )
}
