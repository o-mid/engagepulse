import * as React from "react"
import { Toast as ToastPrimitive } from "@base-ui/react/toast"

import type { ToastActionElement, ToastProps } from "./toast"

const TOAST_LIMIT = 1

type ToasterToast = Omit<ToastProps, "toast"> & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
  duration?: number
}

type Toast = Omit<ToasterToast, "id">

// Extra fields that have no slot on the Base UI toast object. They travel on
// `toast.data` and the Toaster re-applies them when rendering.
type ToastData = {
  action?: ToastActionElement
  rootProps: Omit<Toast, "title" | "description" | "action" | "duration">
}

// Module-level manager so `toast()` keeps working outside React components.
// The Toaster wires it into the tree via <ToastProvider toastManager={...}>.
const toastManager = ToastPrimitive.createToastManager()

interface State {
  toasts: ToasterToast[]
}

let memoryState: State = { toasts: [] }

const listeners: Array<(state: State) => void> = []

function setMemoryState(toasts: ToasterToast[]) {
  memoryState = { toasts }
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

function toManagerOptions({
  title,
  description,
  action,
  duration,
  ...rootProps
}: Toast) {
  return {
    title,
    description,
    timeout: duration,
    data: { action, rootProps } satisfies ToastData,
  }
}

/**
 * Provider-side changes (auto-timeout, swipe dismiss, ToastClose click) never
 * flow back through the manager, so the mounted Toaster mirrors the
 * provider's toast list into this module whenever it changes. Without this,
 * useToast().toasts keeps ghost entries after auto-dismiss.
 */
function syncFromManager(
  toasts: Array<{
    id: string
    title?: React.ReactNode
    description?: React.ReactNode
    data?: unknown
  }>
) {
  // Sync unconditionally: the provider emits a new array only when something
  // changed, and an id-only comparison would miss in-place title/description
  // updates. Mirror listeners never write back to the manager, so no loop.
  setMemoryState(
    toasts.map(({ id, title, description, data }) => {
      // SAFETY: `data` is what this hook itself stored on the toast, so its shape
      // is the ToastData written on the way in.
      const { action, rootProps } = (data ?? {}) as Partial<ToastData>
      // SAFETY: the literal restates ToasterToast's own fields from the toast
      // being mirrored, plus the root props stored with it.
      return { id, title, description, action, ...rootProps } as ToasterToast
    })
  )
}

function dismissToast(toastId?: string) {
  // close() with no id closes every toast, matching the old dismiss().
  toastManager.close(toastId)
  setMemoryState(
    toastId === undefined
      ? []
      : memoryState.toasts.filter((t) => t.id !== toastId)
  )
}

function toast({ ...props }: Toast) {
  const id = toastManager.add(toManagerOptions(props))

  setMemoryState(
    [{ ...props, id }, ...memoryState.toasts].slice(0, TOAST_LIMIT)
  )

  const update = (props: ToasterToast) => {
    const current = memoryState.toasts.find((t) => t.id === id)
    const { id: _id, ...merged } = { ...current, ...props }
    toastManager.update(id, toManagerOptions(merged))
    setMemoryState(
      memoryState.toasts.map((t) => (t.id === id ? { ...t, ...props, id } : t))
    )
  }

  const dismiss = () => dismissToast(id)

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dismissToast(toastId),
  }
}

export {
  useToast,
  toast,
  toastManager,
  syncFromManager,
  TOAST_LIMIT,
  type ToastData,
}
