import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import FullCalendar from '@fullcalendar/react'
import DatePicker, { registerLocale } from 'react-datepicker'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import timeGridPlugin from '@fullcalendar/timegrid'
import esLocale from '@fullcalendar/core/locales/es'
import { es } from 'date-fns/locale/es'
import {
  Bot,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock,
  Download,
  LayoutDashboard,
  MapPin,
  Package,
  Phone,
  Menu,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { api } from './api'
import { downloadEventContractPdf } from './pdf'
import type {
  AiResponse,
  Client,
  ClientPayload,
  ContractPreview,
  DashboardSummary,
  ApdaycPayer,
  ApdaycStatus,
  EventItem,
  EventPackage,
  EventPayload,
  EventStatus,
  Floor,
  FloorStatus,
  InventoryCondition,
  InventoryDashboard,
  InventoryItem,
  InventoryPayload,
  RescheduleOptions,
  AppSettings,
} from './types'
import 'react-datepicker/dist/react-datepicker.css'
import './App.css'

registerLocale('es', es)

type View =
  | 'dashboard'
  | 'events'
  | 'eventsRegistered'
  | 'clientsCreate'
  | 'clientsRegistered'
  | 'packages'
  | 'floors'
  | 'inventory'
  | 'workers'
  | 'ai'
  | 'settings'
type AiMode = 'contract' | 'summary' | 'marketing' | 'balance'
const VIEW_STORAGE_KEY = 'areli-active-view'
const WORKERS_STORAGE_KEY = 'areli-workers-directory'

type WorkerCategory = 'MOZOS' | 'FOTOGRAFOS' | 'TORTAS' | 'OTROS'

type WorkerContact = {
  id: string
  category: WorkerCategory
  name: string
  phone: string
  notes: string
}

type FancySelectOption = {
  value: string
  label: string
  disabled?: boolean
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'))
const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0'))

function parseYmdDate(value: string): Date | null {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function formatYmdDate(date: Date | null): string {
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function FancySelect({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar',
  required,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  options: FancySelectOption[]
  placeholder?: string
  required?: boolean
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('mousedown', handleOutsideClick)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const selected = options.find((option) => option.value === value)

  return (
    <div className={`fancy-select ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`} ref={wrapperRef}>
      <select
        className="fancy-select-native"
        disabled={disabled}
        required={required}
        tabIndex={-1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option disabled={option.disabled} key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        aria-expanded={isOpen}
        className="fancy-select-trigger"
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span>{selected?.label || placeholder}</span>
        <ChevronDown size={16} />
      </button>
      {isOpen && (
        <button
          aria-label="Cerrar selector"
          className="fancy-select-backdrop"
          onClick={() => setIsOpen(false)}
          type="button"
        />
      )}
      {isOpen && (
        <div className="fancy-select-menu" role="listbox">
          <button
            className={`fancy-select-option ${value === '' ? 'active' : ''}`}
            onClick={() => {
              onChange('')
              setIsOpen(false)
            }}
            type="button"
          >
            {placeholder}
          </button>
          {options.map((option) => (
            <button
              className={`fancy-select-option ${value === option.value ? 'active' : ''}`}
              disabled={option.disabled}
              key={option.value}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function TimePickerField({
  value,
  onChange,
  required,
}: {
  value: string
  onChange: (value: string) => void
  required?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [hour = '', minute = ''] = value.split(':')

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('mousedown', handleOutsideClick)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [])

  function setHour(nextHour: string) {
    const nextMinute = minute || '00'
    onChange(`${nextHour}:${nextMinute}`)
  }

  function setMinute(nextMinute: string) {
    const nextHour = hour || '00'
    onChange(`${nextHour}:${nextMinute}`)
  }

  return (
    <div className={`time-picker ${isOpen ? 'open' : ''}`} ref={wrapperRef}>
      <input className="time-picker-native-proxy" readOnly required={required} type="time" value={value} />
      <button className="time-picker-trigger" onClick={() => setIsOpen((current) => !current)} type="button">
        <span>{value || '--:--'}</span>
        <Clock size={16} />
      </button>
      {isOpen && <button className="time-picker-backdrop" onClick={() => setIsOpen(false)} type="button" />}
      {isOpen && (
        <div className="time-picker-popover">
          <div className="time-picker-columns">
            <div className="time-picker-column">
              <small>Hora</small>
              <div className="time-picker-list">
                {HOUR_OPTIONS.map((option) => (
                  <button
                    className={`time-picker-option ${hour === option ? 'active' : ''}`}
                    key={option}
                    onClick={() => setHour(option)}
                    type="button"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <div className="time-picker-column">
              <small>Min</small>
              <div className="time-picker-list">
                {MINUTE_OPTIONS.map((option) => (
                  <button
                    className={`time-picker-option ${minute === option ? 'active' : ''}`}
                    key={option}
                    onClick={() => setMinute(option)}
                    type="button"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="time-picker-footer">
            <button className="btn ghost" onClick={() => setIsOpen(false)} type="button">
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const emptyClient: ClientPayload = {
  fullName: '',
  documentType: 'DNI',
  documentNumber: '',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  notes: '',
}

const emptyEvent: EventPayload = {
  clientId: '',
  floorId: '',
  packageId: '',
  title: '',
  eventType: 'Matrimonio',
  eventDate: new Date().toISOString().slice(0, 10),
  startTime: '18:00',
  endTime: '23:00',
  status: 'SEPARATED',
  totalAmount: 0,
  apdaycAmount: 0,
  apdaycPayer: 'CLIENT',
  apdaycStatus: 'PENDING',
  contractCapacityOverride: 0,
  apdaycNotes: '',
  notes: '',
}

const emptyInventoryItem: InventoryPayload = {
  floorId: '',
  name: '',
  category: 'Mesas y sillas',
  quantity: 1,
  unitCost: 0,
  specificLocation: '',
  minimumQuantity: 0,
  conditionStatus: 'GOOD',
  purchaseDate: '',
  notes: '',
}

const money = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
})

const monthTitle = new Intl.DateTimeFormat('es-PE', {
  month: 'long',
  year: 'numeric',
})

const prettyDate = new Intl.DateTimeFormat('es-PE', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
})

const shortDate = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short',
})

function parseDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function capitalizedDateLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function sameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

function mobileMonthDays(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
  const mondayOffset = (firstDay.getDay() + 6) % 7
  const totalDays = mondayOffset + lastDay.getDate()
  const visibleDays = Math.ceil(totalDays / 7) * 7
  const startDate = new Date(firstDay)
  startDate.setDate(firstDay.getDate() - mondayOffset)

  return Array.from({ length: visibleDays }, (_, index) => {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + index)
    return {
      date,
      key: dateKey(date),
      inCurrentMonth: date.getMonth() === monthDate.getMonth(),
    }
  })
}

function shortTime(value: string) {
  return value.slice(0, 5)
}

/** Suma meses de calendario a una fecha YYYY-MM-DD (ajusta fin de mes). */
function addCalendarMonthsIso(isoDate: string, monthsToAdd: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const totalMonths = y * 12 + (m - 1) + monthsToAdd
  const ny = Math.floor(totalMonths / 12)
  const nm = (totalMonths % 12) + 1
  const dim = new Date(ny, nm, 0).getDate()
  const nd = Math.min(d, dim)
  return `${ny}-${String(nm).padStart(2, '0')}-${String(nd).padStart(2, '0')}`
}

function isHttp404Error(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const t = err.message
  return /\b404\b/.test(t) || t.includes('"status":404') || t.includes('"error":"Not Found"')
}

/** Misma lógica de ventana que el API cuando no está disponible el endpoint (lista según eventos ya cargados). */
function buildLocalRescheduleOptions(target: EventItem, allEvents: EventItem[]): RescheduleOptions {
  const today = dateKey(new Date())
  const maxAllowedDate = addCalendarMonthsIso(target.eventDate, 2)
  const scheduledEvents = allEvents
    .filter(
      (e) =>
        e.id !== target.id &&
        e.floorName === target.floorName &&
        e.status !== 'CANCELLED' &&
        e.eventDate >= today &&
        e.eventDate <= maxAllowedDate,
    )
    .sort((a, b) => {
      if (a.eventDate !== b.eventDate) return a.eventDate.localeCompare(b.eventDate)
      return a.startTime.localeCompare(b.startTime)
    })
    .map((e) => ({
      id: e.id,
      title: e.title,
      eventDate: e.eventDate,
      startTime: e.startTime,
      endTime: e.endTime,
      floorName: e.floorName,
      status: e.status,
    }))
  return {
    eventId: target.id,
    originalDate: target.eventDate,
    minAllowedDate: today,
    maxAllowedDate,
    floorName: target.floorName,
    scheduledEvents,
  }
}

type FloorFilter = 'ALL' | 'F1' | 'F2' | 'F34'
type MobileCalendarMode = 'agenda' | 'month'

function floorGroupFromName(floorName: string): Exclude<FloorFilter, 'ALL'> | 'OTHER' {
  const normalized = floorName.toLowerCase()
  if (normalized.includes('1er') || normalized.includes('piso 1') || normalized.includes('primer piso')) {
    return 'F1'
  }
  if (normalized.includes('2do') || normalized.includes('piso 2') || normalized.includes('segundo piso')) {
    return 'F2'
  }
  if (
    normalized.includes('3er') ||
    normalized.includes('4to') ||
    normalized.includes('3 y 4') ||
    normalized.includes('3ro') ||
    normalized.includes('cuarto piso')
  ) {
    return 'F34'
  }
  return 'OTHER'
}

function durationLabel(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.split(':').map(Number)
  const [endHour, endMinute] = endTime.split(':').map(Number)
  const start = startHour * 60 + startMinute
  let end = endHour * 60 + endMinute
  if (end <= start) {
    end += 24 * 60
  }
  const totalMinutes = Math.max(0, end - start)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`
}

function eventCodeLabel(event: EventItem) {
  const suffix = event.id.replace(/-/g, '').slice(0, 8).toUpperCase()
  return `ARELI-${event.eventDate}-${suffix || '00000000'}`
}

const eventStatusLabels: Record<EventStatus, string> = {
  INQUIRY: 'Consulta',
  SEPARATED: 'Separado',
  CONTRACTED: 'Contratado',
  PREPARING: 'En preparación',
  COMPLETED: 'Realizado',
  CLOSED: 'Cerrado',
  CANCELLED: 'Cancelado',
  RESCHEDULED: 'Reprogramado',
}

const floorStatusLabels: Record<FloorStatus, string> = {
  AVAILABLE: 'Disponible',
  UNDER_CONSTRUCTION: 'En construccion',
  MAINTENANCE: 'Mantenimiento',
  UNAVAILABLE: 'No disponible',
}

const apdaycPayerLabels: Record<ApdaycPayer, string> = {
  CLIENT: 'Cliente',
  ARELI: 'Recepciones Areli',
  SHARED: 'Compartido',
}

const apdaycStatusLabels: Record<ApdaycStatus, string> = {
  PENDING: 'Pendiente',
  INCLUDED: 'Incluido',
  PAID: 'Pagado',
  NOT_APPLIES: 'No aplica',
}

const inventoryConditionLabels: Record<InventoryCondition, string> = {
  GOOD: 'Bueno',
  REGULAR: 'Regular',
  DAMAGED: 'Dañado',
  LOST: 'Perdido',
  IN_REPAIR: 'En reparación',
}

const workerCategoryLabels: Record<WorkerCategory, string> = {
  MOZOS: 'Mozos',
  FOTOGRAFOS: 'Fotógrafos',
  TORTAS: 'Tortas y repostería',
  OTROS: 'Otros proveedores',
}

/** Prioriza WhatsApp (contacto habitual para el contrato); si falta, usa teléfono. */
function contractualContactNumber(client: Client | undefined): string {
  if (!client) return ''
  const whatsapp = client.whatsapp?.trim() ?? ''
  if (whatsapp) return whatsapp
  return client.phone?.trim() ?? ''
}

function App() {
  const [view, setView] = useState<View>(() => {
    if (typeof window === 'undefined') {
      return 'dashboard'
    }
    const savedView = window.localStorage.getItem(VIEW_STORAGE_KEY)
    const validViews: View[] = [
      'dashboard',
      'events',
      'eventsRegistered',
      'clientsCreate',
      'clientsRegistered',
      'packages',
      'floors',
      'inventory',
      'workers',
      'ai',
      'settings',
    ]
    return validViews.includes(savedView as View) ? (savedView as View) : 'dashboard'
  })
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const sidebarRef = useRef<HTMLElement | null>(null)
  const mobileToggleRef = useRef<HTMLButtonElement | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [floors, setFloors] = useState<Floor[]>([])
  const [packages, setPackages] = useState<EventPackage[]>([])
  const [events, setEvents] = useState<EventItem[]>([])
  const [inventory, setInventory] = useState<InventoryDashboard | null>(null)
  const [clientForm, setClientForm] = useState<ClientPayload>(emptyClient)
  const [eventForm, setEventForm] = useState<EventPayload>(emptyEvent)
  const [inventoryForm, setInventoryForm] = useState<InventoryPayload>(emptyInventoryItem)
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null)
  const [editEventForm, setEditEventForm] = useState<EventPayload | null>(null)
  const [editBusy, setEditBusy] = useState(false)
  const [aiMode, setAiMode] = useState<AiMode>('contract')
  const [aiPrompt, setAiPrompt] = useState(
    'Evento de 15 años en el 3er y 4to piso combinado, paquete Premium, cliente con saldo pendiente y garantía por registrar.',
  )
  const [aiResult, setAiResult] = useState<AiResponse | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  const selectedPackage = useMemo(
    () => packages.find((item) => item.id === eventForm.packageId),
    [eventForm.packageId, packages],
  )

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [dashboard, floorList, eventList] = await Promise.all([
        api.dashboard(),
        api.floors(),
        api.events(),
      ])

      setSummary(dashboard)
      setFloors(floorList)
      setEvents(eventList)

      setEventForm((current) => ({
        ...current,
        floorId: current.floorId || floorList[0]?.id || '',
      }))

      // Carga en segundo plano de módulos no críticos para abrir dashboard.
      void Promise.all([api.clients(), api.packages(), api.inventory()])
        .then(([clientList, packageList, inventoryData]) => {
          setClients(clientList)
          setPackages(packageList)
          setInventory(inventoryData)
          setEventForm((current) => ({
            ...current,
            clientId: current.clientId || clientList[0]?.id || '',
            packageId: current.packageId || packageList[0]?.id || '',
            totalAmount: current.totalAmount || Number(packageList[0]?.basePrice ?? 0),
          }))
          setInventoryForm((current) => ({
            ...current,
            floorId: current.floorId || floorList[0]?.id || '',
          }))
        })
        .catch((err) => {
          setError((current) => current || (err instanceof Error ? err.message : 'No se pudo cargar el resto de módulos.'))
        })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la información.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Carga inicial remota del API; las actualizaciones ocurren al resolver las promesas.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [])

  useEffect(() => {
    const closeDesktopMenu = () => {
      if (window.innerWidth > 1100) {
        setIsMobileMenuOpen(false)
      }
    }
    closeDesktopMenu()
    window.addEventListener('resize', closeDesktopMenu)
    return () => window.removeEventListener('resize', closeDesktopMenu)
  }, [])

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return
    }
    const closeOnOutsideTouch = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (!target) {
        return
      }
      if (sidebarRef.current?.contains(target) || mobileToggleRef.current?.contains(target)) {
        return
      }
      setIsMobileMenuOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideTouch)
    document.addEventListener('touchstart', closeOnOutsideTouch, { passive: true })
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideTouch)
      document.removeEventListener('touchstart', closeOnOutsideTouch)
    }
  }, [isMobileMenuOpen])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VIEW_STORAGE_KEY, view)
    }
  }, [view])

  function updateClient<K extends keyof ClientPayload>(key: K, value: ClientPayload[K]) {
    setClientForm((current) => ({ ...current, [key]: value }))
  }

  function updateEvent<K extends keyof EventPayload>(key: K, value: EventPayload[K]) {
    setEventForm((current) => ({ ...current, [key]: value }))
  }

  function updateInventory<K extends keyof InventoryPayload>(key: K, value: InventoryPayload[K]) {
    setInventoryForm((current) => ({ ...current, [key]: value }))
  }

  async function submitClient(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    setError('')
    try {
      const selectedDocType = clientForm.documentType
      const documentDigits = (clientForm.documentNumber ?? '').replace(/\D/g, '')
      if (selectedDocType === 'DNI' && documentDigits.length !== 8) {
        setError('El DNI debe tener exactamente 8 dígitos.')
        return
      }
      if (selectedDocType === 'RUC' && documentDigits.length !== 11) {
        setError('El RUC debe tener exactamente 11 dígitos.')
        return
      }
      await api.createClient(clientForm)
      setClientForm(emptyClient)
      setMessage('Cliente registrado correctamente.')
      await loadData()
      setView('clientsRegistered')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el cliente.')
    }
  }

  async function createClientQuick(payload: ClientPayload) {
    const selectedDocType = payload.documentType
    const documentDigits = (payload.documentNumber ?? '').replace(/\D/g, '')
    if (selectedDocType === 'DNI' && documentDigits.length !== 8) {
      throw new Error('El DNI debe tener exactamente 8 dígitos.')
    }
    if (selectedDocType === 'RUC' && documentDigits.length !== 11) {
      throw new Error('El RUC debe tener exactamente 11 dígitos.')
    }
    const created = await api.createClient(payload)
    await loadData()
    updateEvent('clientId', created.id)
    setMessage('Cliente creado y seleccionado en el evento.')
  }

  async function submitEvent(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    setError('')
    try {
      const selectedClient = clients.find((item) => item.id === eventForm.clientId)
      const contractContact = contractualContactNumber(selectedClient)

      if (!contractContact) {
        setError('Falta WhatsApp o teléfono del cliente. Completa al menos uno en la ficha del cliente antes de separar.')
        setView('events')
        return
      }

      if (!eventForm.contractCapacityOverride || Number(eventForm.contractCapacityOverride) <= 0) {
        setError('Completa la capacidad máxima contractual del evento antes de separar.')
        setView('events')
        return
      }

      await api.createEvent({
        ...eventForm,
        packageId: eventForm.packageId || undefined,
        totalAmount: Number(eventForm.totalAmount),
        contractCapacityOverride: Number(eventForm.contractCapacityOverride),
      })
      setEventForm((current) => ({ ...emptyEvent, clientId: current.clientId, floorId: current.floorId }))
      setMessage('Evento separado correctamente.')
      await loadData()
      setView('events')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el evento.')
    }
  }

  async function submitInventory(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    setError('')
    try {
      await api.createInventoryItem({
        ...inventoryForm,
        floorId: inventoryForm.floorId || undefined,
        quantity: Number(inventoryForm.quantity),
        unitCost: Number(inventoryForm.unitCost),
        minimumQuantity: Number(inventoryForm.minimumQuantity),
        purchaseDate: inventoryForm.purchaseDate || undefined,
      })
      setInventoryForm((current) => ({ ...emptyInventoryItem, floorId: current.floorId }))
      setMessage('Inventario registrado correctamente.')
      await loadData()
      setView('inventory')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el inventario.')
    }
  }

  async function startEditingEvent(event: EventItem) {
    setError('')
    setMessage('')
    setEditBusy(true)
    try {
      const preview = await api.contractPreview(event.id)
      const clientId = clients.find((item) => item.fullName === event.clientName)?.id ?? ''
      const floorId = floors.find((item) => item.name === event.floorName)?.id ?? ''
      const packageId = packages.find((item) => item.name === (event.packageName ?? ''))?.id ?? ''
      setEditingEvent(event)
      setEditEventForm({
        clientId,
        floorId,
        packageId,
        title: event.title,
        eventType: event.eventType,
        eventDate: event.eventDate,
        startTime: shortTime(event.startTime),
        endTime: shortTime(event.endTime),
        status: event.status,
        totalAmount: Number(event.totalAmount),
        apdaycAmount: Number(event.apdaycAmount ?? 0),
        apdaycPayer: event.apdaycPayer,
        apdaycStatus: event.apdaycStatus,
        contractCapacityOverride: Number(preview.capacityMaximum ?? 80),
        apdaycNotes: event.apdaycNotes ?? '',
        notes: preview.eventNotes ?? '',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el evento para edición.')
    } finally {
      setEditBusy(false)
    }
  }

  function updateEditEvent<K extends keyof EventPayload>(key: K, value: EventPayload[K]) {
    setEditEventForm((current) => (current ? { ...current, [key]: value } : current))
  }

  async function saveEditedEvent(event: FormEvent) {
    event.preventDefault()
    if (!editingEvent || !editEventForm) return
    setError('')
    setMessage('')
    setEditBusy(true)
    try {
      await api.updateEvent(editingEvent.id, {
        title: editEventForm.title,
        eventType: editEventForm.eventType,
        eventDate: editEventForm.eventDate,
        startTime: editEventForm.startTime,
        endTime: editEventForm.endTime,
        status: editEventForm.status,
        totalAmount: Number(editEventForm.totalAmount),
        apdaycAmount: Number(editEventForm.apdaycAmount),
        apdaycPayer: editEventForm.apdaycPayer,
        apdaycStatus: editEventForm.apdaycStatus,
        contractCapacityOverride: Number(editEventForm.contractCapacityOverride),
        apdaycNotes: editEventForm.apdaycNotes,
        notes: editEventForm.notes,
      })
      setMessage('Evento actualizado. El PDF usará los nuevos datos.')
      setEditingEvent(null)
      setEditEventForm(null)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la edición del evento.')
    } finally {
      setEditBusy(false)
    }
  }

  async function removeInventoryItem(item: InventoryItem) {
    const confirmed = window.confirm(`Quitar "${item.name}" del inventario activo?`)
    if (!confirmed) {
      return
    }
    setMessage('')
    setError('')
    try {
      await api.deleteInventoryItem(item.id)
      setMessage('Artículo retirado del inventario activo.')
      await loadData()
      setView('inventory')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo retirar el artículo.')
    }
  }

  async function runAi() {
    setAiLoading(true)
    setAiResult(null)
    setError('')
    try {
      const firstEvent = events[0]
      let result: AiResponse
      if (aiMode === 'contract') {
        result = await api.aiContract({
          clientName: firstEvent?.clientName ?? 'Cliente pendiente',
          clientDocument: '',
          eventType: firstEvent?.eventType ?? 'Evento personalizado',
          floorName: firstEvent?.floorName ?? 'Ambiente pendiente',
          eventDate: firstEvent?.eventDate ?? eventForm.eventDate,
          startTime: firstEvent?.startTime ?? eventForm.startTime,
          endTime: firstEvent?.endTime ?? eventForm.endTime,
          packageName: firstEvent?.packageName ?? selectedPackage?.name ?? 'Paquete pendiente',
          totalAmount: firstEvent?.totalAmount ?? eventForm.totalAmount,
          depositAmount: 0,
          guaranteeAmount: selectedPackage?.guaranteeAmount ?? 0,
          specialTerms: aiPrompt,
        })
      } else if (aiMode === 'summary') {
        result = await api.aiSummary({ eventDetails: aiPrompt })
      } else if (aiMode === 'marketing') {
        result = await api.aiMarketing({
          packageName: selectedPackage?.name ?? 'Paquete Areli',
          audience: 'Clientes interesados en eventos elegantes en Carabayllo',
          offerDetails: aiPrompt,
        })
      } else {
        result = await api.aiBalance({
          income: summary?.totalContracted ?? 0,
          staffPayments: 0,
          expenses: 0,
          pendingBalance: 0,
          period: 'Mes actual',
        })
      }
      setAiResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo ejecutar la IA.')
    } finally {
      setAiLoading(false)
    }
  }

  const mainNav: Array<{ id: View; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'events', label: 'Crear evento', icon: CalendarDays },
    { id: 'eventsRegistered', label: 'Eventos registrados', icon: ClipboardList },
    { id: 'clientsCreate', label: 'Registrar cliente', icon: Users },
    { id: 'clientsRegistered', label: 'Clientes registrados', icon: Users },
    { id: 'packages', label: 'Paquetes', icon: Package },
    { id: 'floors', label: 'Ambientes', icon: Building2 },
    { id: 'inventory', label: 'Inventario', icon: ClipboardList },
    { id: 'workers', label: 'Trabajadores', icon: Users },
    { id: 'ai', label: 'IA', icon: Bot },
  ]

  const handleViewChange = (nextView: View) => {
    setView(nextView)
    if (typeof window !== 'undefined' && window.innerWidth <= 1100) {
      setIsMobileMenuOpen(false)
    }
  }

  return (
    <div className={`app-shell ${isMobileMenuOpen ? 'menu-open' : ''}`}>
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`} ref={sidebarRef}>
        <div className="brand">
          <img className="brand-mark" src="/areli-logo.png" alt="Logo Recepciones Areli" />
          <div>
            <strong>Recepciones Areli</strong>
            <span>Sistema administrativo</span>
          </div>
        </div>

        <nav className="nav" aria-label="Vistas principales">
          {mainNav.map((item) => {
            const Icon = item.icon
            return (
              <button
                className={`nav-button ${view === item.id ? 'active' : ''}`}
                key={item.id}
                onClick={() => handleViewChange(item.id)}
                type="button"
              >
                <Icon size={18} />
                {item.label}
              </button>
            )
          })}
          <div className="nav-divider" role="presentation" />
          <button
            className={`nav-button nav-button-settings ${view === 'settings' ? 'active' : ''}`}
            onClick={() => handleViewChange('settings')}
            type="button"
          >
            <Settings size={18} />
            Configuración
          </button>
        </nav>

        <div className="sidebar-note">
          Calendario por ambientes: 1er piso, 2do piso y 3er/4to piso combinado, con contratos, pagos y balance.
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-title">
            <button
              className="mobile-menu-toggle"
              onClick={() => setIsMobileMenuOpen((current) => !current)}
              type="button"
              aria-label={isMobileMenuOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
              aria-expanded={isMobileMenuOpen}
              ref={mobileToggleRef}
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <p className="eyebrow">Panel operativo</p>
            <h1>{titleFor(view)}</h1>
          </div>
          <div className="actions topbar-actions">
            <button className="btn ghost" onClick={loadData} title="Actualizar datos" type="button">
              <RefreshCw size={17} />
              Actualizar
            </button>
            <button className="btn primary" onClick={() => handleViewChange('events')} type="button">
              <Plus size={17} />
              Separar evento
            </button>
          </div>
        </header>

        {error && <p className="message error">{error}</p>}
        {message && <p className="message ok">{message}</p>}
        {loading && <p className="empty">Cargando datos desde Supabase...</p>}

        {!loading && view === 'dashboard' && <Dashboard summary={summary} events={events} />}
        {!loading && view === 'events' && (
          <EventsView
            clients={clients}
            floors={floors}
            packages={packages}
            selectedPackage={selectedPackage}
            eventForm={eventForm}
            updateEvent={updateEvent}
            submitEvent={submitEvent}
            createQuickClient={createClientQuick}
            openRegisteredEvents={() => setView('eventsRegistered')}
          />
        )}
        {!loading && view === 'workers' && <WorkersView />}
        {!loading && view === 'eventsRegistered' && (
          <section className="grid">
            <div className="panel">
              <h2>Eventos registrados</h2>
              {editingEvent && editEventForm && (
                <div className="event-edit-box">
                  <h3>Editando: {editingEvent.title}</h3>
                  <form onSubmit={saveEditedEvent}>
                    <div className="form-grid">
                      <label>
                        Título
                        <input value={editEventForm.title} onChange={(e) => updateEditEvent('title', e.target.value)} required />
                      </label>
                      <label>
                        Tipo
                        <input value={editEventForm.eventType} onChange={(e) => updateEditEvent('eventType', e.target.value)} required />
                      </label>
                      <label>
                        Fecha
                        <DatePicker
                          calendarClassName="fancy-datepicker"
                          className="fancy-date-input"
                          dateFormat="dd/MM/yyyy"
                          locale="es"
                          onChange={(date: Date | null) => updateEditEvent('eventDate', formatYmdDate(date))}
                          placeholderText="Seleccionar fecha"
                          required
                          selected={parseYmdDate(editEventForm.eventDate)}
                        />
                      </label>
                      <label>
                        Estado
                        <FancySelect
                          value={editEventForm.status}
                          onChange={(nextValue) => updateEditEvent('status', nextValue as EventStatus)}
                          options={Object.entries(eventStatusLabels).map(([value, label]) => ({ value, label }))}
                        />
                      </label>
                      <label>
                        Inicio
                        <TimePickerField required value={editEventForm.startTime} onChange={(nextValue) => updateEditEvent('startTime', nextValue)} />
                      </label>
                      <label>
                        Fin
                        <TimePickerField required value={editEventForm.endTime} onChange={(nextValue) => updateEditEvent('endTime', nextValue)} />
                      </label>
                      <label>
                        Monto total
                        <input
                          min="0"
                          step="0.01"
                          type="number"
                          value={editEventForm.totalAmount}
                          onChange={(e) => updateEditEvent('totalAmount', Number(e.target.value))}
                          required
                        />
                      </label>
                      <label>
                        Pago APDAYC
                        <input
                          min="0"
                          step="0.01"
                          type="number"
                          value={editEventForm.apdaycAmount}
                          onChange={(e) => updateEditEvent('apdaycAmount', Number(e.target.value))}
                        />
                      </label>
                      <label>
                        Capacidad contractual
                        <input
                          min="1"
                          step="1"
                          type="number"
                          value={editEventForm.contractCapacityOverride}
                          onChange={(e) => updateEditEvent('contractCapacityOverride', Number(e.target.value))}
                          required
                        />
                      </label>
                      <label>
                        Asume APDAYC
                        <FancySelect
                          value={editEventForm.apdaycPayer}
                          onChange={(nextValue) => updateEditEvent('apdaycPayer', nextValue as ApdaycPayer)}
                          options={Object.entries(apdaycPayerLabels).map(([value, label]) => ({ value, label }))}
                        />
                      </label>
                      <label>
                        Estado APDAYC
                        <FancySelect
                          value={editEventForm.apdaycStatus}
                          onChange={(nextValue) => updateEditEvent('apdaycStatus', nextValue as ApdaycStatus)}
                          options={Object.entries(apdaycStatusLabels).map(([value, label]) => ({ value, label }))}
                        />
                      </label>
                      <label className="full">
                        Nota APDAYC
                        <textarea value={editEventForm.apdaycNotes} onChange={(e) => updateEditEvent('apdaycNotes', e.target.value)} />
                      </label>
                      <label className="full">
                        Observaciones
                        <textarea value={editEventForm.notes} onChange={(e) => updateEditEvent('notes', e.target.value)} />
                      </label>
                    </div>
                    <div className="form-actions">
                      <button className="btn ghost" onClick={() => { setEditingEvent(null); setEditEventForm(null) }} type="button">
                        Cancelar edición
                      </button>
                      <button className="btn primary" disabled={editBusy} type="submit">
                        <Save size={16} />
                        {editBusy ? 'Guardando...' : 'Guardar cambios'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
              <EventTable events={events} onEventUpdated={loadData} onEditRequested={startEditingEvent} />
            </div>
          </section>
        )}
        {!loading && view === 'clientsCreate' && (
          <ClientsView
            mode="create"
            clients={clients}
            clientForm={clientForm}
            updateClient={updateClient}
            submitClient={submitClient}
            saveClientEdit={async () => undefined}
          />
        )}
        {!loading && view === 'clientsRegistered' && (
          <ClientsView
            mode="registered"
            clients={clients}
            clientForm={clientForm}
            updateClient={updateClient}
            submitClient={submitClient}
            saveClientEdit={async (id, payload) => {
              await api.updateClient(id, payload)
              setMessage('Cliente actualizado correctamente.')
              await loadData()
            }}
          />
        )}
        {!loading && view === 'packages' && <PackagesView packages={packages} />}
        {!loading && view === 'floors' && <FloorsView floors={floors} summary={summary} />}
        {!loading && view === 'inventory' && (
          <InventoryView
            floors={floors}
            inventory={inventory}
            inventoryForm={inventoryForm}
            updateInventory={updateInventory}
            submitInventory={submitInventory}
            removeInventoryItem={removeInventoryItem}
          />
        )}
        {!loading && view === 'ai' && (
          <AiView
            aiMode={aiMode}
            setAiMode={setAiMode}
            aiPrompt={aiPrompt}
            setAiPrompt={setAiPrompt}
            aiResult={aiResult}
            aiLoading={aiLoading}
            runAi={runAi}
          />
        )}
        {!loading && view === 'settings' && <SettingsView />}
      </main>
      <button
        className={`menu-backdrop ${isMobileMenuOpen ? 'show' : ''}`}
        aria-label="Cerrar menú"
        onClick={() => setIsMobileMenuOpen(false)}
        type="button"
      />
    </div>
  )
}

function titleFor(view: View) {
  const labels: Record<View, string> = {
    dashboard: 'Resumen del negocio',
    events: 'Crear nuevo evento',
    eventsRegistered: 'Eventos registrados',
    clientsCreate: 'Registrar cliente',
    clientsRegistered: 'Clientes registrados',
    packages: 'Paquetes comerciales',
    floors: 'Ambientes del local',
    inventory: 'Inventario y valorización',
    workers: 'Trabajadores y proveedores',
    ai: 'Herramientas inteligentes',
    settings: 'Configuración del sistema',
  }
  return labels[view]
}

function SettingsView() {
  const [data, setData] = useState<AppSettings | null>(null)
  const [tokenInput, setTokenInput] = useState('')
  const [rescheduleMinNoticeDaysInput, setRescheduleMinNoticeDaysInput] = useState('15')
  const [rescheduleMaxMonthsInput, setRescheduleMaxMonthsInput] = useState('2')
  const [cancellationRetentionNoticeDaysInput, setCancellationRetentionNoticeDaysInput] = useState('15')
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  async function load() {
    setLoadError('')
    try {
      const s = await api.settings()
      setData(s)
      setRescheduleMinNoticeDaysInput(String(s.rescheduleMinNoticeDays ?? 15))
      setRescheduleMaxMonthsInput(String(s.rescheduleMaxMonths ?? 2))
      setCancellationRetentionNoticeDaysInput(String(s.cancellationRetentionNoticeDays ?? 15))
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'No se pudo cargar la configuración.')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function saveToken() {
    if (!tokenInput.trim()) {
      setNotice('Pega o escribe un token antes de guardar.')
      return
    }
    setBusy(true)
    setNotice('')
    try {
      const s = await api.updateSettings({ peruApiToken: tokenInput.trim() })
      setData(s)
      setTokenInput('')
      setNotice('Token guardado. Tiene prioridad sobre la variable de entorno del servidor.')
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'No se pudo guardar.')
    } finally {
      setBusy(false)
    }
  }

  async function clearStoredToken() {
    if (!window.confirm('¿Quitar el token guardado en base de datos y usar solo PERU_API_TOKEN del servidor (si existe)?')) {
      return
    }
    setBusy(true)
    setNotice('')
    try {
      const s = await api.updateSettings({ clearPeruApiToken: true })
      setData(s)
      setNotice('Token de base de datos eliminado.')
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'No se pudo actualizar.')
    } finally {
      setBusy(false)
    }
  }

  async function saveRules() {
    const rescheduleMinNoticeDays = Number(rescheduleMinNoticeDaysInput)
    const rescheduleMaxMonths = Number(rescheduleMaxMonthsInput)
    const cancellationRetentionNoticeDays = Number(cancellationRetentionNoticeDaysInput)
    if (
      !Number.isFinite(rescheduleMinNoticeDays) ||
      !Number.isFinite(rescheduleMaxMonths) ||
      !Number.isFinite(cancellationRetentionNoticeDays)
    ) {
      setNotice('Completa los plazos con números válidos.')
      return
    }
    setBusy(true)
    setNotice('')
    try {
      const s = await api.updateSettings({
        rescheduleMinNoticeDays,
        rescheduleMaxMonths,
        cancellationRetentionNoticeDays,
      })
      setData(s)
      setNotice('Reglas de plazos guardadas correctamente.')
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'No se pudo guardar las reglas.')
    } finally {
      setBusy(false)
    }
  }

  const sourceLabel =
    data?.peruApiTokenSource === 'BASE_DE_DATOS'
      ? 'Base de datos'
      : data?.peruApiTokenSource === 'ENTORNO'
        ? 'Variable de entorno'
        : 'Sin configurar'

  return (
    <section className="grid">
      <div className="panel settings-panel">
        <h2>Integraciones</h2>
        <p className="settings-intro">
          Ajustes guardados en el servidor. El token de{' '}
          <a href="https://peruapi.com/panel" rel="noreferrer" target="_blank">
            Perú API
          </a>{' '}
          se usa para autocompletar DNI y RUC al registrar clientes.
        </p>
        {loadError && <p className="message error">{loadError}</p>}
        {notice && <p className="message ok">{notice}</p>}
        <div className="settings-status">
          <span>Estado token</span>
          <strong>{data?.peruApiTokenReady ? 'Listo para consultas' : 'Falta token'}</strong>
          <span>Origen activo</span>
          <strong>{sourceLabel}</strong>
        </div>
        <p className="settings-hint">{data?.peruApiTokenHint}</p>
        <div className="form-grid">
          <label className="full">
            Nuevo token Perú API
            <input
              autoComplete="off"
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Pega aquí tu API key"
              type="password"
              value={tokenInput}
            />
          </label>
        </div>
        <div className="form-actions">
          <button className="btn ghost" disabled={busy} onClick={() => void load()} type="button">
            <RefreshCw size={16} />
            Recargar estado
          </button>
          <button className="btn danger" disabled={busy} onClick={() => void clearStoredToken()} type="button">
            Quitar token de base de datos
          </button>
          <button className="btn primary" disabled={busy} onClick={() => void saveToken()} type="button">
            <Save size={16} />
            {busy ? 'Guardando...' : 'Guardar token'}
          </button>
        </div>
      </div>
      <div className="panel settings-panel">
        <h2>Reglas de negocio</h2>
        <p className="settings-intro">
          Estos plazos controlan la lógica de reprogramación y cancelación del sistema.
        </p>
        <div className="form-grid">
          <label>
            Reprogramación: días mínimos de anticipación
            <input
              min={0}
              onChange={(e) => setRescheduleMinNoticeDaysInput(e.target.value)}
              step={1}
              type="number"
              value={rescheduleMinNoticeDaysInput}
            />
          </label>
          <label>
            Reprogramación: meses máximos desde la fecha original
            <input
              min={0}
              onChange={(e) => setRescheduleMaxMonthsInput(e.target.value)}
              step={1}
              type="number"
              value={rescheduleMaxMonthsInput}
            />
          </label>
          <label className="full">
            Cancelación: umbral de días para retención del adelanto
            <input
              min={0}
              onChange={(e) => setCancellationRetentionNoticeDaysInput(e.target.value)}
              step={1}
              type="number"
              value={cancellationRetentionNoticeDaysInput}
            />
          </label>
        </div>
        <div className="form-actions">
          <button className="btn ghost" disabled={busy} onClick={() => void saveRules()} type="button">
            <Save size={16} />
            Guardar plazos
          </button>
        </div>
      </div>
    </section>
  )
}

function WorkersView() {
  const [category, setCategory] = useState<WorkerCategory>('MOZOS')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [notice, setNotice] = useState('')
  const [directory, setDirectory] = useState<WorkerContact[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = window.localStorage.getItem(WORKERS_STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw) as WorkerContact[]
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(WORKERS_STORAGE_KEY, JSON.stringify(directory))
    }
  }, [directory])

  const filtered = directory.filter((item) => item.category === category)

  function addWorker(event: FormEvent) {
    event.preventDefault()
    if (!name.trim() || !phone.trim()) {
      setNotice('Completa nombre y teléfono/WhatsApp.')
      return
    }
    const entry: WorkerContact = {
      id: crypto.randomUUID(),
      category,
      name: name.trim(),
      phone: phone.trim(),
      notes: notes.trim(),
    }
    setDirectory((current) => [entry, ...current])
    setName('')
    setPhone('')
    setNotes('')
    setNotice('Contacto agregado.')
  }

  function removeWorker(id: string) {
    const confirmed = window.confirm('¿Quitar este contacto de trabajadores?')
    if (!confirmed) return
    setDirectory((current) => current.filter((item) => item.id !== id))
  }

  return (
    <section className="grid">
      <div className="panel">
        <h2>Directorio de trabajadores</h2>
        <p className="settings-intro">
          Guarda tus contactos clave para cada evento: mozos, fotógrafos, tortas y proveedores de confianza.
        </p>
        {notice && <p className="message ok">{notice}</p>}
        <div className="tabs">
          {(Object.keys(workerCategoryLabels) as WorkerCategory[]).map((key) => (
            <button
              className={`tab ${category === key ? 'active' : ''}`}
              key={key}
              onClick={() => setCategory(key)}
              type="button"
            >
              {workerCategoryLabels[key]}
            </button>
          ))}
        </div>
        <form onSubmit={addWorker}>
          <div className="form-grid">
            <label>
              Nombre
              <input onChange={(e) => setName(e.target.value)} placeholder="Ej: José Ramírez" value={name} />
            </label>
            <label>
              Teléfono / WhatsApp
              <input onChange={(e) => setPhone(e.target.value)} placeholder="Ej: 987654321" value={phone} />
            </label>
            <label className="full">
              Notas
              <textarea
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Precio, puntualidad, especialidad, redes, etc."
                value={notes}
              />
            </label>
          </div>
          <div className="form-actions">
            <button className="btn primary" type="submit">
              <Save size={16} />
              Guardar contacto
            </button>
          </div>
        </form>
      </div>

      <div className="panel">
        <h2>{workerCategoryLabels[category]}</h2>
        {filtered.length === 0 && <p className="empty">Aún no hay contactos en esta categoría.</p>}
        <div className="workers-grid">
          {filtered.map((item) => (
            <article className="worker-card" key={item.id}>
              <h3>{item.name}</h3>
              <p>
                <Phone size={14} /> {item.phone}
              </p>
              {item.notes && <p>{item.notes}</p>}
              <button className="btn danger" onClick={() => removeWorker(item.id)} type="button">
                <Trash2 size={14} />
                Quitar
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Dashboard({ summary, events }: { summary: DashboardSummary | null; events: EventItem[] }) {
  const todayKey = dateKey(new Date())
  const firstUpcomingDate = [...events]
    .sort((a, b) => `${a.eventDate}${a.startTime}`.localeCompare(`${b.eventDate}${b.startTime}`))
    .find((event) => event.eventDate >= todayKey)?.eventDate ?? todayKey
  const [selectedDate, setSelectedDate] = useState(firstUpcomingDate)
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)
  const [quickViewEvent, setQuickViewEvent] = useState<EventItem | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [eventDetailMap, setEventDetailMap] = useState<Record<string, ContractPreview>>({})
  const [detailLoadingMap, setDetailLoadingMap] = useState<Record<string, boolean>>({})
  const [detailErrorMap, setDetailErrorMap] = useState<Record<string, boolean>>({})
  const [floorFilter, setFloorFilter] = useState<FloorFilter>('ALL')
  const maxFloorEvents = Math.max(1, ...(summary?.eventsByFloor.map((item) => item.eventCount) ?? [0]))
  const orderedEvents = [...events].sort((a, b) => `${a.eventDate}${a.startTime}`.localeCompare(`${b.eventDate}${b.startTime}`))
  const filteredEvents = orderedEvents.filter((event) => {
    if (floorFilter === 'ALL') return true
    return floorGroupFromName(event.floorName) === floorFilter
  })
  const eventsByDate = filteredEvents.reduce<Record<string, EventItem[]>>((acc, event) => {
    acc[event.eventDate] = [...(acc[event.eventDate] ?? []), event]
    return acc
  }, {})
  const selectedEvents = eventsByDate[selectedDate] ?? []
  const selectedRevenue = selectedEvents.reduce((total, event) => total + Number(event.totalAmount ?? 0), 0)
  const contractedSelected = selectedEvents.filter((event) => event.status === 'CONTRACTED').length
  const separatedSelected = selectedEvents.filter((event) => event.status === 'SEPARATED').length
  const currentMonthDate = parseDateKey(firstUpcomingDate)
  const currentMonthEvents = filteredEvents.filter((event) => sameMonth(parseDateKey(event.eventDate), currentMonthDate))
  const nextMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1)
  const nextMonthEvents = filteredEvents.filter((event) => sameMonth(parseDateKey(event.eventDate), nextMonth))
  const nextEvents = filteredEvents.filter((event) => event.eventDate >= todayKey).slice(0, 5)
  const [mobileCalendarMode, setMobileCalendarMode] = useState<MobileCalendarMode>('agenda')
  const [expandedMobileEventId, setExpandedMobileEventId] = useState<string | null>(null)
  const [mobileMonthDate, setMobileMonthDate] = useState(
    () => new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 1),
  )
  const floorInsights = (summary?.eventsByFloor ?? []).map((item) => {
    const floorEvents = filteredEvents.filter((event) => event.floorName === item.floorName)
    const upcoming = floorEvents.find((event) => event.eventDate >= todayKey)
    const latest = floorEvents[floorEvents.length - 1]
    const contracted = floorEvents.filter((event) => event.status === 'CONTRACTED').length
    const separated = floorEvents.filter((event) => event.status === 'SEPARATED').length
    const revenue = floorEvents.reduce((total, event) => total + Number(event.totalAmount ?? 0), 0)
    return {
      ...item,
      upcoming,
      latest,
      contracted,
      separated,
      revenue,
    }
  })
  const isMobileCalendar = true
  const calendarEvents = filteredEvents.map((event) => ({
    id: event.id,
    title: `${event.title} - ${event.floorName}`,
    start: `${event.eventDate}T${event.startTime}`,
    end: `${event.eventDate}T${event.endTime}`,
    extendedProps: {
      status: event.status,
      clientName: event.clientName,
    },
  }))
  const calendarFilterOptions: Array<{ id: FloorFilter; label: string }> = [
    { id: 'ALL', label: 'Todos los pisos' },
    { id: 'F1', label: 'Piso 1' },
    { id: 'F2', label: 'Piso 2' },
    { id: 'F34', label: 'Piso 3 y 4' },
  ]
  const mobileDays = mobileMonthDays(mobileMonthDate)
  const mobileAgendaEvents = filteredEvents.filter((event) => event.eventDate >= todayKey).slice(0, 14)

  useEffect(() => {
    const date = parseDateKey(selectedDate)
    setMobileMonthDate(new Date(date.getFullYear(), date.getMonth(), 1))
  }, [selectedDate])

  function moveMobileMonth(delta: number) {
    setMobileMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1))
  }

  function goToTodayOnMobile() {
    const today = new Date()
    setSelectedDate(dateKey(today))
    setMobileMonthDate(new Date(today.getFullYear(), today.getMonth(), 1))
  }

  async function downloadContract(event: EventItem) {
    setDownloadingId(event.id)
    try {
      const preview = await api.contractPreview(event.id)
      setEventDetailMap((current) => ({ ...current, [event.id]: preview }))
      setDetailErrorMap((current) => {
        const next = { ...current }
        delete next[event.id]
        return next
      })
      await downloadEventContractPdf(preview)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo descargar el contrato.')
    } finally {
      setDownloadingId(null)
    }
  }

  useEffect(() => {
    const missingIds = selectedEvents
      .map((event) => event.id)
      .filter((id) => !eventDetailMap[id] && !detailLoadingMap[id])
    if (missingIds.length === 0) {
      return
    }

    setDetailLoadingMap((current) => ({
      ...current,
      ...Object.fromEntries(missingIds.map((id) => [id, true])),
    }))

    void Promise.allSettled(
      missingIds.map(async (id) => {
        const detail = await api.contractPreview(id)
        return [id, detail] as const
      }),
    ).then((results) => {
      const loaded = results.reduce<Record<string, ContractPreview>>((acc, item) => {
        if (item.status === 'fulfilled') {
          const [id, detail] = item.value
          acc[id] = detail
        }
        return acc
      }, {})

      setEventDetailMap((current) => ({ ...current, ...loaded }))
      setDetailErrorMap((current) => {
        const next = { ...current }
        results.forEach((item) => {
          if (item.status === 'fulfilled') {
            const [id] = item.value
            delete next[id]
          }
        })
        results.forEach((item, index) => {
          if (item.status === 'rejected') {
            next[missingIds[index]] = true
          }
        })
        return next
      })
      setDetailLoadingMap((current) => {
        const next = { ...current }
        missingIds.forEach((id) => {
          delete next[id]
        })
        return next
      })
    })
  }, [selectedEvents, eventDetailMap, detailLoadingMap, detailErrorMap])

  function renderMobileEventCard(event: EventItem, showDate = false) {
    const isPreviewOpen = expandedMobileEventId === event.id
    return (
      <article className={`mobile-calendar-event-card ${event.status}`} key={event.id}>
        <div className="mobile-event-date-pill">
          <strong>{showDate ? shortDate.format(parseDateKey(event.eventDate)).replace('.', '') : shortTime(event.startTime)}</strong>
          <span>{showDate ? shortTime(event.startTime) : durationLabel(event.startTime, event.endTime)}</span>
        </div>
        <div className="mobile-event-card-body">
          <header>
            <div>
              <span className="mobile-event-floor">{event.floorName}</span>
              <strong>{event.title}</strong>
            </div>
            <span className={`status ${event.status}`}>{eventStatusLabels[event.status]}</span>
          </header>
          <p>{event.clientName}</p>
          <div className="mobile-event-card-meta">
            <span>
              <Clock size={14} />
              {shortTime(event.startTime)} - {shortTime(event.endTime)}
            </span>
            <span>
              <Package size={14} />
              {event.packageName ?? event.eventType}
            </span>
            <span>
              <CircleDollarSign size={14} />
              {money.format(event.totalAmount)}
            </span>
          </div>
          {isPreviewOpen && (
            <div className="mobile-event-preview">
              <div>
                <span>Fecha</span>
                <strong>{capitalizedDateLabel(prettyDate.format(parseDateKey(event.eventDate)))}</strong>
              </div>
              <div>
                <span>Cliente</span>
                <strong>{event.clientName}</strong>
              </div>
              <div>
                <span>Ambiente</span>
                <strong>{event.floorName}</strong>
              </div>
              <div>
                <span>Duración</span>
                <strong>{durationLabel(event.startTime, event.endTime)}</strong>
              </div>
              <div>
                <span>APDAYC</span>
                <strong>{money.format(event.apdaycAmount)}</strong>
              </div>
              <div>
                <span>Código</span>
                <strong>{eventCodeLabel(event)}</strong>
              </div>
            </div>
          )}
          <div className="mobile-event-card-actions">
            <button
              aria-expanded={isPreviewOpen}
              className="btn ghost mobile-preview-btn"
              onClick={() => setExpandedMobileEventId((current) => (current === event.id ? null : event.id))}
              type="button"
            >
              {isPreviewOpen ? 'Ocultar' : 'Vista previa'}
            </button>
            <button
              className="btn primary"
              disabled={downloadingId === event.id}
              onClick={() => void downloadContract(event)}
              type="button"
            >
              <Download size={15} />
              {downloadingId === event.id ? 'Generando...' : 'PDF'}
            </button>
          </div>
        </div>
      </article>
    )
  }

  const stats = [
    { label: 'Clientes', value: summary?.totalClients ?? 0, icon: Users },
    { label: 'Ambientes', value: summary?.totalFloors ?? 0, icon: Building2 },
    { label: 'Paquetes', value: summary?.totalPackages ?? 0, icon: Package },
    { label: 'Eventos 30 días', value: summary?.eventsNext30Days ?? 0, icon: CalendarDays },
    { label: 'Contratado', value: money.format(summary?.totalContracted ?? 0), icon: CircleDollarSign },
  ]

  return (
    <>
      <section className="stat-grid">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <article className="stat-card" key={stat.label}>
              <div className="icon-line">
                {stat.label}
                <Icon size={18} />
              </div>
              <strong>{stat.value}</strong>
              <span>Datos actuales del sistema</span>
            </article>
          )
        })}
      </section>

      <section className="calendar-dashboard">
        <div className="panel calendar-panel">
          <div className="calendar-head">
            <div>
              <p className="eyebrow">Calendario operativo</p>
              <h2>Calendario profesional de reservas</h2>
            </div>
            <div className="calendar-filter-bar" role="tablist" aria-label="Filtro por piso">
              {calendarFilterOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`calendar-filter-chip ${floorFilter === option.id ? 'active' : ''}`}
                  onClick={() => setFloorFilter(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="calendar-month-summary">
            <article>
              <span>Este mes</span>
              <strong>{currentMonthEvents.length}</strong>
            </article>
            <article>
              <span>Próximo mes</span>
              <strong>{nextMonthEvents.length}</strong>
            </article>
            <article>
              <span>Día elegido</span>
              <strong>{selectedEvents.length}</strong>
            </article>
          </div>

          {isMobileCalendar ? (
            <div className="mobile-calendar-shell">
              <div className="mobile-calendar-toolbar">
                <button aria-label="Mes anterior" className="mobile-calendar-nav-btn prev" onClick={() => moveMobileMonth(-1)} type="button">
                  <ChevronLeft size={18} />
                </button>
                <div className="mobile-calendar-title">
                  <span>Calendario</span>
                  <strong>{capitalizedDateLabel(monthTitle.format(mobileMonthDate))}</strong>
                </div>
                <button aria-label="Mes siguiente" className="mobile-calendar-nav-btn next" onClick={() => moveMobileMonth(1)} type="button">
                  <ChevronRight size={18} />
                </button>
                <button className="mobile-today-btn" onClick={goToTodayOnMobile} type="button">
                  Hoy
                </button>
              </div>

              <div className="mobile-calendar-segment" role="tablist" aria-label="Vista del calendario">
                <button
                  aria-selected={mobileCalendarMode === 'agenda'}
                  className={mobileCalendarMode === 'agenda' ? 'active' : ''}
                  onClick={() => setMobileCalendarMode('agenda')}
                  role="tab"
                  type="button"
                >
                  Agenda
                </button>
                <button
                  aria-selected={mobileCalendarMode === 'month'}
                  className={mobileCalendarMode === 'month' ? 'active' : ''}
                  onClick={() => setMobileCalendarMode('month')}
                  role="tab"
                  type="button"
                >
                  Mes
                </button>
              </div>

              {mobileCalendarMode === 'agenda' ? (
                <div className="mobile-agenda-panel">
                  <div className="mobile-section-head">
                    <div>
                      <span>Agenda móvil</span>
                      <strong>Próximas reservas</strong>
                    </div>
                    <small>{mobileAgendaEvents.length} visibles</small>
                  </div>
                  <div className="mobile-agenda-list">
                    {mobileAgendaEvents.length === 0 && <p className="empty">No hay eventos próximos para este filtro.</p>}
                    {mobileAgendaEvents.map((event) => renderMobileEventCard(event, true))}
                  </div>
                </div>
              ) : (
                <div className="mobile-month-panel">
                  <div className="mobile-weekdays" aria-hidden="true">
                    {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => (
                      <span key={`${day}-${index}`}>{day}</span>
                    ))}
                  </div>
                  <div className="mobile-month-grid" role="grid" aria-label={`Mes de ${monthTitle.format(mobileMonthDate)}`}>
                    {mobileDays.map((day) => {
                      const dayEvents = eventsByDate[day.key] ?? []
                      const isSelected = day.key === selectedDate
                      const isToday = day.key === todayKey
                      return (
                        <button
                          className={[
                            'mobile-month-day',
                            day.inCurrentMonth ? '' : 'muted',
                            isSelected ? 'selected' : '',
                            isToday ? 'today' : '',
                            dayEvents.length ? 'has-events' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          key={day.key}
                          onClick={() => setSelectedDate(day.key)}
                          role="gridcell"
                          type="button"
                        >
                          <span className="mobile-day-number">{day.date.getDate()}</span>
                          {dayEvents.length > 0 && (
                            <span className="mobile-day-indicator" aria-label={`${dayEvents.length} eventos`}>
                              {dayEvents.length === 1 ? <span className={`mobile-event-dot ${dayEvents[0].status}`} /> : <span>{dayEvents.length}</span>}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  <div className="mobile-selected-day-panel">
                    <div className="mobile-section-head">
                      <div>
                        <span>Día seleccionado</span>
                        <strong>{capitalizedDateLabel(prettyDate.format(parseDateKey(selectedDate)))}</strong>
                      </div>
                      <small>{selectedEvents.length} eventos</small>
                    </div>
                    <div className="mobile-selected-list">
                      {selectedEvents.length === 0 && <p className="empty">No hay eventos para este día.</p>}
                      {selectedEvents.map((event) => renderMobileEventCard(event))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="calendar-grid-pro notranslate" translate="no">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                locale={esLocale}
                initialView="dayGridMonth"
                initialDate={firstUpcomingDate}
                height="auto"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,listWeek',
                }}
                buttonText={{
                  today: 'Hoy',
                }}
                views={{
                  dayGridMonth: { buttonText: 'Mes' },
                  timeGridWeek: { buttonText: 'Semana' },
                  listWeek: { buttonText: 'Agenda' },
                }}
                dayHeaderFormat={{ weekday: 'short' }}
                titleFormat={{ month: 'long', year: 'numeric' }}
                fixedWeekCount={false}
                showNonCurrentDates
                dayMaxEvents={3}
                moreLinkText={(count) => `+${count}`}
                eventTimeFormat={{
                  hour: '2-digit',
                  minute: '2-digit',
                  meridiem: false,
                }}
                events={calendarEvents}
                eventClassNames="areli-fc-event"
                dateClick={(info) => setSelectedDate(info.dateStr)}
                eventClick={(info) => setSelectedDate(info.event.startStr.slice(0, 10))}
                dayCellDidMount={(arg: { date: Date; el: HTMLElement }) => {
                  arg.el.onmouseenter = () => setHoveredDate(dateKey(arg.date))
                  arg.el.onmouseleave = () => setHoveredDate(null)
                }}
                eventMouseEnter={(info: { event: { startStr: string } }) => setHoveredDate(info.event.startStr.slice(0, 10))}
                eventMouseLeave={() => setHoveredDate(null)}
                dayCellClassNames={(arg) =>
                  [dateKey(arg.date) === selectedDate ? 'fc-day-selected' : '', dateKey(arg.date) === hoveredDate ? 'fc-day-hovered' : '']
                    .filter(Boolean)
                }
              />
            </div>
          )}
        </div>

        <aside className="panel calendar-side">
          <div>
            <p className="eyebrow">Día seleccionado</p>
            <h2>{capitalizedDateLabel(prettyDate.format(parseDateKey(selectedDate)))}</h2>
          </div>
          <div className="calendar-kpi-strip">
            <article>
              <span>Eventos</span>
              <strong>{selectedEvents.length}</strong>
            </article>
            <article>
              <span>Separados</span>
              <strong>{separatedSelected}</strong>
            </article>
            <article>
              <span>Contratados</span>
              <strong>{contractedSelected}</strong>
            </article>
            <article>
              <span>Ingreso del día</span>
              <strong>{money.format(selectedRevenue)}</strong>
            </article>
          </div>
          <div className="calendar-selected-list">
            {selectedEvents.length === 0 && <p className="empty">No hay eventos separados para este día.</p>}
            {selectedEvents.map((event) => (
              <article className="calendar-event-card" key={event.id}>
                {(() => {
                  const detail = eventDetailMap[event.id]
                  const isDetailLoading = Boolean(detailLoadingMap[event.id])
                  const hasDetailError = Boolean(detailErrorMap[event.id])
                  return (
                    <>
                      <div className="event-code-line">
                        <strong>{eventCodeLabel(event)}</strong>
                      </div>
                      <header>
                        <strong>{event.title}</strong>
                        <span className={`status ${event.status}`}>{eventStatusLabels[event.status]}</span>
                      </header>
                      <p>{event.clientName}</p>
                      <div className="calendar-event-meta">
                        <span>
                          <Clock size={14} />
                          {shortTime(event.startTime)} - {shortTime(event.endTime)}
                        </span>
                        <span>
                          <CalendarDays size={14} />
                          Duración: {durationLabel(event.startTime, event.endTime)}
                        </span>
                        <span>
                          <MapPin size={14} />
                          {event.floorName}
                        </span>
                        <span>
                          <CircleDollarSign size={14} />
                          {money.format(event.totalAmount)}
                        </span>
                        <span>
                          <Package size={14} />
                          {event.packageName ?? event.eventType}
                        </span>
                        <span>
                          <Users size={14} />
                          Capacidad máxima:{' '}
                          {detail
                            ? detail.capacityMaximum ?? 'Por confirmar'
                            : isDetailLoading
                              ? 'Cargando...'
                              : hasDetailError
                                ? 'Error al cargar'
                                : 'Sin dato'}
                        </span>
                        <span>
                          <Phone size={14} />
                          Contacto cliente:{' '}
                          {detail
                            ? detail.clientPhone || 'No registrado'
                            : isDetailLoading
                              ? 'Cargando...'
                              : hasDetailError
                                ? 'Error al cargar'
                                : 'Sin dato'}
                        </span>
                      </div>
                      {hasDetailError && (
                        <div className="calendar-detail-retry">
                          <button
                            className="btn ghost"
                            onClick={() =>
                              setDetailErrorMap((current) => {
                                const next = { ...current }
                                delete next[event.id]
                                return next
                              })
                            }
                            type="button"
                          >
                            Reintentar datos del contrato
                          </button>
                        </div>
                      )}
                      <div className="calendar-event-actions">
                        <button className="btn ghost" onClick={() => setQuickViewEvent(event)} type="button">
                          Ver
                        </button>
                        <button
                          className="btn primary"
                          disabled={downloadingId === event.id}
                          onClick={() => void downloadContract(event)}
                          type="button"
                        >
                          <Download size={15} />
                          {downloadingId === event.id ? 'Generando...' : 'PDF'}
                        </button>
                      </div>
                    </>
                  )
                })()}
              </article>
            ))}
          </div>

          <div className="next-month-box">
            <h3>Aproximación del próximo mes</h3>
            {nextMonthEvents.length === 0 && <p>No hay eventos registrados para {monthTitle.format(nextMonth)}.</p>}
            {nextMonthEvents.slice(0, 4).map((event) => (
              <article key={event.id}>
                <span>{shortDate.format(parseDateKey(event.eventDate))}</span>
                <strong>{event.title}</strong>
                <small>{event.floorName}</small>
              </article>
            ))}
          </div>

          {quickViewEvent && (
            <div className="quick-view-card">
              <div className="quick-view-head">
                <h3>Vista rápida del evento</h3>
                <button className="btn icon" onClick={() => setQuickViewEvent(null)} type="button">
                  Cerrar
                </button>
              </div>
              <strong>{quickViewEvent.title}</strong>
              <p>
                {quickViewEvent.clientName} - {quickViewEvent.floorName}
              </p>
              <div className="quick-view-meta">
                <span>
                  <Clock size={14} />
                  {quickViewEvent.eventDate} {shortTime(quickViewEvent.startTime)} - {shortTime(quickViewEvent.endTime)}
                </span>
                <span>
                  <Package size={14} />
                  {quickViewEvent.packageName ?? quickViewEvent.eventType}
                </span>
                <span>
                  <CircleDollarSign size={14} />
                  {money.format(quickViewEvent.totalAmount)}
                </span>
                <span className={`status ${quickViewEvent.status}`}>{eventStatusLabels[quickViewEvent.status]}</span>
              </div>
              <div className="quick-view-actions">
                <button
                  className="btn primary"
                  disabled={downloadingId === quickViewEvent.id}
                  onClick={() => void downloadContract(quickViewEvent)}
                  type="button"
                >
                  <Download size={15} />
                  {downloadingId === quickViewEvent.id ? 'Generando...' : 'Descargar PDF'}
                </button>
              </div>
            </div>
          )}
        </aside>
      </section>

      <section className="grid two dashboard-secondary-grid">
        <div className="panel">
          <h2>Próximos eventos</h2>
          <div className="dashboard-next-list">
            {nextEvents.length === 0 && <p className="empty">Todavía no hay eventos próximos.</p>}
            {nextEvents.map((event) => (
              <article className="dashboard-next-card" key={event.id}>
                <div className="date-badge">
                  <strong>{shortDate.format(parseDateKey(event.eventDate)).replace('.', '')}</strong>
                  <span>{shortTime(event.startTime)}</span>
                </div>
                <div>
                  <strong>{event.title}</strong>
                  <p>{event.clientName} - {event.floorName}</p>
                  <small>
                    {event.packageName ?? event.eventType} - {durationLabel(event.startTime, event.endTime)} -{' '}
                    {money.format(event.totalAmount)}
                  </small>
                </div>
                <span className={`status ${event.status}`}>{eventStatusLabels[event.status]}</span>
              </article>
            ))}
          </div>
        </div>
        <div className="panel">
          <h2>Ocupación por ambiente</h2>
          <div className="item-list">
            {floorInsights.length === 0 && <p className="empty">Todavía no hay eventos registrados.</p>}
            {floorInsights.map((item) => (
              <article className="item-card" key={item.floorName}>
                <header>
                  <strong>{item.floorName}</strong>
                  <span className="status AVAILABLE">{item.eventCount} eventos</span>
                </header>
                <p>
                  Separados: {item.separated} - Contratados: {item.contracted} - Facturación:{' '}
                  {money.format(item.revenue)}
                </p>
                <p>
                  Próximo: {item.upcoming ? `${shortDate.format(parseDateKey(item.upcoming.eventDate))} ${shortTime(item.upcoming.startTime)}` : 'Sin fecha'}
                  {' - '}
                  Último registro: {item.latest ? shortDate.format(parseDateKey(item.latest.eventDate)) : 'Sin historial'}
                </p>
                <div className="usage-bar" aria-hidden="true">
                  <span style={{ width: `${Math.max(8, (item.eventCount / maxFloorEvents) * 100)}%` }} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

function EventsView({
  clients,
  floors,
  packages,
  selectedPackage,
  eventForm,
  updateEvent,
  submitEvent,
  createQuickClient,
  openRegisteredEvents,
}: {
  clients: Client[]
  floors: Floor[]
  packages: EventPackage[]
  selectedPackage?: EventPackage
  eventForm: EventPayload
  updateEvent: <K extends keyof EventPayload>(key: K, value: EventPayload[K]) => void
  submitEvent: (event: FormEvent) => Promise<void>
  createQuickClient: (payload: ClientPayload) => Promise<void>
  openRegisteredEvents: () => void
}) {
  const selectedFloor = floors.find((item) => item.id === eventForm.floorId)
  const suggestedCapacity = selectedPackage?.includedCapacity ?? selectedFloor?.capacity ?? null
  const [clientSearch, setClientSearch] = useState('')
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false)
  const [quickClientSaving, setQuickClientSaving] = useState(false)
  const [quickLookupBusy, setQuickLookupBusy] = useState(false)
  const [quickLookupMessage, setQuickLookupMessage] = useState('')
  const [quickClientError, setQuickClientError] = useState('')
  const quickLookupKeyRef = useRef('')
  const quickModalCardRef = useRef<HTMLDivElement | null>(null)
  const [quickClientForm, setQuickClientForm] = useState<ClientPayload>({
    fullName: '',
    documentType: 'DNI',
    documentNumber: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    notes: '',
  })
  const filteredClients = useMemo(() => {
    const term = clientSearch.trim().toLowerCase()
    if (!term) return clients
    return clients.filter((client) => {
      const name = client.fullName?.toLowerCase() ?? ''
      const doc = client.documentNumber?.toLowerCase() ?? ''
      const phone = client.phone?.toLowerCase() ?? ''
      const whatsapp = client.whatsapp?.toLowerCase() ?? ''
      return name.includes(term) || doc.includes(term) || phone.includes(term) || whatsapp.includes(term)
    })
  }, [clients, clientSearch])

  async function submitQuickClient(event: FormEvent) {
    event.preventDefault()
    setQuickClientError('')
    setQuickClientSaving(true)
    try {
      await createQuickClient(quickClientForm)
      setIsQuickClientOpen(false)
      setQuickClientForm({
        fullName: '',
        documentType: 'DNI',
        documentNumber: '',
        phone: '',
        whatsapp: '',
        email: '',
        address: '',
        notes: '',
      })
    } catch (err) {
      setQuickClientError(err instanceof Error ? err.message : 'No se pudo crear el cliente.')
    } finally {
      setQuickClientSaving(false)
    }
  }

  async function tryAutoLookupQuickClient(documentType: 'DNI' | 'RUC', documentNumber: string) {
    const expectedLength = documentType === 'DNI' ? 8 : 11
    const digitsOnly = documentNumber.replace(/\D/g, '')
    if (digitsOnly.length !== expectedLength) {
      setQuickLookupMessage('')
      return
    }
    const lookupKey = `${documentType}:${digitsOnly}`
    if (quickLookupKeyRef.current === lookupKey) return
    quickLookupKeyRef.current = lookupKey
    setQuickLookupBusy(true)
    try {
      const data = await api.lookupClientDocument(documentType, digitsOnly)
      setQuickClientForm((current) => ({
        ...current,
        fullName: data.fullName || current.fullName,
        address: data.address || current.address,
      }))
      setQuickLookupMessage(data.fullName ? 'Datos cargados automáticamente desde Perú API.' : 'Documento válido sin nombre disponible.')
    } catch (err) {
      setQuickLookupMessage(err instanceof Error ? err.message : 'No se pudo consultar el documento.')
    } finally {
      setQuickLookupBusy(false)
    }
  }

  useEffect(() => {
    if (!isQuickClientOpen) return
    const modal = quickModalCardRef.current
    if (!modal) return

    function bringFocusedFieldIntoView(event: FocusEvent) {
      const target = event.target as HTMLElement | null
      if (!target || !quickModalCardRef.current?.contains(target)) return
      window.setTimeout(() => {
        target.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }, 120)
    }

    function handleViewportResize() {
      const viewport = window.visualViewport
      if (!viewport) return
      const keyboardOffset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      quickModalCardRef.current?.style.setProperty('--kb-offset', `${keyboardOffset}px`)
    }

    modal.addEventListener('focusin', bringFocusedFieldIntoView)
    window.visualViewport?.addEventListener('resize', handleViewportResize)
    handleViewportResize()

    return () => {
      modal.removeEventListener('focusin', bringFocusedFieldIntoView)
      window.visualViewport?.removeEventListener('resize', handleViewportResize)
      quickModalCardRef.current?.style.removeProperty('--kb-offset')
    }
  }, [isQuickClientOpen])

  return (
    <section className="grid">
      <div className="panel event-form-panel">
        <h2>Separar nuevo evento</h2>
        <div className="event-form-toolbar">
          <button className="btn ghost" onClick={openRegisteredEvents} type="button">
            Ver eventos registrados
          </button>
        </div>
        <form className="event-create-form" onSubmit={submitEvent}>
          <div className="form-grid event-create-grid">
            <label>
              Cliente
              <input
                className="quick-client-search"
                placeholder="Buscar cliente por nombre, DNI/RUC o teléfono"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
              />
              <div className="quick-client-field">
                <FancySelect
                  required
                  value={eventForm.clientId}
                  onChange={(nextValue) => updateEvent('clientId', nextValue)}
                  options={filteredClients.map((client) => ({
                    value: client.id,
                    label: `${client.fullName}${client.documentNumber ? ` - ${client.documentNumber}` : ''}`,
                  }))}
                />
                <button className="btn icon" onClick={() => setIsQuickClientOpen(true)} type="button">
                  <Plus size={15} />
                  Nuevo cliente
                </button>
              </div>
            </label>
            <label>
              Ambiente
              <FancySelect
                required
                value={eventForm.floorId}
                onChange={(nextFloorId) => {
                  const floor = floors.find((item) => item.id === nextFloorId)
                  updateEvent('floorId', nextFloorId)
                  if (!eventForm.packageId && floor?.capacity) {
                    updateEvent('contractCapacityOverride', Number(floor.capacity))
                  }
                }}
                options={floors.map((floor) => ({ value: floor.id, label: floor.name }))}
              />
            </label>
            <label>
              Paquete
              <FancySelect
                value={eventForm.packageId ?? ''}
                onChange={(nextValue) => {
                  const selected = packages.find((item) => item.id === nextValue)
                  updateEvent('packageId', nextValue)
                  if (selected) {
                    updateEvent('totalAmount', Number(selected.basePrice))
                    updateEvent('apdaycStatus', 'PENDING')
                    updateEvent('apdaycPayer', 'CLIENT')
                    if (selected.includedCapacity) {
                      updateEvent('contractCapacityOverride', Number(selected.includedCapacity))
                    }
                    updateEvent(
                      'apdaycNotes',
                      selected.name.toLowerCase().includes('promociones')
                        ? 'No incluye IGV ni pago de APDAYC; lo asume la promoción o institución contratante.'
                        : 'APDAYC u otros derechos no incluidos son asumidos por el cliente salvo acuerdo escrito.',
                    )
                  }
                }}
                placeholder="Personalizado"
                options={packages.map((eventPackage) => ({ value: eventPackage.id, label: eventPackage.name }))}
              />
            </label>
            <label>
              Tipo
              <FancySelect
                value={eventForm.eventType}
                onChange={(nextValue) => updateEvent('eventType', nextValue)}
                options={[
                  { value: 'Matrimonio', label: 'Matrimonio' },
                  { value: '15 años', label: '15 años' },
                  { value: 'Promoción', label: 'Promoción' },
                  { value: 'Cumpleaños', label: 'Cumpleaños' },
                  { value: 'Corporativo', label: 'Corporativo' },
                  { value: 'Personalizado', label: 'Personalizado' },
                ]}
              />
            </label>
            <label className="full">
              Título del evento
              <input value={eventForm.title} onChange={(e) => updateEvent('title', e.target.value)} required />
            </label>
            <label>
              Fecha
              <DatePicker
                calendarClassName="fancy-datepicker"
                className="fancy-date-input"
                dateFormat="dd/MM/yyyy"
                locale="es"
                onChange={(date: Date | null) => updateEvent('eventDate', formatYmdDate(date))}
                placeholderText="Seleccionar fecha"
                required
                selected={parseYmdDate(eventForm.eventDate)}
              />
            </label>
            <label>
              Estado
              <FancySelect
                value={eventForm.status}
                onChange={(nextValue) => updateEvent('status', nextValue as EventStatus)}
                options={Object.entries(eventStatusLabels).map(([value, label]) => ({ value, label }))}
              />
            </label>
            <label>
              Inicio
              <TimePickerField required value={eventForm.startTime} onChange={(nextValue) => updateEvent('startTime', nextValue)} />
            </label>
            <label>
              Fin
              <TimePickerField required value={eventForm.endTime} onChange={(nextValue) => updateEvent('endTime', nextValue)} />
            </label>
            <label>
              Monto total
              <input
                min="0"
                step="0.01"
                type="number"
                value={eventForm.totalAmount}
                onChange={(e) => updateEvent('totalAmount', Number(e.target.value))}
                required
              />
            </label>
            <label>
              Capacidad máxima contractual
              <input
                min="1"
                step="1"
                type="number"
                value={eventForm.contractCapacityOverride || ''}
                onChange={(e) => updateEvent('contractCapacityOverride', Number(e.target.value))}
                placeholder={suggestedCapacity ? `Sugerida: ${suggestedCapacity}` : 'Ejemplo: 80'}
                required
              />
            </label>
            <label>
              Pago APDAYC
              <input
                min="0"
                step="0.01"
                type="number"
                value={eventForm.apdaycAmount === 0 ? '' : eventForm.apdaycAmount}
                onChange={(e) => updateEvent('apdaycAmount', e.target.value === '' ? 0 : Number(e.target.value))}
                placeholder="0"
              />
            </label>
            <label>
              Asume APDAYC
              <FancySelect
                value={eventForm.apdaycPayer}
                onChange={(nextValue) => updateEvent('apdaycPayer', nextValue as ApdaycPayer)}
                options={Object.entries(apdaycPayerLabels).map(([value, label]) => ({ value, label }))}
              />
            </label>
            <label>
              Estado APDAYC
              <FancySelect
                value={eventForm.apdaycStatus}
                onChange={(nextValue) => updateEvent('apdaycStatus', nextValue as ApdaycStatus)}
                options={Object.entries(apdaycStatusLabels).map(([value, label]) => ({ value, label }))}
              />
            </label>
            <label className="full">
              Nota APDAYC
              <textarea
                value={eventForm.apdaycNotes}
                onChange={(e) => updateEvent('apdaycNotes', e.target.value)}
                placeholder="Ejemplo: APDAYC lo asume el cliente/promoción; no incluido en el paquete."
              />
            </label>
            <label className="full">
              Observaciones
              <textarea value={eventForm.notes} onChange={(e) => updateEvent('notes', e.target.value)} />
            </label>
          </div>
          {selectedPackage && (
            <div className="package-preview">
              <strong>Hoja final del contrato: {selectedPackage.name}</strong>
              <p>{selectedPackage.includedServices}</p>
              <p>{selectedPackage.terms}</p>
            </div>
          )}
          <div className="form-actions event-create-actions">
            <button className="btn primary" type="submit">
              <Save size={17} />
              Guardar reserva
            </button>
          </div>
        </form>
      </div>
      {isQuickClientOpen && (
        <div
          className="quick-modal-layer"
          role="dialog"
          aria-modal="true"
          aria-label="Crear cliente rápido"
          onClick={() => setIsQuickClientOpen(false)}
        >
          <div
            className="quick-modal-card modal-2026 quick-modal-card-mobile"
            ref={quickModalCardRef}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="quick-modal-head modal-2026-head">
              <h3>Crear cliente rápido</h3>
              <button className="btn icon modal-close-btn" onClick={() => setIsQuickClientOpen(false)} type="button">
                <X size={15} />
                Cerrar
              </button>
            </div>
            {quickClientError && <p className="message error">{quickClientError}</p>}
            <form className="modal-2026-form" onSubmit={submitQuickClient}>
              <div className="form-grid">
                <label className="full">
                  Nombre completo
                  <input
                    value={quickClientForm.fullName}
                    onChange={(e) => setQuickClientForm((current) => ({ ...current, fullName: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Tipo documento
                  <FancySelect
                    value={quickClientForm.documentType ?? 'DNI'}
                    onChange={(nextValue) => {
                      quickLookupKeyRef.current = ''
                      setQuickLookupMessage('')
                      setQuickClientForm((current) => ({
                        ...current,
                        documentType: nextValue as 'DNI' | 'RUC',
                        documentNumber: '',
                      }))
                    }}
                    options={[
                      { value: 'DNI', label: 'DNI' },
                      { value: 'RUC', label: 'RUC' },
                    ]}
                  />
                </label>
                <label>
                  {quickClientForm.documentType === 'RUC' ? 'Número de RUC' : 'Número de DNI'}
                  <input
                    inputMode="numeric"
                    maxLength={quickClientForm.documentType === 'RUC' ? 11 : 8}
                    pattern={quickClientForm.documentType === 'RUC' ? '\\d{11}' : '\\d{8}'}
                    value={quickClientForm.documentNumber}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, '')
                      setQuickClientForm((current) => ({ ...current, documentNumber: digitsOnly }))
                      void tryAutoLookupQuickClient((quickClientForm.documentType ?? 'DNI') as 'DNI' | 'RUC', digitsOnly)
                    }}
                    required
                  />
                  {quickLookupBusy && <small>Consultando RENIEC/SUNAT...</small>}
                  {!quickLookupBusy && quickLookupMessage && <small>{quickLookupMessage}</small>}
                </label>
                <label>
                  Teléfono
                  <input
                    value={quickClientForm.phone}
                    onChange={(e) => setQuickClientForm((current) => ({ ...current, phone: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  WhatsApp
                  <input
                    value={quickClientForm.whatsapp}
                    onChange={(e) => setQuickClientForm((current) => ({ ...current, whatsapp: e.target.value }))}
                  />
                </label>
                <label>
                  Correo
                  <input
                    type="email"
                    value={quickClientForm.email}
                    onChange={(e) => setQuickClientForm((current) => ({ ...current, email: e.target.value }))}
                  />
                </label>
              </div>
              <div className="form-actions modal-2026-actions">
                <button className="btn ghost" onClick={() => setIsQuickClientOpen(false)} type="button">
                  Cancelar
                </button>
                <button className="btn primary" disabled={quickClientSaving} type="submit">
                  <Save size={15} />
                  {quickClientSaving ? 'Guardando...' : 'Guardar y usar cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

function EventTable({
  events,
  onEventUpdated,
  onEditRequested,
}: {
  events: EventItem[]
  onEventUpdated: () => Promise<void>
  onEditRequested?: (event: EventItem) => void
}) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rescheduleTarget, setRescheduleTarget] = useState<EventItem | null>(null)
  const [rescheduleOptions, setRescheduleOptions] = useState<RescheduleOptions | null>(null)
  const [loadingRescheduleId, setLoadingRescheduleId] = useState<string | null>(null)
  const [rescheduleForm, setRescheduleForm] = useState({ eventDate: '', startTime: '', endTime: '' })
  const [rescheduleFallbackNote, setRescheduleFallbackNote] = useState<string | null>(null)

  async function downloadContract(event: EventItem) {
    setDownloadingId(event.id)
    try {
      const preview = await api.contractPreview(event.id)
      await downloadEventContractPdf(preview)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo descargar el contrato.')
    } finally {
      setDownloadingId(null)
    }
  }

  async function cancelEvent(event: EventItem) {
    if (!window.confirm(`Anular "${event.title}"?`)) return
    const cancellationTypeInput = window.prompt(
      'Tipo de anulación: CLIENT_REQUEST | FORCE_MAJEURE | NO_SHOW | RESCHEDULE_REQUEST_REJECTED',
      'CLIENT_REQUEST',
    )
    if (!cancellationTypeInput) return
    const cancellationType = cancellationTypeInput.trim().toUpperCase()
    const validTypes = ['CLIENT_REQUEST', 'FORCE_MAJEURE', 'NO_SHOW', 'RESCHEDULE_REQUEST_REJECTED']
    if (!validTypes.includes(cancellationType)) {
      alert('Tipo de anulación no válido.')
      return
    }
    const cancellationNotes = window.prompt('Motivo breve de la anulación (opcional):', '') ?? ''
    setProcessingId(event.id)
    try {
      const cancelled = await api.cancelEventWithContract(event.id, {
        cancellationType: cancellationType as 'CLIENT_REQUEST' | 'FORCE_MAJEURE' | 'NO_SHOW' | 'RESCHEDULE_REQUEST_REJECTED',
        cancellationNotes,
      })
      await onEventUpdated()
      if ((cancelled.cancellationNoticeDays ?? 0) < 15) {
        alert(
          `Anulación guardada con lógica contractual: aviso de ${cancelled.cancellationNoticeDays ?? 0} días. Retención aplicada: ${money.format(cancelled.retainedAdvanceAmount ?? 0)}.`,
        )
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo anular el evento.')
    } finally {
      setProcessingId(null)
    }
  }

  async function openReschedule(event: EventItem) {
    setLoadingRescheduleId(event.id)
    setRescheduleFallbackNote(null)
    try {
      const options = await api.rescheduleOptions(event.id)
      setRescheduleTarget(event)
      setRescheduleOptions(options)
      setRescheduleForm({
        eventDate: event.eventDate,
        startTime: shortTime(event.startTime),
        endTime: shortTime(event.endTime),
      })
    } catch (err) {
      if (isHttp404Error(err)) {
        setRescheduleTarget(event)
        setRescheduleOptions(buildLocalRescheduleOptions(event, events))
        setRescheduleForm({
          eventDate: event.eventDate,
          startTime: shortTime(event.startTime),
          endTime: shortTime(event.endTime),
        })
        setRescheduleFallbackNote(
          'El servidor aún no expone la agenda ampliada (404). Mostrando eventos del mismo ambiente según los datos cargados en pantalla. Reinicia o actualiza areli-api con la última versión para la lista oficial y las validaciones del servidor.',
        )
      } else {
        alert(err instanceof Error ? err.message : 'No se pudo cargar la agenda de reprogramación.')
      }
    } finally {
      setLoadingRescheduleId(null)
    }
  }

  async function confirmReschedule() {
    if (!rescheduleTarget) return
    if (!rescheduleForm.eventDate || !rescheduleForm.startTime || !rescheduleForm.endTime) {
      alert('Completa fecha y horario para reprogramar.')
      return
    }

    setProcessingId(rescheduleTarget.id)
    try {
      await api.rescheduleEvent(rescheduleTarget.id, {
        eventDate: rescheduleForm.eventDate,
        startTime: rescheduleForm.startTime,
        endTime: rescheduleForm.endTime,
      })
      await onEventUpdated()
      setRescheduleTarget(null)
      setRescheduleOptions(null)
      setRescheduleFallbackNote(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo reprogramar el evento.')
    } finally {
      setProcessingId(null)
    }
  }

  if (events.length === 0) {
    return <p className="empty">No hay eventos registrados todavía.</p>
  }

  return (
    <>
    {rescheduleTarget && rescheduleOptions && (
      <section className="event-edit-box event-reschedule-box">
        <h3>Reprogramar: {rescheduleTarget.title}</h3>
        {rescheduleFallbackNote && <p className="reschedule-fallback-note">{rescheduleFallbackNote}</p>}
        <p className="reschedule-rule-line">
          Ambiente: <strong>{rescheduleOptions.floorName}</strong> - Fecha original:{' '}
          <strong>{capitalizedDateLabel(prettyDate.format(parseDateKey(rescheduleOptions.originalDate)))}</strong>
        </p>
        <p className="reschedule-rule-line">
          Rango permitido: <strong>{rescheduleOptions.minAllowedDate}</strong> hasta{' '}
          <strong>{rescheduleOptions.maxAllowedDate}</strong> (máximo 2 meses desde la fecha contratada).
        </p>
        <div className="form-grid">
          <label>
            Nueva fecha
            <DatePicker
              calendarClassName="fancy-datepicker"
              className="fancy-date-input"
              dateFormat="dd/MM/yyyy"
              locale="es"
              maxDate={parseYmdDate(rescheduleOptions.maxAllowedDate) || undefined}
              minDate={parseYmdDate(rescheduleOptions.minAllowedDate) || undefined}
              onChange={(date: Date | null) => setRescheduleForm((prev) => ({ ...prev, eventDate: formatYmdDate(date) }))}
              placeholderText="Seleccionar fecha"
              selected={parseYmdDate(rescheduleForm.eventDate)}
            />
          </label>
          <label>
            Nueva hora inicio
            <TimePickerField value={rescheduleForm.startTime} onChange={(nextValue) => setRescheduleForm((prev) => ({ ...prev, startTime: nextValue }))} />
          </label>
          <label>
            Nueva hora fin
            <TimePickerField value={rescheduleForm.endTime} onChange={(nextValue) => setRescheduleForm((prev) => ({ ...prev, endTime: nextValue }))} />
          </label>
        </div>
        <div className="reschedule-agenda">
          <strong>Agenda programada del ambiente (hasta 2 meses)</strong>
          {rescheduleOptions.scheduledEvents.length === 0 ? (
            <p>No hay eventos registrados en este rango.</p>
          ) : (
            <div className="reschedule-list">
              {rescheduleOptions.scheduledEvents.map((item) => (
                <article className="reschedule-item" key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.floorName}</p>
                  </div>
                  <div>
                    <span>{item.eventDate}</span>
                    <small>
                      {shortTime(item.startTime)} - {shortTime(item.endTime)}
                    </small>
                  </div>
                  <span className={`status ${item.status}`}>{eventStatusLabels[item.status]}</span>
                </article>
              ))}
            </div>
          )}
        </div>
        <div className="form-actions">
          <button
            className="btn ghost"
            onClick={() => {
              setRescheduleTarget(null)
              setRescheduleOptions(null)
              setRescheduleFallbackNote(null)
            }}
            type="button"
          >
            Cerrar
          </button>
          <button
            className="btn primary"
            disabled={processingId === rescheduleTarget.id}
            onClick={() => void confirmReschedule()}
            type="button"
          >
            Guardar reprogramación
          </button>
        </div>
      </section>
    )}
    <div className="table-wrap desktop-table">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Evento</th>
            <th>Cliente</th>
            <th>Ambiente</th>
            <th>Estado</th>
            <th>Monto</th>
            <th>APDAYC</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td>
                {event.eventDate}
                <br />
                <small>
                  {event.startTime} - {event.endTime}
                </small>
              </td>
              <td>
                <strong>{event.title}</strong>
                <br />
                <small>{event.packageName ?? event.eventType}</small>
              </td>
              <td>{event.clientName}</td>
              <td>{event.floorName}</td>
              <td>
                <span className={`status ${event.status}`}>{eventStatusLabels[event.status]}</span>
              </td>
              <td>{money.format(event.totalAmount)}</td>
              <td>
                {money.format(event.apdaycAmount ?? 0)}
                <br />
                <small>{apdaycStatusLabels[event.apdaycStatus]}</small>
              </td>
              <td className="actions-cell">
                <button
                  className="btn icon"
                  onClick={() => onEditRequested?.(event)}
                  type="button"
                >
                  Editar
                </button>
                <button
                  className="btn icon"
                  disabled={processingId === event.id || loadingRescheduleId === event.id}
                  onClick={() => void openReschedule(event)}
                  type="button"
                >
                  {loadingRescheduleId === event.id ? 'Cargando...' : 'Reprogramar'}
                </button>
                <button
                  className="btn icon danger"
                  disabled={processingId === event.id}
                  onClick={() => void cancelEvent(event)}
                  type="button"
                >
                  Anular
                </button>
                <button
                  className="btn icon"
                  disabled={downloadingId === event.id}
                  onClick={() => void downloadContract(event)}
                  title="Descargar contrato PDF"
                  type="button"
                >
                  <Download size={16} />
                  {downloadingId === event.id ? 'Generando' : 'PDF'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="mobile-event-list">
      {events.map((event) => (
        <article className="mobile-event-card mobile-event-card-2026 rounded-lg border bg-white p-3 shadow-sm" key={event.id}>
          <header>
            <div>
              <strong>{event.title}</strong>
              <span>{event.clientName}</span>
            </div>
            <span className={`status ${event.status}`}>{eventStatusLabels[event.status]}</span>
          </header>
          <dl>
            <div>
              <dt>Fecha</dt>
              <dd>{event.eventDate}</dd>
            </div>
            <div>
              <dt>Horario</dt>
              <dd>
                {event.startTime} - {event.endTime}
              </dd>
            </div>
            <div>
              <dt>Ambiente</dt>
              <dd>{event.floorName}</dd>
            </div>
            <div>
              <dt>Monto</dt>
              <dd>{money.format(event.totalAmount)}</dd>
            </div>
            <div>
              <dt>APDAYC</dt>
              <dd>{money.format(event.apdaycAmount ?? 0)}</dd>
            </div>
          </dl>
          <p>
            {event.packageName ?? event.eventType} - APDAYC: {apdaycStatusLabels[event.apdaycStatus]}
          </p>
          <div className="mobile-card-actions">
            <button className="btn icon" onClick={() => onEditRequested?.(event)} type="button">
              Editar
            </button>
            <button
              className="btn icon"
              disabled={processingId === event.id || loadingRescheduleId === event.id}
              onClick={() => void openReschedule(event)}
              type="button"
            >
              {loadingRescheduleId === event.id ? 'Cargando...' : 'Reprogramar'}
            </button>
            <button
              className="btn icon danger"
              disabled={processingId === event.id}
              onClick={() => void cancelEvent(event)}
              type="button"
            >
              Anular
            </button>
            <button
              className="btn icon"
              disabled={downloadingId === event.id}
              onClick={() => void downloadContract(event)}
              title="Descargar contrato PDF"
              type="button"
            >
              <Download size={16} />
              {downloadingId === event.id ? 'Generando PDF' : 'Descargar PDF'}
            </button>
          </div>
        </article>
      ))}
    </div>
    </>
  )
}

function ClientsView({
  mode,
  clients,
  clientForm,
  updateClient,
  submitClient,
  saveClientEdit,
}: {
  mode: 'create' | 'registered'
  clients: Client[]
  clientForm: ClientPayload
  updateClient: <K extends keyof ClientPayload>(key: K, value: ClientPayload[K]) => void
  submitClient: (event: FormEvent) => Promise<void>
  saveClientEdit: (id: string, payload: ClientPayload) => Promise<void>
}) {
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [editingClientForm, setEditingClientForm] = useState<ClientPayload | null>(null)
  const [editingBusy, setEditingBusy] = useState(false)
  const [createLookupBusy, setCreateLookupBusy] = useState(false)
  const [createLookupMessage, setCreateLookupMessage] = useState('')
  const createLookupKeyRef = useRef('')

  function startEditingClient(client: Client) {
    setEditingClientId(client.id)
    setEditingClientForm({
      fullName: client.fullName ?? '',
      documentType: client.documentType ?? 'DNI',
      documentNumber: client.documentNumber ?? '',
      phone: client.phone ?? '',
      whatsapp: client.whatsapp ?? '',
      email: client.email ?? '',
      address: '',
      notes: '',
    })
  }

  function updateEditingClient<K extends keyof ClientPayload>(key: K, value: ClientPayload[K]) {
    setEditingClientForm((current) => (current ? { ...current, [key]: value } : current))
  }

  async function submitEditingClient(event: FormEvent) {
    event.preventDefault()
    if (!editingClientId || !editingClientForm) return
    setEditingBusy(true)
    try {
      await saveClientEdit(editingClientId, editingClientForm)
      setEditingClientId(null)
      setEditingClientForm(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo actualizar el cliente.')
    } finally {
      setEditingBusy(false)
    }
  }

  async function tryAutoLookupCreateClient(documentType: 'DNI' | 'RUC', documentNumber: string) {
    const expectedLength = documentType === 'DNI' ? 8 : 11
    const digitsOnly = documentNumber.replace(/\D/g, '')
    if (digitsOnly.length !== expectedLength) {
      setCreateLookupMessage('')
      return
    }
    const lookupKey = `${documentType}:${digitsOnly}`
    if (createLookupKeyRef.current === lookupKey) return
    createLookupKeyRef.current = lookupKey
    setCreateLookupBusy(true)
    try {
      const data = await api.lookupClientDocument(documentType, digitsOnly)
      updateClient('fullName', data.fullName || '')
      if (data.address) updateClient('address', data.address)
      setCreateLookupMessage(data.fullName ? 'Datos cargados automáticamente desde Perú API.' : 'Documento válido sin nombre disponible.')
    } catch (err) {
      setCreateLookupMessage(err instanceof Error ? err.message : 'No se pudo consultar el documento.')
    } finally {
      setCreateLookupBusy(false)
    }
  }

  if (mode === 'create') {
    return (
      <section className="grid">
        <div className="panel">
          <h2>Registrar cliente</h2>
          <form onSubmit={submitClient}>
            <div className="form-grid">
              <label className="full">
                Nombre completo
                <input value={clientForm.fullName} onChange={(e) => updateClient('fullName', e.target.value)} required />
              </label>
              <label>
                Tipo documento
                <FancySelect
                  value={clientForm.documentType ?? 'DNI'}
                  onChange={(nextValue) => {
                    const nextType = nextValue as 'DNI' | 'RUC'
                    createLookupKeyRef.current = ''
                    setCreateLookupMessage('')
                    updateClient('documentType', nextType)
                    updateClient('documentNumber', '')
                  }}
                  options={[
                    { value: 'DNI', label: 'DNI' },
                    { value: 'RUC', label: 'RUC' },
                  ]}
                />
              </label>
              <label>
                {clientForm.documentType === 'RUC' ? 'Número de RUC' : 'Número de DNI'}
                <input
                  inputMode="numeric"
                  maxLength={clientForm.documentType === 'RUC' ? 11 : 8}
                  pattern={clientForm.documentType === 'RUC' ? '\\d{11}' : '\\d{8}'}
                  placeholder={clientForm.documentType === 'RUC' ? '11 dígitos' : '8 dígitos'}
                  value={clientForm.documentNumber}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, '')
                    updateClient('documentNumber', digitsOnly)
                    void tryAutoLookupCreateClient((clientForm.documentType ?? 'DNI') as 'DNI' | 'RUC', digitsOnly)
                  }}
                  required
                />
                {createLookupBusy && <small>Consultando RENIEC/SUNAT...</small>}
                {!createLookupBusy && createLookupMessage && <small>{createLookupMessage}</small>}
              </label>
              <label>
                Teléfono
                <input value={clientForm.phone} onChange={(e) => updateClient('phone', e.target.value)} required />
              </label>
              <label>
                WhatsApp
                <input value={clientForm.whatsapp} onChange={(e) => updateClient('whatsapp', e.target.value)} />
              </label>
              <label>
                Correo
                <input type="email" value={clientForm.email} onChange={(e) => updateClient('email', e.target.value)} />
              </label>
              <label className="full">
                Dirección
                <input value={clientForm.address} onChange={(e) => updateClient('address', e.target.value)} />
              </label>
              <label className="full">
                Observaciones
                <textarea value={clientForm.notes} onChange={(e) => updateClient('notes', e.target.value)} />
              </label>
            </div>
            <div className="form-actions">
              <button className="btn primary" type="submit">
                <Save size={17} />
                Guardar cliente
              </button>
            </div>
          </form>
        </div>
      </section>
    )
  }

  return (
    <section className="grid">
      <div className="panel">
        <h2>Clientes registrados</h2>
        {editingClientId && editingClientForm && (
          <div className="event-edit-box">
            <h3>Editando cliente</h3>
            <form onSubmit={submitEditingClient}>
              <div className="form-grid">
                <label className="full">
                  Nombre completo
                  <input
                    value={editingClientForm.fullName}
                    onChange={(e) => updateEditingClient('fullName', e.target.value)}
                    required
                  />
                </label>
                <label>
                  Tipo documento
                  <FancySelect
                    value={editingClientForm.documentType ?? 'DNI'}
                    onChange={(nextValue) => {
                      const nextType = nextValue as 'DNI' | 'RUC'
                      updateEditingClient('documentType', nextType)
                      updateEditingClient('documentNumber', '')
                    }}
                    options={[
                      { value: 'DNI', label: 'DNI' },
                      { value: 'RUC', label: 'RUC' },
                    ]}
                  />
                </label>
                <label>
                  {editingClientForm.documentType === 'RUC' ? 'Número de RUC' : 'Número de DNI'}
                  <input
                    inputMode="numeric"
                    maxLength={editingClientForm.documentType === 'RUC' ? 11 : 8}
                    pattern={editingClientForm.documentType === 'RUC' ? '\\d{11}' : '\\d{8}'}
                    value={editingClientForm.documentNumber}
                    onChange={(e) => updateEditingClient('documentNumber', e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </label>
                <label>
                  Teléfono
                  <input
                    value={editingClientForm.phone}
                    onChange={(e) => updateEditingClient('phone', e.target.value)}
                    required
                  />
                </label>
                <label>
                  WhatsApp
                  <input value={editingClientForm.whatsapp} onChange={(e) => updateEditingClient('whatsapp', e.target.value)} />
                </label>
                <label>
                  Correo
                  <input type="email" value={editingClientForm.email} onChange={(e) => updateEditingClient('email', e.target.value)} />
                </label>
              </div>
              <div className="form-actions">
                <button
                  className="btn ghost"
                  onClick={() => {
                    setEditingClientId(null)
                    setEditingClientForm(null)
                  }}
                  type="button"
                >
                  Cancelar
                </button>
                <button className="btn primary" disabled={editingBusy} type="submit">
                  <Save size={16} />
                  {editingBusy ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        )}
        <div className="item-list">
          {clients.length === 0 && <p className="empty">Registra el primer cliente para separar eventos.</p>}
          {clients.map((client) => (
            <article className="item-card" key={client.id}>
              <header>
                <strong>{client.fullName}</strong>
                <span>
                  {client.documentNumber ? `${client.documentType ?? 'DNI'}: ${client.documentNumber}` : 'Sin documento'}
                </span>
              </header>
              <p>
                {client.whatsapp || client.phone || 'Sin teléfono'} {client.email ? `- ${client.email}` : ''}
              </p>
              <div className="form-actions">
                <button className="btn icon" onClick={() => startEditingClient(client)} type="button">
                  Editar
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function PackagesView({ packages }: { packages: EventPackage[] }) {
  return (
    <section className="grid three">
      {packages.map((eventPackage) => (
        <article className="item-card" key={eventPackage.id}>
          <header>
            <strong>{eventPackage.name}</strong>
            <span>{money.format(eventPackage.basePrice)}</span>
          </header>
          <p>{eventPackage.includedServices}</p>
          <p>
            Capacidad: {eventPackage.includedCapacity ?? 'Por definir'} - Garantía:{' '}
            {money.format(eventPackage.guaranteeAmount ?? 0)}
          </p>
          <p>{eventPackage.terms}</p>
        </article>
      ))}
    </section>
  )
}

function FloorsView({ floors, summary }: { floors: Floor[]; summary: DashboardSummary | null }) {
  const maxFloorEvents = Math.max(1, ...(summary?.eventsByFloor.map((item) => item.eventCount) ?? [0]))

  return (
    <section className="grid three">
      {floors.map((floor) => {
        const metric = summary?.eventsByFloor.find((item) => item.floorName === floor.name)
        const eventCount = metric?.eventCount ?? 0
        return (
          <article className="item-card" key={floor.id}>
            <header>
              <strong>{floor.name}</strong>
              <span className={`status ${floor.status}`}>{floorStatusLabels[floor.status]}</span>
            </header>
            <p>{floor.description}</p>
            <p>
              Area: {floor.areaM2 ?? 'Por definir'} m2 - Capacidad: {floor.capacity ?? 'Por definir'}
            </p>
            <p>Eventos registrados: {eventCount}</p>
            <div className="usage-bar" aria-hidden="true">
              <span style={{ width: `${Math.max(8, (eventCount / maxFloorEvents) * 100)}%` }} />
            </div>
          </article>
        )
      })}
    </section>
  )
}

function InventoryView({
  floors,
  inventory,
  inventoryForm,
  updateInventory,
  submitInventory,
  removeInventoryItem,
}: {
  floors: Floor[]
  inventory: InventoryDashboard | null
  inventoryForm: InventoryPayload
  updateInventory: <K extends keyof InventoryPayload>(key: K, value: InventoryPayload[K]) => void
  submitInventory: (event: FormEvent) => Promise<void>
  removeInventoryItem: (item: InventoryItem) => Promise<void>
}) {
  const [floorFilter, setFloorFilter] = useState('ALL')
  const filteredItems = useMemo(
    () => {
      const items = inventory?.items ?? []
      return floorFilter === 'ALL' ? items : items.filter((item) => (item.floorId ?? 'NONE') === floorFilter)
    },
    [floorFilter, inventory],
  )
  const filteredValue = filteredItems.reduce((total, item) => total + Number(item.totalCost ?? 0), 0)
  const filteredQuantity = filteredItems.reduce((total, item) => total + Number(item.quantity ?? 0), 0)

  return (
    <section className="grid inventory-layout">
      <div className="panel">
        <h2>Registrar artículo del local</h2>
        <form onSubmit={submitInventory}>
          <div className="form-grid">
            <label>
              Ambiente
              <FancySelect
                value={inventoryForm.floorId ?? ''}
                onChange={(nextValue) => updateInventory('floorId', nextValue)}
                required
                options={floors.map((floor) => ({ value: floor.id, label: floor.name }))}
              />
            </label>
            <label>
              Categoria
              <FancySelect
                value={inventoryForm.category ?? ''}
                onChange={(nextValue) => updateInventory('category', nextValue)}
                options={[
                  { value: 'Mesas y sillas', label: 'Mesas y sillas' },
                  { value: 'Menaje', label: 'Menaje' },
                  { value: 'Decoracion', label: 'Decoracion' },
                  { value: 'Sonido e iluminacion', label: 'Sonido e iluminacion' },
                  { value: 'Cocina y bar', label: 'Cocina y bar' },
                  { value: 'Limpieza', label: 'Limpieza' },
                  { value: 'Seguridad', label: 'Seguridad' },
                  { value: 'Otro', label: 'Otro' },
                ]}
              />
            </label>
            <label className="full">
              Artículo
              <input
                value={inventoryForm.name}
                onChange={(event) => updateInventory('name', event.target.value)}
                placeholder="Ejemplo: Mesa redonda, silla Tiffany, parlante, mantel"
                required
              />
            </label>
            <label>
              Cantidad
              <input
                min="0"
                step="1"
                type="number"
                value={inventoryForm.quantity}
                onChange={(event) => updateInventory('quantity', Number(event.target.value))}
                required
              />
            </label>
            <label>
              Costo unitario
              <input
                min="0"
                step="0.01"
                type="number"
                value={inventoryForm.unitCost}
                onChange={(event) => updateInventory('unitCost', Number(event.target.value))}
                required
              />
            </label>
            <label>
              Stock minimo
              <input
                min="0"
                step="1"
                type="number"
                value={inventoryForm.minimumQuantity}
                onChange={(event) => updateInventory('minimumQuantity', Number(event.target.value))}
              />
            </label>
            <label>
              Estado
              <FancySelect
                value={inventoryForm.conditionStatus}
                onChange={(nextValue) => updateInventory('conditionStatus', nextValue as InventoryCondition)}
                options={Object.entries(inventoryConditionLabels).map(([value, label]) => ({ value, label }))}
              />
            </label>
            <label>
              Fecha de compra
              <DatePicker
                calendarClassName="fancy-datepicker"
                className="fancy-date-input"
                dateFormat="dd/MM/yyyy"
                locale="es"
                onChange={(date: Date | null) => updateInventory('purchaseDate', formatYmdDate(date))}
                placeholderText="Seleccionar fecha"
                selected={parseYmdDate(inventoryForm.purchaseDate ?? '')}
              />
            </label>
            <label>
              Ubicación específica
              <input
                value={inventoryForm.specificLocation}
                onChange={(event) => updateInventory('specificLocation', event.target.value)}
                placeholder="Deposito, salon principal, barra, cabina DJ"
              />
            </label>
            <label className="full">
              Observaciones
              <textarea
                value={inventoryForm.notes}
                onChange={(event) => updateInventory('notes', event.target.value)}
                placeholder="Marca, color, medidas, si está prestado, roto o pendiente de comprar."
              />
            </label>
          </div>
          <div className="inventory-form-total">
            Total valorizado de este registro:{' '}
            <strong>{money.format(Number(inventoryForm.quantity || 0) * Number(inventoryForm.unitCost || 0))}</strong>
          </div>
          <div className="form-actions">
            <button className="btn primary" type="submit">
              <Save size={17} />
              Guardar inventario
            </button>
          </div>
        </form>
      </div>

      <div className="panel">
        <h2>Resumen contable</h2>
        <section className="inventory-summary">
          <article>
            <span>Registros</span>
            <strong>{inventory?.summary.itemCount ?? 0}</strong>
          </article>
          <article>
            <span>Cantidad total</span>
            <strong>{inventory?.summary.totalQuantity ?? 0}</strong>
          </article>
          <article>
            <span>Valor total</span>
            <strong>{money.format(inventory?.summary.totalValue ?? 0)}</strong>
          </article>
        </section>

        <div className="item-list">
          {(inventory?.summary.byFloor ?? []).length === 0 && <p className="empty">Aún no hay inventario registrado.</p>}
          {inventory?.summary.byFloor.map((floor) => (
            <article className="item-card" key={floor.floorId ?? floor.floorName}>
              <header>
                <strong>{floor.floorName}</strong>
                <span>{money.format(floor.totalValue)}</span>
              </header>
              <p>
                {floor.itemCount} registros - {floor.totalQuantity} unidades
              </p>
            </article>
          ))}
        </div>
      </div>

      <div className="panel inventory-table-panel">
        <div className="panel-header-row">
          <h2>Inventario registrado</h2>
          <label className="compact-filter">
            Piso
            <FancySelect
              value={floorFilter}
              onChange={(nextValue) => setFloorFilter(nextValue)}
              options={[{ value: 'ALL', label: 'Todos' }, ...floors.map((floor) => ({ value: floor.id, label: floor.name }))]}
            />
          </label>
        </div>
        <div className="inventory-filter-total">
          Vista actual: {filteredItems.length} registros, {filteredQuantity} unidades,{' '}
          <strong>{money.format(filteredValue)}</strong>
        </div>
        <InventoryTable items={filteredItems} removeInventoryItem={removeInventoryItem} />
      </div>
    </section>
  )
}

function InventoryTable({
  items,
  removeInventoryItem,
}: {
  items: InventoryItem[]
  removeInventoryItem: (item: InventoryItem) => Promise<void>
}) {
  if (items.length === 0) {
    return <p className="empty">No hay artículos en este filtro.</p>
  }

  return (
    <>
      <div className="table-wrap desktop-table">
        <table>
          <thead>
            <tr>
              <th>Artículo</th>
              <th>Piso</th>
              <th>Ubicación</th>
              <th>Cantidad</th>
              <th>Costo unit.</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.name}</strong>
                  <br />
                  <small>{item.category || 'Sin categoria'}</small>
                </td>
                <td>{item.floorName}</td>
                <td>{item.specificLocation || '-'}</td>
                <td>
                  {item.quantity}
                  {item.quantity <= item.minimumQuantity && item.minimumQuantity > 0 && (
                    <>
                      <br />
                      <small className="warning-text">Revisar stock</small>
                    </>
                  )}
                </td>
                <td>{money.format(item.unitCost)}</td>
                <td>{money.format(item.totalCost)}</td>
                <td>
                  <span className={`status inventory ${item.conditionStatus}`}>
                    {inventoryConditionLabels[item.conditionStatus]}
                  </span>
                </td>
                <td className="actions-cell">
                  <button
                    className="btn icon danger"
                    onClick={() => void removeInventoryItem(item)}
                    title="Retirar del inventario activo"
                    type="button"
                  >
                    <Trash2 size={16} />
                    Quitar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mobile-event-list">
        {items.map((item) => (
          <article className="mobile-event-card" key={item.id}>
            <header>
              <div>
                <strong>{item.name}</strong>
                <span>{item.category || 'Sin categoria'}</span>
              </div>
              <span className={`status inventory ${item.conditionStatus}`}>
                {inventoryConditionLabels[item.conditionStatus]}
              </span>
            </header>
            <dl>
              <div>
                <dt>Piso</dt>
                <dd>{item.floorName}</dd>
              </div>
              <div>
                <dt>Cantidad</dt>
                <dd>{item.quantity}</dd>
              </div>
              <div>
                <dt>Costo unit.</dt>
                <dd>{money.format(item.unitCost)}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>{money.format(item.totalCost)}</dd>
              </div>
            </dl>
            <p>{item.specificLocation || 'Sin ubicación específica'}</p>
            <div className="mobile-card-actions">
              <button
                className="btn icon danger"
                onClick={() => void removeInventoryItem(item)}
                title="Retirar del inventario activo"
                type="button"
              >
                <Trash2 size={16} />
                Quitar
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}

function AiView({
  aiMode,
  setAiMode,
  aiPrompt,
  setAiPrompt,
  aiResult,
  aiLoading,
  runAi,
}: {
  aiMode: AiMode
  setAiMode: (mode: AiMode) => void
  aiPrompt: string
  setAiPrompt: (value: string) => void
  aiResult: AiResponse | null
  aiLoading: boolean
  runAi: () => Promise<void>
}) {
  const modes: Array<{ id: AiMode; label: string }> = [
    { id: 'contract', label: 'Contrato' },
    { id: 'summary', label: 'Resumen' },
    { id: 'marketing', label: 'Marketing' },
    { id: 'balance', label: 'Balance' },
  ]

  return (
    <section className="grid two">
      <div className="panel">
        <h2>Asistente IA</h2>
        <div className="tabs">
          {modes.map((mode) => (
            <button
              className={`tab ${aiMode === mode.id ? 'active' : ''}`}
              key={mode.id}
              onClick={() => setAiMode(mode.id)}
              type="button"
            >
              {mode.label}
            </button>
          ))}
        </div>
        <label>
          Contexto
          <textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} />
        </label>
        <div className="form-actions">
          <button className="btn primary" disabled={aiLoading} onClick={runAi} type="button">
            <Sparkles size={17} />
            {aiLoading ? 'Procesando...' : 'Generar'}
          </button>
        </div>
      </div>
      <div className="panel">
        <h2>Resultado</h2>
        <div className="ai-output">
          {aiResult?.result ??
            'La IA está conectada al backend. Si AI_ENABLED=false, el sistema responderá con aviso de configuración.'}
        </div>
      </div>
    </section>
  )
}

export default App
