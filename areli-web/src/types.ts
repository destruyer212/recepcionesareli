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
export type InventoryCondition = 'GOOD' | 'REGULAR' | 'DAMAGED' | 'LOST' | 'IN_REPAIR'

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
  floorId?: string
  floorName: string
  name: string
  category?: string
  quantity: number
  unitCost: number
  totalCost: number
  specificLocation?: string
  minimumQuantity: number
  conditionStatus: InventoryCondition
  purchaseDate?: string
  notes?: string
}

export type InventoryFloorSummary = {
  floorId?: string
  floorName: string
  itemCount: number
  totalQuantity: number
  totalValue: number
}

export type InventorySummary = {
  itemCount: number
  totalQuantity: number
  totalValue: number
  byFloor: InventoryFloorSummary[]
}

export type InventoryDashboard = {
  items: InventoryItem[]
  summary: InventorySummary
}

export type InventoryPayload = {
  floorId?: string
  name: string
  category?: string
  quantity: number
  unitCost: number
  specificLocation?: string
  minimumQuantity: number
  conditionStatus: InventoryCondition
  purchaseDate?: string
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
