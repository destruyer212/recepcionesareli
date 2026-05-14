import type {
  AiResponse,
  Client,
  ClientLookupResponse,
  ClientPayload,
  AppSettings,
  ContractPreview,
  DashboardSummary,
  EventStaffAssignment,
  EventStaffAssignmentPayload,
  EventItem,
  RescheduleOptions,
  StaffAvailability,
  EventPackage,
  EventPayload,
  Floor,
  InventoryDashboard,
  InventoryPayload,
  InventoryItem,
  WorkerContact,
  WorkerPayload,
} from './types'

function stripTrailingSlash(s: string): string {
  return s.endsWith('/') ? s.slice(0, -1) : s
}

/** Base del API (/api/dashboard, …). Producción habitual: mismo dominio/Nginx proxy → `/api`. */
function resolveApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL?.trim()
  if (raw) return stripTrailingSlash(raw)
  return '/api'
}

const API_BASE_URL = resolveApiBaseUrl()

function cleanEventPayload(payload: EventPayload): EventPayload {
  return {
    ...payload,
    packageId: payload.packageId || undefined,
    apdaycNotes: payload.apdaycNotes || undefined,
    notes: payload.notes || undefined,
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    const text = await response.text()
    let detail = text || `Error HTTP ${response.status}`
    try {
      const j = JSON.parse(text) as { message?: string; path?: string; error?: string }
      if (typeof j.message === 'string' && j.message.trim()) {
        detail = j.message
      } else if (response.status === 404 && typeof j.path === 'string') {
        detail = `El servidor no expone esta ruta (${j.path}). Reinicia areli-api con el proyecto actualizado (mvn spring-boot:run o tu JAR más reciente).`
      }
    } catch {
      /* texto no JSON */
    }
    throw new Error(detail)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export const api = {
  dashboard: () => request<DashboardSummary>('/dashboard/summary'),
  clients: () => request<Client[]>('/clients'),
  createClient: (payload: ClientPayload) =>
    request<Client>('/clients', { method: 'POST', body: JSON.stringify(payload) }),
  updateClient: (id: string, payload: ClientPayload) =>
    request<Client>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  lookupClientDocument: (documentType: 'DNI' | 'RUC', documentNumber: string) =>
    request<ClientLookupResponse>(
      `/integration/document-lookup?documentType=${encodeURIComponent(documentType)}&documentNumber=${encodeURIComponent(documentNumber)}`,
    ),
  settings: () => request<AppSettings>('/settings'),
  updateSettings: (payload: {
    peruApiToken?: string
    clearPeruApiToken?: boolean
    rescheduleMinNoticeDays?: number
    rescheduleMaxMonths?: number
    cancellationRetentionNoticeDays?: number
  }) =>
    request<AppSettings>('/settings', { method: 'PUT', body: JSON.stringify(payload) }),
  floors: () => request<Floor[]>('/floors'),
  inventory: () => request<InventoryDashboard>('/inventory'),
  createInventoryItem: (payload: InventoryPayload) =>
    request<InventoryItem>('/inventory', { method: 'POST', body: JSON.stringify(payload) }),
  deleteInventoryItem: (id: string) => request<void>(`/inventory/${id}`, { method: 'DELETE' }),
  workers: () => request<WorkerContact[]>('/workers'),
  createWorker: (payload: WorkerPayload) =>
    request<WorkerContact>('/workers', { method: 'POST', body: JSON.stringify(payload) }),
  deleteWorker: (id: string) => request<void>(`/workers/${id}`, { method: 'DELETE' }),
  packages: () => request<EventPackage[]>('/packages'),
  events: () => request<EventItem[]>('/events'),
  contractPreview: (eventId: string) => request<ContractPreview>(`/events/${eventId}/contract-preview`),
  eventStaffAssignments: (eventId: string) =>
    request<EventStaffAssignment[]>(`/events/${eventId}/staff-assignments`),
  eventStaffAvailability: (eventId: string, roleKey: string) =>
    request<StaffAvailability[]>(
      `/events/${eventId}/staff-assignments/availability?roleKey=${encodeURIComponent(roleKey)}`,
    ),
  assignEventStaff: (eventId: string, payload: EventStaffAssignmentPayload) =>
    request<EventStaffAssignment>(`/events/${eventId}/staff-assignments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  removeEventStaffAssignment: (eventId: string, assignmentId: string) =>
    request<void>(`/events/${eventId}/staff-assignments/${assignmentId}`, { method: 'DELETE' }),
  createEvent: (payload: EventPayload) =>
    request<EventItem>('/events', { method: 'POST', body: JSON.stringify(cleanEventPayload(payload)) }),
  updateEvent: (
    id: string,
    payload: Partial<EventPayload> & {
      title: string
      eventType: string
      eventDate: string
      startTime: string
      endTime: string
      status: EventPayload['status']
      totalAmount: number
      apdaycAmount: number
      contractCapacityOverride?: number
    },
  ) =>
    request<EventItem>(`/events/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  cancelEvent: (id: string) => request<EventItem>(`/events/${id}/cancel`, { method: 'POST' }),
  cancelEventWithContract: (
    id: string,
    payload: {
      cancellationType: 'CLIENT_REQUEST' | 'FORCE_MAJEURE' | 'NO_SHOW' | 'RESCHEDULE_REQUEST_REJECTED'
      requestedAt?: string
      cancellationNotes?: string
    },
  ) => request<EventItem>(`/events/${id}/cancel`, { method: 'POST', body: JSON.stringify(payload) }),
  rescheduleEvent: (id: string, payload: { eventDate: string; startTime: string; endTime: string }) =>
    request<EventItem>(`/events/${id}/reschedule`, { method: 'POST', body: JSON.stringify(payload) }),
  rescheduleOptions: (id: string) => request<RescheduleOptions>(`/events/${id}/reschedule-options`),
  aiContract: (payload: Record<string, unknown>) =>
    request<AiResponse>('/ai/contracts/draft', { method: 'POST', body: JSON.stringify(payload) }),
  aiSummary: (payload: Record<string, unknown>) =>
    request<AiResponse>('/ai/events/summary', { method: 'POST', body: JSON.stringify(payload) }),
  aiMarketing: (payload: Record<string, unknown>) =>
    request<AiResponse>('/ai/marketing/copy', { method: 'POST', body: JSON.stringify(payload) }),
  aiBalance: (payload: Record<string, unknown>) =>
    request<AiResponse>('/ai/balance/explain', { method: 'POST', body: JSON.stringify(payload) }),
}
