export type FloorStatus = 'AVAILABLE' | 'UNDER_CONSTRUCTION' | 'MAINTENANCE' | 'UNAVAILABLE'
export type EventStatus =
  | 'INQUIRY'
  | 'SEPARATED'
  | 'CONTRACTED'
  | 'CANCELLED'

export type CancellationType = 'CLIENT_REQUEST' | 'FORCE_MAJEURE' | 'NO_SHOW' | 'RESCHEDULE_REQUEST_REJECTED'
export type CancellationPaymentStatus = 'ADELANTO_RETENIDO' | 'DEVOLUCION_PARCIAL' | 'DEVOLUCION_TOTAL' | 'SIN_ADELANTO'
export type PaymentType = 'EVENT_PAYMENT' | 'APDAYC' | 'GUARANTEE'
export type PaymentMethod = 'BCP' | 'BBVA' | 'Scotiabank' | 'Continental' | 'Efectivo'
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
  address?: string
  province?: string
  district?: string
  provinceUbigeo?: string
  districtUbigeo?: string
  notes?: string
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
  depositAmount?: number
  depositPercent?: number
  guaranteeAmount?: number
  includedServices?: string
  terms?: string
  active: boolean
}

export type EventItem = {
  id: string
  clientId: string
  packageId?: string
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
  paidAmount: number
  balanceAmount: number
  cancellationAdvanceAmount?: number
  cancellationRetainedAmount?: number
  cancellationRefundedAmount?: number
  cancellationPaymentStatus?: CancellationPaymentStatus
  cancellationReason?: string
  cancellationDate?: string
  cancellationObservation?: string
  rescheduled?: boolean
  originalEventDate?: string
  originalStartTime?: string
  originalEndTime?: string
  createdAt?: string
}

export type ClientPayment = {
  id: string
  eventId: string
  paymentDate: string
  concept: string
  amount: number
  method: PaymentMethod | string
  paymentType: PaymentType
  countsTowardsEventTotal: boolean
  operationNumber?: string
  internalReceiptNumber?: string
  notes?: string
  createdAt?: string
}

export type ClientPaymentPayload = {
  paymentDate: string
  concept: string
  amount: number
  method: PaymentMethod
  paymentType?: PaymentType
  operationNumber?: string
  internalReceiptNumber?: string
  notes?: string
}

export type UpdateClientPaymentPayload = {
  operationNumber?: string
  internalReceiptNumber?: string
  notes?: string
}

/** Datos para generar el comprobante interno PDF de un pago. */
export type PaymentVoucherContext = {
  payment: ClientPayment
  eventCode: string
  clientName: string
  clientDocument?: string
  clientPhone?: string
  eventTitle: string
  floorName: string
  eventDate: string
  startTime: string
  endTime: string
  totalAmount: number
  paidToDate: number
  balanceAfter: number
  apdaycPayer?: ApdaycPayer
  apdaycStatus?: ApdaycStatus
}

export type ContractPreview = {
  eventId: string
  clientName: string
  clientDocument?: string
  clientPhone?: string
  clientAddress?: string
  clientProvince?: string
  clientDistrict?: string
  clientStreet?: string
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

export type EventPackagePayload = {
  name: string
  eventType?: string
  basePrice: number
  includedCapacity?: number
  depositAmount?: number
  depositPercent?: number
  guaranteeAmount?: number
  includedServices?: string
  terms?: string
  active?: boolean
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
  province?: string
  district?: string
  provinceUbigeo?: string
  districtUbigeo?: string
  notes?: string
}

export type PeruProvince = {
  ubigeo: string
  name: string
  departmentUbigeo: string
  departmentName: string
}

export type PeruDistrict = {
  ubigeo: string
  name: string
  provinceUbigeo: string
  provinceName: string
  departmentUbigeo: string
  departmentName: string
}

export type PeruLocations = {
  provinces: PeruProvince[]
  districts: PeruDistrict[]
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
  geminiApiKeyReady: boolean
  geminiApiKeySource: string
  geminiApiKeyHint: string
  geminiModel: string
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
  status?: EventStatus
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

export type IaEventoDatos = {
  tipoEvento?: string
  fecha?: string
  hora?: string
  clientePrincipal?: string
  clienteSecundario?: string
  cantidadInvitados?: number | null
  local?: string
  servicios?: string[]
  personal?: string[]
  telefono?: string
  observaciones?: string
}

export type IaEventoResponse = {
  accion: string
  datos: IaEventoDatos
  faltantes: string[]
  mensajeUsuario: string
  confirmacionNecesaria: boolean
}
