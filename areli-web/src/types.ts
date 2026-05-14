export type FloorStatus = 'AVAILABLE' | 'UNDER_CONSTRUCTION' | 'MAINTENANCE' | 'UNAVAILABLE'
export type EventStatus =
  | 'INQUIRY'
  | 'SEPARATED'
  | 'CONTRACTED'
  | 'PREPARING'
  | 'COMPLETED'
  | 'CLOSED'
  | 'CANCELLED'
  | 'RESCHEDULED'

export type CancellationType = 'CLIENT_REQUEST' | 'FORCE_MAJEURE' | 'NO_SHOW' | 'RESCHEDULE_REQUEST_REJECTED'
export type DocumentType = 'DNI' | 'RUC'

export type ApdaycPayer = 'CLIENT' | 'ARELI' | 'SHARED'
export type ApdaycStatus = 'PENDING' | 'INCLUDED' | 'PAID' | 'NOT_APPLIES'
export type InventoryStatus = 'Disponible' | 'En uso' | 'Mantenimiento' | 'Dañado' | 'Perdido' | 'Retirado'
export type WorkerCategory =
  | 'EVENT_PLANNER'
  | 'COORDINADOR_EVENTO'
  | 'DJ'
  | 'FOTOGRAFO'
  | 'VIDEOGRAFO'
  | 'SEGURIDAD'
  | 'ANFITRIONA'
  | `MOZO_${number}`
  | 'BARMAN'
  | 'HORA_LOCA'
  | 'DECORACION'
  | 'BOCADITOS'
  | 'COCINA'
  | 'LIMPIEZA'
  | 'APOYO'

export type Client = {
  id: string
  fullName: string
  documentType?: DocumentType
  documentNumber?: string
  phone?: string
  whatsapp?: string
  email?: string
}

export type Floor = {
  id: string
  name: string
  levelNumber: number
  capacity?: number
  areaM2?: number
  status: FloorStatus
  description?: string
}

export type EventPackage = {
  id: string
  name: string
  eventType?: string
  basePrice: number
  includedCapacity?: number
  guaranteeAmount?: number
  includedServices?: string
  terms?: string
}

export type EventItem = {
  id: string
  clientName: string
  floorName: string
  packageName?: string
  title: string
  eventType: string
  eventDate: string
  startTime: string
  endTime: string
  status: EventStatus
  totalAmount: number
  apdaycAmount: number
  apdaycPayer: ApdaycPayer
  apdaycStatus: ApdaycStatus
  apdaycNotes?: string
  packageIncludedServices?: string
  packageTerms?: string
  cancellationType?: CancellationType
  cancellationRequestedAt?: string
  cancellationNoticeDays?: number
  retainedAdvanceAmount?: number
  cancellationNotes?: string
  createdAt?: string
}

export type ContractPreview = {
  eventId: string
  clientName: string
  clientDocument?: string
  clientPhone?: string
  clientAddress?: string
  floorName: string
  packageName: string
  title: string
  eventType: string
  eventDate: string
  startTime: string
  endTime: string
  totalAmount: number
  apdaycAmount: number
  apdaycPayer: ApdaycPayer
  apdaycStatus: ApdaycStatus
  apdaycNotes?: string
  guaranteeAmount: number
  capacityMaximum?: number
  eventNotes?: string
  guaranteeClause: string
  rescheduleClause: string
  apdaycClause: string
  packageLastPageTitle: string
  packageLastPageDetails: string
  packageTerms: string
}

export type RescheduleOptionEvent = {
  id: string
  title: string
  eventDate: string
  startTime: string
  endTime: string
  floorName: string
  status: EventStatus
}

export type RescheduleOptions = {
  eventId: string
  originalDate: string
  minAllowedDate: string
  maxAllowedDate: string
  floorName: string
  scheduledEvents: RescheduleOptionEvent[]
}

export type DashboardSummary = {
  totalClients: number
  totalFloors: number
  totalPackages: number
  totalEvents: number
  eventsNext30Days: number
  totalContracted: number
  eventsByFloor: Array<{ floorName: string; eventCount: number }>
}

export type InventoryItem = {
  id: string
  piso: string
  categoriaId: string
  categoria: string
  subcategoriaId: string
  subcategoria: string
  nombre: string
  descripcion?: string
  cantidad: number
  unidadMedida: string
  valorUnitario: number
  valorTotal: number
  estado: InventoryStatus
  ubicacion?: string
  observacion?: string
}

export type InventorySubcategory = {
  id: string
  nombre: string
  descripcion?: string
}

export type InventoryCategory = {
  id: string
  nombre: string
  descripcion?: string
  subcategorias: InventorySubcategory[]
}

export type InventoryPisoSummary = {
  piso: string
  itemCount: number
  totalQuantity: number
  totalValue: number
}

export type InventoryCategorySummary = InventoryPisoSummary & {
  categoria: string
}

export type InventorySummary = {
  itemCount: number
  totalQuantity: number
  totalValue: number
  byPiso: InventoryPisoSummary[]
  byCategory: InventoryCategorySummary[]
}

export type InventoryDashboard = {
  categories: InventoryCategory[]
  items: InventoryItem[]
  summary: InventorySummary
}

export type InventoryPayload = {
  piso: string
  categoriaId: string
  subcategoriaId: string
  nombre: string
  descripcion?: string
  cantidad: number
  unidadMedida: string
  valorTotal: number
  estado: InventoryStatus
  ubicacion?: string
  observacion?: string
}

export type WorkerContact = {
  id: string
  category: WorkerCategory
  name: string
  phone?: string
  notes?: string
}

export type WorkerPayload = {
  category: WorkerCategory
  name: string
  phone?: string
  notes?: string
}

export type EventStaffRoleKey = Exclude<WorkerCategory, `MOZO_${number}`> | 'MOZOS'

export type EventStaffAssignment = {
  id: string
  eventId: string
  staffMemberId: string
  staffName: string
  staffPhone?: string
  workerCategory: WorkerCategory
  roleKey: EventStaffRoleKey
  roleLabel: string
  slotNumber?: number
  notes?: string
}

export type StaffAvailability = {
  staffMemberId: string
  staffName: string
  staffPhone?: string
  workerCategory: WorkerCategory
  available: boolean
  reason?: string
  conflictEventId?: string
  conflictEventTitle?: string
  conflictEventDate?: string
  conflictStartTime?: string
  conflictEndTime?: string
}

export type EventStaffAssignmentPayload = {
  staffMemberId: string
  roleKey: EventStaffRoleKey
  roleLabel?: string
  slotNumber?: number
  notes?: string
}

export type ClientPayload = {
  fullName: string
  documentType?: DocumentType
  documentNumber?: string
  phone?: string
  whatsapp?: string
  email?: string
  address?: string
  notes?: string
}

export type ClientLookupResponse = {
  documentType: DocumentType
  documentNumber: string
  fullName?: string
  address?: string
}

export type AppSettings = {
  peruApiTokenReady: boolean
  peruApiTokenSource: string
  peruApiTokenHint: string
  rescheduleMinNoticeDays: number
  rescheduleMaxMonths: number
  cancellationRetentionNoticeDays: number
}

export type EventPayload = {
  clientId: string
  floorId: string
  packageId?: string
  title: string
  eventType: string
  eventDate: string
  startTime: string
  endTime: string
  status: EventStatus
  totalAmount: number
  apdaycAmount: number
  apdaycPayer: ApdaycPayer
  apdaycStatus: ApdaycStatus
  contractCapacityOverride: number
  apdaycNotes?: string
  notes?: string
}

export type AiResponse = {
  provider: string
  model: string
  result: string
}
