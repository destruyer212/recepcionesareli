import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, PointerEvent as ReactPointerEvent } from 'react'
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
import { WorkersView } from './components/Workers/WorkersView'
import type {
  Client,
  ClientPayload,
  ContractPreview,
  DashboardSummary,
  ApdaycPayer,
  ApdaycStatus,
  EventStaffAssignment,
  EventStaffRoleKey,
  EventItem,
  EventPackage,
  EventPayload,
  EventStatus,
  Floor,
  FloorStatus,
  InventoryDashboard,
  InventoryItem,
  InventoryPayload,
  InventoryStatus,
  RescheduleOptions,
  StaffAvailability,
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
  | 'inventoryCreate'
  | 'workers'
  | 'workersCreate'
  | 'ai'
  | 'settings'
type NavIcon = typeof LayoutDashboard
type NavItem = { id: View; label: string; shortLabel?: string; icon: NavIcon }
type NavSection = { title: string; items: NavItem[] }
type EventSortMode = 'recent' | 'upcoming'
const VIEW_STORAGE_KEY = 'areli-active-view'
const MANUAL_LOOKUP_FALLBACK_MESSAGE =
  'No se pudo obtener los datos automáticamente. Puedes completar el nombre manualmente y guardar el cliente.'

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
      <input
        aria-hidden="true"
        className="fancy-select-native"
        disabled={disabled}
        readOnly
        required={required}
        tabIndex={-1}
        type="text"
        value={value}
      />
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

function blurActiveEditableElement() {
  const activeElement = document.activeElement
  if (!(activeElement instanceof HTMLElement)) return
  if (activeElement.matches('input, textarea, select, [contenteditable="true"]')) {
    activeElement.blur()
  }
}

function clientOptionLabel(client: Client) {
  return `${client.fullName}${client.documentNumber ? ` - ${client.documentNumber}` : ''}`
}

function getVisualViewportMetrics() {
  const vv = window.visualViewport
  if (!vv) {
    return {
      height: window.innerHeight,
      offsetTop: 0,
      keyboardOffset: 0,
    }
  }
  const keyboardOffset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
  return {
    height: vv.height,
    offsetTop: vv.offsetTop,
    keyboardOffset,
  }
}

/** Scroll explícito del body del modal: iOS no respeta bien scrollIntoView con ancestros overflow-hidden. */
function scrollFocusedIntoModalBody(scrollBody: HTMLElement, focused: HTMLElement) {
  if (!scrollBody.contains(focused)) return
  const bodyRect = scrollBody.getBoundingClientRect()
  const closestLabel = focused.closest('label')
  const field = closestLabel instanceof HTMLElement ? closestLabel : focused
  const fieldRect = field.getBoundingClientRect()
  const safeTop = bodyRect.top + 14
  const safeBottom = bodyRect.bottom - 22
  if (fieldRect.top >= safeTop && fieldRect.bottom <= safeBottom) return

  const centeredOffset = (bodyRect.height - fieldRect.height) / 2
  const nextScrollTop = scrollBody.scrollTop + fieldRect.top - bodyRect.top - Math.max(18, centeredOffset)
  scrollBody.scrollTo({ top: Math.max(0, nextScrollTop), behavior: 'auto' })
}

function useMobileModalBehavior(isOpen: boolean) {
  const modalRef = useRef<HTMLDivElement | null>(null)
  const modalBodyRef = useRef<HTMLDivElement | null>(null)
  const lastFocusedElementRef = useRef<HTMLElement | null>(null)
  const scrollTimerRef = useRef<number | null>(null)
  const followUpTimerRef = useRef<number | null>(null)
  const scrollTimersRef = useRef<number[]>([])
  const lastViewportHeightRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const modalRoot = modalRef.current
    if (!modalRoot) return
    const modalEl: HTMLDivElement = modalRoot

    function getScrollBody(): HTMLElement | null {
      return modalBodyRef.current ?? modalEl.querySelector<HTMLElement>('.modal-2026-body')
    }

    function runScrollIntoBody() {
      const scrollBody = getScrollBody()
      const target = lastFocusedElementRef.current
      if (!scrollBody || !target?.isConnected) return
      if (!modalEl.contains(target)) return
      scrollFocusedIntoModalBody(scrollBody, target)
    }

    function scheduleScrollFocused(element: HTMLElement, delayMs: number) {
      lastFocusedElementRef.current = element
      if (scrollTimerRef.current != null) window.clearTimeout(scrollTimerRef.current)
      if (followUpTimerRef.current != null) window.clearTimeout(followUpTimerRef.current)
      scrollTimersRef.current.forEach((timer) => window.clearTimeout(timer))
      scrollTimersRef.current = [delayMs, delayMs + 120, delayMs + 260, delayMs + 480].map((delay) =>
        window.setTimeout(() => {
          window.requestAnimationFrame(() => {
            runScrollIntoBody()
            window.requestAnimationFrame(runScrollIntoBody)
          })
        }, delay),
      )
    }

    function bringFocusedFieldIntoView(event: FocusEvent) {
      const target = event.target as HTMLElement | null
      if (!target) return
      if (!modalEl.contains(target)) return
      const isNativeField = target.matches('input, textarea, select, [contenteditable="true"]')
      const isFancySelectTrigger = target.matches('button.fancy-select-trigger')
      if (!isNativeField && !isFancySelectTrigger) return
      scheduleScrollFocused(target, 90)
    }

    function keepActiveFieldVisible(event: Event) {
      const target = event.target as HTMLElement | null
      if (!target || !modalEl.contains(target)) return
      const active = document.activeElement
      if (active instanceof HTMLElement && modalEl.contains(active)) {
        scheduleScrollFocused(active, 80)
      }
    }

    function handleViewportResize() {
      const { height: viewportHeight, offsetTop, keyboardOffset } = getVisualViewportMetrics()
      const innerH = window.innerHeight
      const keyboardLikely = innerH - viewportHeight > 110 || offsetTop > 48

      document.documentElement.style.setProperty('--app-viewport-height', `${viewportHeight}px`)
      document.documentElement.style.setProperty('--app-viewport-offset-top', `${offsetTop}px`)
      modalEl.style.setProperty('--vvh', `${viewportHeight}px`)
      modalEl.style.setProperty('--vv-offset-top', `${offsetTop}px`)
      modalEl.style.setProperty('--kb-offset', `${keyboardOffset}px`)
      modalEl.setAttribute('data-keyboard-open', keyboardLikely ? 'true' : 'false')

      const previousHeight = lastViewportHeightRef.current
      lastViewportHeightRef.current = viewportHeight
      const focused = lastFocusedElementRef.current
      if (focused && previousHeight != null) {
        const delta = Math.abs(viewportHeight - previousHeight)
        if (delta > 48) {
          window.requestAnimationFrame(() => {
            runScrollIntoBody()
            window.requestAnimationFrame(runScrollIntoBody)
          })
        }
      }
    }

    function preventBackgroundTouch(event: TouchEvent) {
      const scrollBody = getScrollBody()
      const target = event.target as Node | null
      if (scrollBody && target && scrollBody.contains(target)) return
      event.preventDefault()
    }

    const scrollY = window.scrollY
    const previousBodyOverflow = document.body.style.overflow
    const previousBodyOverscroll = document.body.style.overscrollBehaviorY
    const previousBodyPosition = document.body.style.position
    const previousBodyTop = document.body.style.top
    const previousBodyLeft = document.body.style.left
    const previousBodyRight = document.body.style.right
    const previousBodyWidth = document.body.style.width
    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehaviorY
    document.documentElement.classList.add('modal-scroll-locked')
    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehaviorY = 'none'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.width = '100%'
    document.documentElement.style.overflow = 'hidden'
    document.documentElement.style.overscrollBehaviorY = 'none'
    modalEl.addEventListener('focusin', bringFocusedFieldIntoView)
    modalEl.addEventListener('input', keepActiveFieldVisible)
    modalEl.addEventListener('change', keepActiveFieldVisible)
    document.addEventListener('touchmove', preventBackgroundTouch, { passive: false })
    window.visualViewport?.addEventListener('resize', handleViewportResize)
    window.visualViewport?.addEventListener('scroll', handleViewportResize)
    window.addEventListener('resize', handleViewportResize)
    handleViewportResize()

    return () => {
      modalEl.removeEventListener('focusin', bringFocusedFieldIntoView)
      modalEl.removeEventListener('input', keepActiveFieldVisible)
      modalEl.removeEventListener('change', keepActiveFieldVisible)
      document.removeEventListener('touchmove', preventBackgroundTouch)
      window.visualViewport?.removeEventListener('resize', handleViewportResize)
      window.visualViewport?.removeEventListener('scroll', handleViewportResize)
      window.removeEventListener('resize', handleViewportResize)
      if (scrollTimerRef.current != null) window.clearTimeout(scrollTimerRef.current)
      if (followUpTimerRef.current != null) window.clearTimeout(followUpTimerRef.current)
      scrollTimersRef.current.forEach((timer) => window.clearTimeout(timer))
      scrollTimersRef.current = []
      document.documentElement.classList.remove('modal-scroll-locked')
      document.body.style.overflow = previousBodyOverflow
      document.body.style.overscrollBehaviorY = previousBodyOverscroll
      document.body.style.position = previousBodyPosition
      document.body.style.top = previousBodyTop
      document.body.style.left = previousBodyLeft
      document.body.style.right = previousBodyRight
      document.body.style.width = previousBodyWidth
      document.documentElement.style.overflow = previousHtmlOverflow
      document.documentElement.style.overscrollBehaviorY = previousHtmlOverscroll
      document.documentElement.style.removeProperty('--app-viewport-height')
      document.documentElement.style.removeProperty('--app-viewport-offset-top')
      modalEl.removeAttribute('data-keyboard-open')
      modalEl.style.removeProperty('--kb-offset')
      modalEl.style.removeProperty('--vvh')
      modalEl.style.removeProperty('--vv-offset-top')
      window.scrollTo(0, scrollY)
    }
  }, [isOpen])

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null
    if (!target?.closest('input, textarea, select, [contenteditable="true"]')) {
      blurActiveEditableElement()
    }
  }

  return { modalRef, modalBodyRef, handlePointerDown }
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
      <input
        aria-hidden="true"
        className="time-picker-native-proxy"
        readOnly
        required={required}
        tabIndex={-1}
        type="text"
        value={value}
      />
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
  piso: '1er piso',
  categoriaId: '',
  subcategoriaId: '',
  nombre: '',
  descripcion: '',
  cantidad: 1,
  unidadMedida: 'unidad',
  valorTotal: 0,
  estado: 'Disponible',
  ubicacion: '',
  observacion: '',
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

const createdAtDate = new Intl.DateTimeFormat('es-PE', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const createdAtTime = new Intl.DateTimeFormat('es-PE', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

/** Hora corta 24 h para filas compactas (evita partir "p. m." en la tabla). */
const createdAtTime24h = new Intl.DateTimeFormat('es-PE', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
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

function createdLabel(value?: string) {
  if (!value) return 'Fecha de creación no disponible'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Fecha de creación no disponible'
  return `Creado el ${createdAtDate.format(parsed)}, ${createdAtTime.format(parsed)}`
}

/** Fecha del evento DD/MM/AAAA para tablas densas (laptop ~14"). */
function formatEventDateNumeric(isoKey: string) {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parseDateKey(isoKey))
}

function createdCompactForTable(value?: string) {
  if (!value) return 'Sin fecha de registro'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha de registro'
  const numericDate = new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed)
  return `Reg. ${numericDate} · ${createdAtTime24h.format(parsed)}`
}

function monthHintFromDateKey(value: string) {
  const parts = value.split('-')
  if (parts.length < 2) return ''
  const monthNumber = Number(parts[1])
  if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) return ''
  const monthName = new Intl.DateTimeFormat('es-PE', { month: 'long' }).format(new Date(2026, monthNumber - 1, 1)).toUpperCase()
  return monthName
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

function canonicalInventoryPiso(value?: string | null) {
  const raw = value?.trim()
  if (!raw) return ''
  const normalized = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (normalized.includes('1er') || normalized.includes('piso 1') || normalized.includes('primer piso')) {
    return '1er piso'
  }
  if (normalized.includes('2do') || normalized.includes('piso 2') || normalized.includes('segundo piso')) {
    return '2do piso'
  }
  if (
    normalized.includes('3er') ||
    normalized.includes('4to') ||
    normalized.includes('3 y 4') ||
    normalized.includes('3ro') ||
    normalized.includes('cuarto piso')
  ) {
    return '3er y 4to piso'
  }
  return raw
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

type EventCancellationType = 'CLIENT_REQUEST' | 'FORCE_MAJEURE' | 'NO_SHOW' | 'RESCHEDULE_REQUEST_REJECTED'

const eventCancellationTypes: EventCancellationType[] = [
  'CLIENT_REQUEST',
  'FORCE_MAJEURE',
  'NO_SHOW',
  'RESCHEDULE_REQUEST_REJECTED',
]

const eventCancellationTypeLabels: Record<EventCancellationType, string> = {
  CLIENT_REQUEST: 'Solicitud del cliente',
  FORCE_MAJEURE: 'Fuerza mayor o caso fortuito',
  NO_SHOW: 'Inasistencia (no show)',
  RESCHEDULE_REQUEST_REJECTED: 'Solicitud de reprogramación rechazada',
}

type EventStaffRoleConfig = {
  id: EventStaffRoleKey
  label: string
  hint: string
  multi?: boolean
}

const eventStaffRoles: EventStaffRoleConfig[] = [
  { id: 'EVENT_PLANNER', label: 'Event Planner', hint: 'Plan general, proveedores y cronograma.' },
  { id: 'COORDINADOR_EVENTO', label: 'Coordinador del Evento', hint: 'Responsable operativo durante el evento.' },
  { id: 'DJ', label: 'DJ', hint: 'MÃºsica, cabina y momentos especiales.' },
  { id: 'FOTOGRAFO', label: 'FotÃ³grafo', hint: 'Registro fotogrÃ¡fico del evento.' },
  { id: 'VIDEOGRAFO', label: 'VideÃ³grafo', hint: 'Video, reels, tomas y entrega final.' },
  { id: 'SEGURIDAD', label: 'Seguridad', hint: 'Control de ingreso y orden.' },
  { id: 'ANFITRIONA', label: 'Anfitriona', hint: 'RecepciÃ³n e indicaciones a invitados.' },
  { id: 'MOZOS', label: 'Mozos', hint: 'Sub lista numerada: Mozo 1, Mozo 2, Mozo 3 y los que necesites.', multi: true },
  { id: 'BARMAN', label: 'Barman', hint: 'Bar, bebidas y servicio de cocteles.' },
  { id: 'HORA_LOCA', label: 'Hora Loca', hint: 'Show, animaciÃ³n y accesorios.' },
  { id: 'DECORACION', label: 'Personal de DecoraciÃ³n', hint: 'Montaje, estilo y detalles visuales.' },
  { id: 'BOCADITOS', label: 'Personal de Bocaditos', hint: 'Mesa dulce, salados y atenciÃ³n.' },
  { id: 'COCINA', label: 'Personal de Cocina', hint: 'PreparaciÃ³n, apoyo y salida de platos.' },
  { id: 'LIMPIEZA', label: 'Personal de Limpieza', hint: 'Orden antes, durante y cierre.' },
  { id: 'APOYO', label: 'Personal de Apoyo', hint: 'Refuerzos para tareas generales.' },
]

function mozoSlotLabel(slot?: number) {
  return slot && slot > 0 ? `Mozo ${slot}` : 'Mozo'
}

function eventStaffRoleLabel(roleKey: EventStaffRoleKey, slot?: number) {
  if (roleKey === 'MOZOS') return mozoSlotLabel(slot)
  return eventStaffRoles.find((role) => role.id === roleKey)?.label ?? roleKey
}

function staffAvailabilityLabel(item: StaffAvailability) {
  const phone = item.staffPhone ? ` - ${item.staffPhone}` : ''
  if (item.available) return `${item.staffName}${phone}`
  const conflict = item.conflictEventTitle
    ? ` (${item.conflictEventTitle}, ${item.conflictEventDate ?? ''} ${shortTime(item.conflictStartTime ?? '')}-${shortTime(item.conflictEndTime ?? '')})`
    : ''
  return `${item.staffName}${phone} - ${item.reason ?? 'No disponible'}${conflict}`
}

const inventoryStatusLabels: Record<InventoryStatus, string> = {
  Disponible: 'Disponible',
  'En uso': 'En uso',
  Mantenimiento: 'Mantenimiento',
  Dañado: 'Dañado',
  Perdido: 'Perdido',
  Retirado: 'Retirado',
}

const inventoryStatusClassNames: Record<InventoryStatus, string> = {
  Disponible: 'status-available',
  'En uso': 'status-in-use',
  Mantenimiento: 'status-maintenance',
  Dañado: 'status-damaged',
  Perdido: 'status-lost',
  Retirado: 'status-retired',
}

const quantityFormatter = new Intl.NumberFormat('es-PE', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
})

function formatQuantity(value: number): string {
  return quantityFormatter.format(Number(value || 0))
}

function inventoryStatusClass(status: InventoryStatus): string {
  return inventoryStatusClassNames[status] ?? 'status-available'
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
      'inventoryCreate',
      'workers',
      'workersCreate',
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
          const firstInventoryCategory = inventoryData.categories[0]
          const firstInventorySubcategory = firstInventoryCategory?.subcategorias[0]
          setEventForm((current) => ({
            ...current,
            clientId: current.clientId || clientList[0]?.id || '',
            packageId: current.packageId || packageList[0]?.id || '',
            totalAmount: current.totalAmount || Number(packageList[0]?.basePrice ?? 0),
          }))
          setInventoryForm((current) => ({
            ...current,
            piso: canonicalInventoryPiso(current.piso || floorList[0]?.name || '1er piso'),
            categoriaId: current.categoriaId || firstInventoryCategory?.id || '',
            subcategoriaId: current.subcategoriaId || firstInventorySubcategory?.id || '',
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

  useEffect(() => {
    if (!message) return
    const timeoutId = window.setTimeout(() => setMessage(''), 3200)
    return () => window.clearTimeout(timeoutId)
  }, [message])

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
      if (!selectedClient) {
        setError('Selecciona un cliente de la lista antes de guardar la reserva.')
        setView('events')
        return
      }
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
      setView('eventsRegistered')
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
        piso: canonicalInventoryPiso(inventoryForm.piso),
        descripcion: inventoryForm.descripcion || undefined,
        cantidad: Number(inventoryForm.cantidad),
        valorTotal: Number(inventoryForm.valorTotal),
        ubicacion: inventoryForm.ubicacion || undefined,
        observacion: inventoryForm.observacion || undefined,
      })
      setInventoryForm((current) => ({
        ...emptyInventoryItem,
        piso: canonicalInventoryPiso(current.piso),
        categoriaId: current.categoriaId,
        subcategoriaId: current.subcategoriaId,
      }))
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
    const confirmed = window.confirm(`Quitar "${item.nombre}" del inventario activo?`)
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

  const navSections: NavSection[] = [
    {
      title: 'Operación',
      items: [
        { id: 'dashboard', label: 'Dashboard', shortLabel: 'Inicio', icon: LayoutDashboard },
        { id: 'events', label: 'Crear evento', shortLabel: 'Crear', icon: CalendarDays },
        { id: 'eventsRegistered', label: 'Eventos registrados', shortLabel: 'Eventos', icon: ClipboardList },
      ],
    },
    {
      title: 'Clientes',
      items: [
        { id: 'clientsCreate', label: 'Registrar cliente', shortLabel: 'Reg. cliente', icon: Users },
        { id: 'clientsRegistered', label: 'Clientes registrados', shortLabel: 'Clientes', icon: Users },
      ],
    },
    {
      title: 'Catálogo',
      items: [
        { id: 'packages', label: 'Paquetes', shortLabel: 'Paquetes', icon: Package },
        { id: 'floors', label: 'Ambientes', shortLabel: 'Ambientes', icon: Building2 },
      ],
    },
    {
      title: 'Inventario y equipo',
      items: [
        { id: 'inventory', label: 'Inventario', shortLabel: 'Inventario', icon: ClipboardList },
        { id: 'inventoryCreate', label: 'Registrar artículos', shortLabel: 'Reg. art.', icon: Plus },
        { id: 'workers', label: 'Trabajadores registrados', shortLabel: 'Equipo', icon: Users },
        { id: 'workersCreate', label: 'Registrar trabajador', shortLabel: 'Reg. trab.', icon: Plus },
      ],
    },
    {
      title: 'Sistema',
      items: [
        { id: 'ai', label: 'IA', shortLabel: 'IA', icon: Bot },
        { id: 'settings', label: 'Configuración', shortLabel: 'Config.', icon: Settings },
      ],
    },
  ]
  const mobileCommandNav = navSections.flatMap((section) => section.items)

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
          {navSections.map((section) => (
            <div className="nav-section" key={section.title}>
              <p className="nav-section-title">{section.title}</p>
              {section.items.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    aria-current={view === item.id ? 'page' : undefined}
                    className={`nav-button ${view === item.id ? 'active' : ''}`}
                    key={item.id}
                    onClick={() => handleViewChange(item.id)}
                    type="button"
                  >
                    <Icon size={18} />
                    <span className="nav-label">{item.label}</span>
                  </button>
                )
              })}
            </div>
          ))}
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
          <nav className="mobile-command-nav" aria-label="Accesos rápidos del sistema">
            {mobileCommandNav.map((item) => {
              const Icon = item.icon
              return (
                <button
                  className={`mobile-command-tab ${view === item.id ? 'active' : ''}`}
                  key={item.id}
                  onClick={() => handleViewChange(item.id)}
                  type="button"
                >
                  <Icon size={17} />
                  <span>{item.shortLabel ?? item.label}</span>
                </button>
              )
            })}
          </nav>
        </header>

        {error && <p className="message error">{error}</p>}
        {message && (
          <div aria-live="polite" className="floating-toast" role="status">
            {message}
          </div>
        )}
        {loading && <p className="empty">Cargando datos desde el servidor…</p>}

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
        {!loading && view === 'workers' && <WorkersView mode="registered" />}
        {!loading && view === 'workersCreate' && <WorkersView mode="create" />}
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
            mode="list"
            updateInventory={updateInventory}
            submitInventory={submitInventory}
            removeInventoryItem={removeInventoryItem}
          />
        )}
        {!loading && view === 'inventoryCreate' && (
          <InventoryView
            floors={floors}
            inventory={inventory}
            inventoryForm={inventoryForm}
            mode="create"
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
    inventory: 'Inventario',
    inventoryCreate: 'Registrar artículos',
    workers: 'Trabajadores registrados',
    workersCreate: 'Registrar trabajador',
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
    <section className="grid settings-layout">
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
    } catch {
      alert('No se pudo descargar el contrato. Intente nuevamente.')
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
              {downloadingId === event.id ? 'Preparando PDF...' : 'Descargar contrato PDF'}
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
                          {dayEvents.length > 0 && (
                            <span className="desktop-month-event-list" aria-hidden="true">
                              {dayEvents.slice(0, 3).map((event) => (
                                <span className={`desktop-month-event-name ${event.status}`} key={event.id}>
                                  <span>{shortTime(event.startTime)}</span>
                                  <strong>{event.title}</strong>
                                </span>
                              ))}
                              {dayEvents.length > 3 && <span className="desktop-month-more">+{dayEvents.length - 3} eventos</span>}
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
                          {downloadingId === event.id ? 'Preparando PDF...' : 'Descargar contrato PDF'}
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
                  {downloadingId === quickViewEvent.id ? 'Preparando PDF...' : 'Descargar contrato PDF'}
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
  const [isClientResultsOpen, setIsClientResultsOpen] = useState(false)
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false)
  const [quickClientSaving, setQuickClientSaving] = useState(false)
  const [quickLookupBusy, setQuickLookupBusy] = useState(false)
  const [quickLookupMessage, setQuickLookupMessage] = useState('')
  const [quickClientError, setQuickClientError] = useState('')
  const quickLookupKeyRef = useRef('')
  const clientSearchInputRef = useRef<HTMLInputElement | null>(null)
  const suppressQuickClientOpenUntilRef = useRef(0)
  /** Tras elegir cliente: evita tap-through / ghost click en el FancySelect de Ambiente (móvil). */
  const suppressFloorSelectInteractionUntilRef = useRef(0)
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
  const quickClientModal = useMobileModalBehavior(isQuickClientOpen)
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
  const selectedClient = clients.find((client) => client.id === eventForm.clientId)
  const visibleClientSuggestions = filteredClients.slice(0, 8)

  function updateClientSearch(nextValue: string) {
    setClientSearch(nextValue)
    setIsClientResultsOpen(true)
    if (selectedClient && nextValue.trim() !== clientOptionLabel(selectedClient)) {
      updateEvent('clientId', '')
    }
  }

  function selectClient(client: Client) {
    suppressQuickClientOpenUntilRef.current = Date.now() + 600
    suppressFloorSelectInteractionUntilRef.current = Date.now() + 420
    updateEvent('clientId', client.id)
    setClientSearch(clientOptionLabel(client))
    // Cerrar la lista un instante después: si se desmonta en el mismo ciclo que el toque,
    // el “click” fantasma puede caer sobre el campo que subió (p. ej. Ambiente).
    window.setTimeout(() => {
      setIsClientResultsOpen(false)
      blurActiveEditableElement()
    }, 80)
  }

  function eatEventIfFloorSelectSuppressed(event: React.SyntheticEvent) {
    if (Date.now() < suppressFloorSelectInteractionUntilRef.current) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  function openQuickClientModal() {
    if (Date.now() < suppressQuickClientOpenUntilRef.current) return
    setIsQuickClientOpen(true)
  }

  function clearSelectedClient() {
    updateEvent('clientId', '')
    setClientSearch('')
    setIsClientResultsOpen(false)
    window.setTimeout(() => clientSearchInputRef.current?.focus(), 0)
  }

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
        fullName: current.fullName || data.fullName || '',
        address: current.address || data.address || '',
      }))
      setQuickLookupMessage(data.fullName ? 'Datos cargados automáticamente desde Perú API.' : MANUAL_LOOKUP_FALLBACK_MESSAGE)
    } catch {
      setQuickLookupMessage(MANUAL_LOOKUP_FALLBACK_MESSAGE)
    } finally {
      setQuickLookupBusy(false)
    }
  }

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
              <div className="client-autocomplete">
                <div className="client-search-box">
                  <input
                    className="quick-client-search"
                    placeholder="Buscar cliente por nombre, DNI/RUC o teléfono"
                    ref={clientSearchInputRef}
                    value={clientSearch}
                    onBlur={(event) => {
                      const next = event.relatedTarget as Node | null
                      if (next && event.currentTarget.closest('.client-autocomplete')?.querySelector('.client-suggestions')?.contains(next)) {
                        return
                      }
                      window.setTimeout(() => setIsClientResultsOpen(false), 160)
                    }}
                    onChange={(e) => updateClientSearch(e.target.value)}
                    onFocus={() => setIsClientResultsOpen(true)}
                  />
                  {(clientSearch || eventForm.clientId) && (
                    <button
                      aria-label="Limpiar cliente"
                      className="client-search-clear"
                      onPointerDown={(event) => event.preventDefault()}
                      onClick={clearSelectedClient}
                      type="button"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                {isClientResultsOpen && clientSearch.trim() && (
                  <div className="client-suggestions" role="listbox">
                    {visibleClientSuggestions.length > 0 ? (
                      visibleClientSuggestions.map((client) => (
                        <button
                          className={`client-suggestion ${client.id === eventForm.clientId ? 'active' : ''}`}
                          key={client.id}
                          onPointerDown={(event) => {
                            // No preventDefault aquí: en iOS puede bloquear el click sintético.
                            event.stopPropagation()
                          }}
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            selectClient(client)
                          }}
                          type="button"
                        >
                          <strong>{client.fullName}</strong>
                          <span>
                            {[client.documentNumber, client.phone || client.whatsapp].filter(Boolean).join(' - ') || 'Sin documento'}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="client-suggestion-empty">No hay clientes con ese dato.</div>
                    )}
                  </div>
                )}
              </div>
              <div className="quick-client-field">
                <button className="btn icon" onClick={openQuickClientModal} type="button">
                  <Plus size={15} />
                  Nuevo cliente
                </button>
              </div>
            </label>
            <label>
              Ambiente
              <div
                className="event-create-floor-select-shield"
                onClickCapture={eatEventIfFloorSelectSuppressed}
                onPointerDownCapture={eatEventIfFloorSelectSuppressed}
                onPointerUpCapture={eatEventIfFloorSelectSuppressed}
              >
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
              </div>
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
            ref={quickClientModal.modalRef}
            onPointerDownCapture={quickClientModal.handlePointerDown}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="quick-modal-head modal-2026-head">
              <h3>Crear cliente rápido</h3>
              <button className="btn icon modal-close-btn" onClick={() => setIsQuickClientOpen(false)} type="button">
                <X size={15} />
                Cerrar
              </button>
            </div>
            <form className="modal-2026-form quick-client-modal-form" onSubmit={submitQuickClient}>
              <div className="modal-2026-body" ref={quickClientModal.modalBodyRef}>
                {quickClientError && <p className="message error">{quickClientError}</p>}
                <div className="form-grid">
                  <label className="full">
                    {quickClientForm.documentType === 'RUC' ? 'Razón social o nombre del cliente' : 'Nombre completo'}
                    <input
                      placeholder={quickClientForm.documentType === 'RUC' ? 'Razón social o nombre comercial' : 'Nombre completo del cliente'}
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
                    {quickLookupBusy && <small className="lookup-message">Consultando RENIEC/SUNAT...</small>}
                    {!quickLookupBusy && quickLookupMessage && <small className="lookup-message">{quickLookupMessage}</small>}
                  </label>
                  <label>
                    Teléfono
                    <input
                      inputMode="tel"
                      value={quickClientForm.phone}
                      onChange={(e) => setQuickClientForm((current) => ({ ...current, phone: e.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    WhatsApp
                    <input
                      inputMode="tel"
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
  const [sortMode, setSortMode] = useState<EventSortMode>('recent')
  const [cancelTarget, setCancelTarget] = useState<EventItem | null>(null)
  const [cancelCancellationType, setCancelCancellationType] = useState<EventCancellationType>('CLIENT_REQUEST')
  const [cancelNotes, setCancelNotes] = useState('')
  const [staffAssignmentTarget, setStaffAssignmentTarget] = useState<EventItem | null>(null)
  const cancelModal = useMobileModalBehavior(Boolean(cancelTarget))
  const todayKey = dateKey(new Date())
  const visibleEvents = useMemo(() => {
    const sorted = [...events]
    if (sortMode === 'upcoming') {
      return sorted
        .filter((event) => event.status !== 'CANCELLED')
        .sort((a, b) => `${a.eventDate}${a.startTime}`.localeCompare(`${b.eventDate}${b.startTime}`))
    }
    return sorted.sort((a, b) => {
      const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0
      if (aCreated !== bCreated) return bCreated - aCreated
      return `${b.eventDate}${b.startTime}`.localeCompare(`${a.eventDate}${a.startTime}`)
    })
  }, [events, sortMode, todayKey])

  async function downloadContract(event: EventItem) {
    setDownloadingId(event.id)
    try {
      const preview = await api.contractPreview(event.id)
      await downloadEventContractPdf(preview)
    } catch {
      alert('No se pudo descargar el contrato. Intente nuevamente.')
    } finally {
      setDownloadingId(null)
    }
  }

  function openCancelDialog(event: EventItem) {
    setCancelTarget(event)
    setCancelCancellationType('CLIENT_REQUEST')
    setCancelNotes('')
  }

  function closeCancelDialog() {
    if (cancelTarget && processingId === cancelTarget.id) return
    setCancelTarget(null)
  }

  async function confirmCancelEvent() {
    if (!cancelTarget) return
    setProcessingId(cancelTarget.id)
    try {
      const cancelled = await api.cancelEventWithContract(cancelTarget.id, {
        cancellationType: cancelCancellationType,
        cancellationNotes: cancelNotes.trim(),
      })
      setCancelTarget(null)
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
    {cancelTarget && (
      <div
        aria-labelledby="cancel-event-title"
        aria-modal="true"
        className="quick-modal-layer"
        role="dialog"
        onClick={() => closeCancelDialog()}
      >
        <div
          className="quick-modal-card modal-2026 quick-modal-card-mobile"
          ref={cancelModal.modalRef}
          onPointerDownCapture={cancelModal.handlePointerDown}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="quick-modal-head modal-2026-head">
            <h3 id="cancel-event-title">Anular evento</h3>
            <button
              className="btn icon modal-close-btn"
              disabled={processingId === cancelTarget.id}
              onClick={() => closeCancelDialog()}
              type="button"
            >
              <X size={15} />
              Cerrar
            </button>
          </div>
          <div className="modal-2026-body" ref={cancelModal.modalBodyRef}>
            <p className="cancel-event-lead">
              ¿Anular <strong>{cancelTarget.title}</strong>? Se actualizará el estado y pueden aplicarse retenciones según el
              contrato.
            </p>
            <div className="form-grid">
              <label className="full">
                Tipo de anulación
                <FancySelect
                  value={cancelCancellationType}
                  onChange={(nextValue) => setCancelCancellationType(nextValue as EventCancellationType)}
                  options={eventCancellationTypes.map((value) => ({
                    value,
                    label: eventCancellationTypeLabels[value],
                  }))}
                />
              </label>
              <label className="full">
                Notas (opcional)
                <textarea
                  placeholder="Ej. Cliente avisó por WhatsApp el..."
                  rows={3}
                  value={cancelNotes}
                  onChange={(e) => setCancelNotes(e.target.value)}
                />
              </label>
            </div>
          </div>
          <div className="form-actions modal-2026-actions">
            <button
              className="btn ghost"
              disabled={processingId === cancelTarget.id}
              onClick={() => closeCancelDialog()}
              type="button"
            >
              Volver
            </button>
            <button
              className="btn danger"
              disabled={processingId === cancelTarget.id}
              onClick={() => void confirmCancelEvent()}
              type="button"
            >
              {processingId === cancelTarget.id ? 'Anulando…' : 'Confirmar anulación'}
            </button>
          </div>
        </div>
      </div>
    )}
    {staffAssignmentTarget && (
      <EventStaffAssignmentModal
        event={staffAssignmentTarget}
        onClose={() => setStaffAssignmentTarget(null)}
      />
    )}
    <div className="event-table-toolbar">
      <div>
        <span>{sortMode === 'recent' ? 'Últimos eventos creados' : 'Eventos por fecha (no anulados)'}</span>
        <strong>{visibleEvents.length} eventos</strong>
      </div>
      <div className="event-sort-tabs" role="tablist" aria-label="Orden de eventos">
        <button
          aria-selected={sortMode === 'recent'}
          className={sortMode === 'recent' ? 'active' : ''}
          onClick={() => setSortMode('recent')}
          role="tab"
          type="button"
        >
          Últimos creados
        </button>
        <button
          aria-selected={sortMode === 'upcoming'}
          className={sortMode === 'upcoming' ? 'active' : ''}
          onClick={() => setSortMode('upcoming')}
          role="tab"
          type="button"
        >
          Por fecha
        </button>
      </div>
    </div>
    <div className="table-wrap desktop-table">
      <table className="events-registry-table">
        <colgroup>
          <col className="ercol-date" />
          <col span={7} />
        </colgroup>
        <thead>
          <tr>
            <th className="event-date-col">Fecha</th>
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
          {visibleEvents.map((event) => (
            <tr key={event.id}>
              <td className="event-date-col" title={createdLabel(event.createdAt)}>
                <div className="event-date-cell-inner">
                  <div className="event-date-row event-date-row-primary">
                    <span className="event-date-main">{formatEventDateNumeric(event.eventDate)}</span>
                    <span className="event-time-range">
                      {shortTime(event.startTime)}–{shortTime(event.endTime)}
                    </span>
                  </div>
                  <div className="event-date-row event-date-row-reg">{createdCompactForTable(event.createdAt)}</div>
                </div>
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
              <td className="actions-cell event-actions-compact-wrap">
                <div className="event-actions-buttons">
                <button
                  className="btn icon"
                  onClick={() => setStaffAssignmentTarget(event)}
                  type="button"
                >
                  <Users size={16} />
                  Asignar equipo
                </button>
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
                  onClick={() => openCancelDialog(event)}
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
                  {downloadingId === event.id ? 'Preparando PDF...' : 'Descargar contrato PDF'}
                </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="mobile-event-list">
      {visibleEvents.map((event) => (
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
              <dd>
                {event.eventDate}
                <br />
                <small>{monthHintFromDateKey(event.eventDate)}</small>
              </dd>
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
          <p>{createdLabel(event.createdAt)}</p>
          <div className="mobile-card-actions">
            <button className="btn icon" onClick={() => onEditRequested?.(event)} type="button">
              Editar
            </button>
            <button className="btn icon" onClick={() => setStaffAssignmentTarget(event)} type="button">
              <Users size={16} />
              Asignar equipo
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
              onClick={() => openCancelDialog(event)}
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
              {downloadingId === event.id ? 'Preparando PDF...' : 'Descargar contrato PDF'}
            </button>
          </div>
        </article>
      ))}
    </div>
    </>
  )
}

function EventStaffAssignmentModal({
  event,
  onClose,
}: {
  event: EventItem
  onClose: () => void
}) {
  const modal = useMobileModalBehavior(true)
  const [assignments, setAssignments] = useState<EventStaffAssignment[]>([])
  const [availability, setAvailability] = useState<Partial<Record<EventStaffRoleKey, StaffAvailability[]>>>({})
  const [selectedStaff, setSelectedStaff] = useState<Partial<Record<EventStaffRoleKey, string>>>({})
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const fixedRoles = eventStaffRoles.filter((role) => !role.multi)
  const mozosRole = eventStaffRoles.find((role) => role.id === 'MOZOS')!
  const mozoAssignments = useMemo(
    () =>
      assignments
        .filter((assignment) => assignment.roleKey === 'MOZOS')
        .sort((a, b) => Number(a.slotNumber ?? 0) - Number(b.slotNumber ?? 0)),
    [assignments],
  )
  const nextMozoSlot = Math.max(0, ...mozoAssignments.map((assignment) => Number(assignment.slotNumber ?? 0))) + 1

  async function loadStaffData(shouldApply: () => boolean = () => true) {
    setLoading(true)
    setError('')
    try {
      const [assignmentList, availabilityEntries] = await Promise.all([
        api.eventStaffAssignments(event.id),
        Promise.all(
          eventStaffRoles.map(async (role) => {
            const list = await api.eventStaffAvailability(event.id, role.id)
            return [role.id, list] as const
          }),
        ),
      ])
      if (!shouldApply()) return
      setAssignments(assignmentList)
      setAvailability(Object.fromEntries(availabilityEntries) as Partial<Record<EventStaffRoleKey, StaffAvailability[]>>)
    } catch (err) {
      if (shouldApply()) setError(err instanceof Error ? err.message : 'No se pudo cargar el equipo del evento.')
    } finally {
      if (shouldApply()) setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    void loadStaffData(() => active)
    return () => {
      active = false
    }
  }, [event.id])

  function selectStaff(roleKey: EventStaffRoleKey, staffMemberId: string) {
    setSelectedStaff((current) => ({ ...current, [roleKey]: staffMemberId }))
  }

  async function assignRole(role: EventStaffRoleConfig, slotNumber?: number) {
    const staffMemberId = selectedStaff[role.id]
    if (!staffMemberId) {
      setError('Selecciona un trabajador disponible.')
      return
    }
    const key = `${role.id}-${slotNumber ?? 'principal'}`
    setBusyKey(key)
    setError('')
    setNotice('')
    try {
      await api.assignEventStaff(event.id, {
        staffMemberId,
        roleKey: role.id,
        roleLabel: role.label,
        slotNumber,
      })
      setSelectedStaff((current) => ({ ...current, [role.id]: '' }))
      setNotice(role.id === 'MOZOS' ? `${mozoSlotLabel(slotNumber)} asignado.` : `${role.label} asignado.`)
      await loadStaffData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo asignar el trabajador.')
    } finally {
      setBusyKey(null)
    }
  }

  async function removeAssignment(assignment: EventStaffAssignment) {
    const label = assignment.roleKey === 'MOZOS'
      ? mozoSlotLabel(assignment.slotNumber)
      : eventStaffRoleLabel(assignment.roleKey, assignment.slotNumber)
    const confirmed = window.confirm(`Quitar ${label} del evento?`)
    if (!confirmed) return
    setBusyKey(`remove-${assignment.id}`)
    setError('')
    setNotice('')
    try {
      await api.removeEventStaffAssignment(event.id, assignment.id)
      setNotice(`${label} quitado del evento.`)
      await loadStaffData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo quitar la asignacion.')
    } finally {
      setBusyKey(null)
    }
  }

  function availabilityFor(roleKey: EventStaffRoleKey) {
    return availability[roleKey] ?? []
  }

  function renderAvailabilitySelect(role: EventStaffRoleConfig) {
    const options = availabilityFor(role.id)
    const hasAvailable = options.some((item) => item.available)
    return (
      <label className="staff-select-label">
        Trabajador disponible
        <select
          disabled={loading || Boolean(busyKey) || !hasAvailable}
          onChange={(event) => selectStaff(role.id, event.target.value)}
          value={selectedStaff[role.id] ?? ''}
        >
          <option value="">{hasAvailable ? 'Seleccionar trabajador' : 'No hay disponibles'}</option>
          {options.map((item) => (
            <option disabled={!item.available} key={item.staffMemberId} value={item.staffMemberId}>
              {staffAvailabilityLabel(item)}
            </option>
          ))}
        </select>
      </label>
    )
  }

  function renderAssigned(assignment: EventStaffAssignment) {
    return (
      <div className="staff-assigned-row" key={assignment.id}>
        <div>
          <strong>{assignment.staffName}</strong>
          <span>
            {assignment.roleKey === 'MOZOS'
              ? mozoSlotLabel(assignment.slotNumber)
              : eventStaffRoleLabel(assignment.roleKey, assignment.slotNumber)}
            {assignment.staffPhone ? ` - ${assignment.staffPhone}` : ' - Sin telefono'}
          </span>
        </div>
        <button
          className="btn icon danger"
          disabled={Boolean(busyKey)}
          onClick={() => void removeAssignment(assignment)}
          type="button"
        >
          <Trash2 size={14} />
          Quitar
        </button>
      </div>
    )
  }

  function renderRoleCard(role: EventStaffRoleConfig) {
    const assigned = assignments.find((assignment) => assignment.roleKey === role.id)
    return (
      <article className="event-staff-role-card" key={role.id}>
        <header>
          <div>
            <h4>{role.label}</h4>
            <p>{role.hint}</p>
          </div>
          <span>{assigned ? '1' : '0'}</span>
        </header>
        {assigned ? renderAssigned(assigned) : <p className="empty compact">Sin contacto asignado.</p>}
        <div className="event-staff-assign-line">
          {renderAvailabilitySelect(role)}
          <button
            className="btn primary"
            disabled={Boolean(busyKey) || !selectedStaff[role.id]}
            onClick={() => void assignRole(role)}
            type="button"
          >
            <Save size={15} />
            {assigned ? 'Cambiar' : 'Asignar'}
          </button>
        </div>
      </article>
    )
  }

  return (
    <div
      aria-labelledby="event-staff-title"
      aria-modal="true"
      className="quick-modal-layer"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="quick-modal-card modal-2026 quick-modal-card-mobile staff-assignment-modal"
        ref={modal.modalRef}
        onPointerDownCapture={modal.handlePointerDown}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="quick-modal-head modal-2026-head staff-assignment-head">
          <div>
            <h3 id="event-staff-title">Asignar equipo</h3>
            <p>
              {event.title} - {event.eventDate} - {shortTime(event.startTime)} a {shortTime(event.endTime)}
            </p>
          </div>
          <button className="btn icon modal-close-btn" disabled={Boolean(busyKey)} onClick={onClose} type="button">
            <X size={15} />
            Cerrar
          </button>
        </div>
        <div className="modal-2026-body staff-assignment-body" ref={modal.modalBodyRef}>
          <div className="staff-assignment-summary">
            <article>
              <span>Asignados</span>
              <strong>{assignments.length}</strong>
            </article>
            <article>
              <span>Ambiente</span>
              <strong>{event.floorName}</strong>
            </article>
            <article>
              <span>Cliente</span>
              <strong>{event.clientName}</strong>
            </article>
          </div>

          {notice && <p className="message ok">{notice}</p>}
          {error && <p className="message error">{error}</p>}
          {loading && <p className="empty">Cargando disponibilidad del equipo...</p>}

          {!loading && (
            <div className="event-staff-grid">
              {fixedRoles.slice(0, 7).map(renderRoleCard)}
              <article className="event-staff-role-card event-staff-mozos-card">
                <header>
                  <div>
                    <h4>{mozosRole.label}</h4>
                    <p>{mozosRole.hint}</p>
                  </div>
                  <span>{mozoAssignments.length}</span>
                </header>
                <div className="event-staff-mozos-list">
                  {mozoAssignments.length === 0 ? (
                    <p className="empty compact">Aun no hay mozos asignados.</p>
                  ) : (
                    mozoAssignments.map(renderAssigned)
                  )}
                </div>
                <div className="event-staff-assign-line">
                  {renderAvailabilitySelect(mozosRole)}
                  <button
                    className="btn primary"
                    disabled={Boolean(busyKey) || !selectedStaff.MOZOS}
                    onClick={() => void assignRole(mozosRole, nextMozoSlot)}
                    type="button"
                  >
                    <Plus size={15} />
                    Agregar {mozoSlotLabel(nextMozoSlot)}
                  </button>
                </div>
              </article>
              {fixedRoles.slice(7).map(renderRoleCard)}
            </div>
          )}
        </div>
        <div className="form-actions modal-2026-actions">
          <button className="btn ghost" disabled={Boolean(busyKey)} onClick={onClose} type="button">
            Listo
          </button>
        </div>
      </div>
    </div>
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
      if (data.fullName && !clientForm.fullName.trim()) updateClient('fullName', data.fullName)
      if (data.address && !clientForm.address?.trim()) updateClient('address', data.address)
      setCreateLookupMessage(data.fullName ? 'Datos cargados automáticamente desde Perú API.' : MANUAL_LOOKUP_FALLBACK_MESSAGE)
    } catch {
      setCreateLookupMessage(MANUAL_LOOKUP_FALLBACK_MESSAGE)
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
            <p className="muted">
              Estás editando a <strong>{editingClientForm.fullName || 'cliente sin nombre'}</strong>. Guarda o cancela para volver
              al listado.
            </p>
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
                <button
                  className="btn icon"
                  disabled={editingClientId === client.id}
                  onClick={() => startEditingClient(client)}
                  type="button"
                >
                  {editingClientId === client.id ? 'Editando ahora' : 'Editar'}
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
  mode,
  updateInventory,
  submitInventory,
  removeInventoryItem,
}: {
  floors: Floor[]
  inventory: InventoryDashboard | null
  inventoryForm: InventoryPayload
  mode: 'list' | 'create'
  updateInventory: <K extends keyof InventoryPayload>(key: K, value: InventoryPayload[K]) => void
  submitInventory: (event: FormEvent) => Promise<void>
  removeInventoryItem: (item: InventoryItem) => Promise<void>
}) {
  const [pisoFilter, setPisoFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const categories = inventory?.categories ?? []
  const selectedCategory = categories.find((category) => category.id === inventoryForm.categoriaId)
  const subcategoryOptions = selectedCategory?.subcategorias ?? []
  const formUnitValue =
    Number(inventoryForm.cantidad || 0) > 0 ? Number(inventoryForm.valorTotal || 0) / Number(inventoryForm.cantidad) : 0
  const pisoOptions = useMemo(() => {
    const values = new Map<string, string>()
    ;['1er piso', '2do piso', '3er y 4to piso'].forEach((piso) => values.set(piso, piso))
    floors.forEach((floor) => {
      const piso = canonicalInventoryPiso(floor.name)
      if (piso) values.set(piso, piso)
    })
    inventory?.items.forEach((item) => {
      const piso = canonicalInventoryPiso(item.piso)
      if (piso) values.set(piso, piso)
    })
    const currentPiso = canonicalInventoryPiso(inventoryForm.piso)
    if (currentPiso) values.set(currentPiso, currentPiso)
    return Array.from(values.values()).map((value) => ({ value, label: value }))
  }, [floors, inventory, inventoryForm.piso])
  const inventoryPisoSummary = useMemo(() => {
    const values = new Map<string, { piso: string; itemCount: number; totalQuantity: number; totalValue: number }>()
    inventory?.summary.byPiso.forEach((summary) => {
      const piso = canonicalInventoryPiso(summary.piso)
      if (!piso) return
      const current = values.get(piso) ?? { piso, itemCount: 0, totalQuantity: 0, totalValue: 0 }
      current.itemCount += Number(summary.itemCount ?? 0)
      current.totalQuantity += Number(summary.totalQuantity ?? 0)
      current.totalValue += Number(summary.totalValue ?? 0)
      values.set(piso, current)
    })
    return Array.from(values.values())
  }, [inventory])
  const pisoMetrics = useMemo(() => new Map(inventoryPisoSummary.map((summary) => [summary.piso, summary])), [inventoryPisoSummary])
  const pisoFilterOptions = useMemo(() => [{ value: 'ALL', label: 'Todos' }, ...pisoOptions], [pisoOptions])
  const filteredItems = useMemo(
    () => {
      const items = inventory?.items ?? []
      return items.filter((item) => {
        const matchesPiso = pisoFilter === 'ALL' || canonicalInventoryPiso(item.piso) === pisoFilter
        const matchesCategory = categoryFilter === 'ALL' || item.categoriaId === categoryFilter
        return matchesPiso && matchesCategory
      })
    },
    [categoryFilter, pisoFilter, inventory],
  )
  const filteredValue = filteredItems.reduce((total, item) => total + Number(item.valorTotal ?? 0), 0)
  const filteredQuantity = filteredItems.reduce((total, item) => total + Number(item.cantidad ?? 0), 0)
  const filteredCategorySummary = useMemo(() => {
    const values = new Map<string, { piso: string; categoria: string; itemCount: number; totalQuantity: number; totalValue: number }>()
    filteredItems.forEach((item) => {
      const piso = canonicalInventoryPiso(item.piso)
      const key = `${piso}|${item.categoria}`
      const current = values.get(key) ?? { piso, categoria: item.categoria, itemCount: 0, totalQuantity: 0, totalValue: 0 }
      current.itemCount += 1
      current.totalQuantity += Number(item.cantidad ?? 0)
      current.totalValue += Number(item.valorTotal ?? 0)
      values.set(key, current)
    })
    return Array.from(values.values())
  }, [filteredItems])
  const activePisoLabel = pisoFilter === 'ALL' ? 'Todos los pisos' : pisoFilter
  const activeCategoryLabel = categoryFilter === 'ALL' ? 'Todas las categorías' : categories.find((category) => category.id === categoryFilter)?.nombre ?? 'Categoría'

  return (
    <section className={`grid inventory-layout ${mode === 'create' ? 'inventory-create-layout' : 'inventory-list-layout'}`}>
      {mode === 'create' && (
      <div className="panel inventory-create-panel">
        <h2>Registrar artículos</h2>
        <form onSubmit={submitInventory}>
          <div className="form-grid">
            <label>
              Piso
              <FancySelect
                value={canonicalInventoryPiso(inventoryForm.piso)}
                onChange={(nextValue) => updateInventory('piso', canonicalInventoryPiso(nextValue))}
                required
                options={pisoOptions}
              />
            </label>
            <label>
              Categoria
              <FancySelect
                value={inventoryForm.categoriaId}
                onChange={(nextValue) => {
                  const nextCategory = categories.find((category) => category.id === nextValue)
                  updateInventory('categoriaId', nextValue)
                  updateInventory('subcategoriaId', nextCategory?.subcategorias[0]?.id ?? '')
                }}
                required
                options={categories.map((category) => ({ value: category.id, label: category.nombre }))}
              />
            </label>
            <label>
              Subcategoria
              <FancySelect
                value={inventoryForm.subcategoriaId}
                onChange={(nextValue) => updateInventory('subcategoriaId', nextValue)}
                required
                options={subcategoryOptions.map((subcategory) => ({
                  value: subcategory.id,
                  label: subcategory.nombre,
                }))}
              />
            </label>
            <label className="full">
              Item especifico
              <input
                value={inventoryForm.nombre}
                onChange={(event) => updateInventory('nombre', event.target.value)}
                placeholder="Ejemplo: Mesas con base de acero y vidrio"
                required
              />
            </label>
            <label>
              Cantidad
              <input
                min="0.01"
                step="0.01"
                type="number"
                value={inventoryForm.cantidad}
                onChange={(event) => updateInventory('cantidad', Number(event.target.value))}
                required
              />
            </label>
            <label>
              Unidad
              <input
                value={inventoryForm.unidadMedida}
                onChange={(event) => updateInventory('unidadMedida', event.target.value)}
                placeholder="unidad, juego, metro"
                required
              />
            </label>
            <label>
              Valor total
              <input
                min="0"
                step="0.01"
                type="number"
                value={inventoryForm.valorTotal}
                onChange={(event) => updateInventory('valorTotal', Number(event.target.value))}
                required
              />
            </label>
            <label>
              Estado
              <FancySelect
                value={inventoryForm.estado}
                onChange={(nextValue) => updateInventory('estado', nextValue as InventoryStatus)}
                options={Object.entries(inventoryStatusLabels).map(([value, label]) => ({ value, label }))}
              />
            </label>
            <label>
              Ubicacion
              <input
                value={inventoryForm.ubicacion}
                onChange={(event) => updateInventory('ubicacion', event.target.value)}
                placeholder="Salon principal, deposito, barra"
              />
            </label>
            <label>
              Descripcion
              <input
                value={inventoryForm.descripcion}
                onChange={(event) => updateInventory('descripcion', event.target.value)}
                placeholder="Material, medida, color o uso"
              />
            </label>
            <label className="full">
              Observaciones
              <textarea
                value={inventoryForm.observacion}
                onChange={(event) => updateInventory('observacion', event.target.value)}
                placeholder="Marca, color, medidas, si está prestado, roto o pendiente de comprar."
              />
            </label>
          </div>
          <div className="inventory-form-total">
            Valor unitario calculado: <strong>{money.format(formUnitValue)}</strong>
          </div>
          <div className="form-actions">
            <button className="btn primary" type="submit">
              <Save size={17} />
              Guardar inventario
            </button>
          </div>
        </form>
      </div>
      )}

      {mode === 'list' && (
      <div className="panel inventory-overview-panel">
        <div className="inventory-hero-row">
          <div>
            <p className="inventory-eyebrow">Control valorizado</p>
            <h2>Inventario</h2>
            <span>{activePisoLabel} - {activeCategoryLabel}</span>
          </div>
          <strong>{money.format(filteredValue)}</strong>
        </div>
        <section className="inventory-summary inventory-kpi-grid">
          <article>
            <span>Registros</span>
            <strong>{filteredItems.length}</strong>
          </article>
          <article>
            <span>Cantidad total</span>
            <strong>{formatQuantity(filteredQuantity)}</strong>
          </article>
          <article>
            <span>Valor filtrado</span>
            <strong>{money.format(filteredValue)}</strong>
          </article>
        </section>

        <div className="inventory-floor-tabs" role="tablist" aria-label="Filtro rápido por piso">
          {pisoFilterOptions.map((option) => {
            const metric = option.value === 'ALL' ? null : pisoMetrics.get(option.value)
            const total = option.value === 'ALL' ? inventory?.summary.totalValue ?? 0 : metric?.totalValue ?? 0
            return (
              <button
                aria-selected={pisoFilter === option.value}
                className={pisoFilter === option.value ? 'active' : ''}
                key={option.value}
                onClick={() => setPisoFilter(option.value)}
                role="tab"
                type="button"
              >
                <span>{option.label}</span>
                <small>{money.format(total)}</small>
              </button>
            )
          })}
        </div>
      </div>
      )}

      {mode === 'list' && (
      <div className="panel inventory-table-panel">
        <div className="panel-header-row">
          <h2>Inventario registrado</h2>
          <div className="inventory-filters">
            <label className="compact-filter">
              Piso
              <FancySelect
                value={pisoFilter}
                onChange={(nextValue) => setPisoFilter(nextValue)}
                options={pisoFilterOptions}
              />
            </label>
            <label className="compact-filter">
              Categoria
              <FancySelect
                value={categoryFilter}
                onChange={(nextValue) => setCategoryFilter(nextValue)}
                options={[{ value: 'ALL', label: 'Todas' }, ...categories.map((category) => ({ value: category.id, label: category.nombre }))]}
              />
            </label>
          </div>
        </div>
        <div className="inventory-filter-total">
          Vista actual: {filteredItems.length} registros, {formatQuantity(filteredQuantity)} unidades,{' '}
          <strong>{money.format(filteredValue)}</strong>
        </div>
        <div className="inventory-category-breakdown">
          {filteredCategorySummary.slice(0, 8).map((category) => (
            <article key={`${category.piso}-${category.categoria}`}>
              <span>{category.piso}</span>
              <strong>{category.categoria}</strong>
              <small>
                {category.itemCount} items - {money.format(category.totalValue)}
              </small>
            </article>
          ))}
        </div>
        <InventoryTable items={filteredItems} removeInventoryItem={removeInventoryItem} />
      </div>
      )}
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
              <th>Categoria</th>
              <th>Cantidad</th>
              <th>Valor unit.</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Ubicacion</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.nombre}</strong>
                  <br />
                  <small>{item.descripcion || item.observacion || 'Sin descripcion'}</small>
                </td>
                <td>{canonicalInventoryPiso(item.piso)}</td>
                <td>
                  <strong>{item.categoria}</strong>
                  <br />
                  <small>{item.subcategoria}</small>
                </td>
                <td>
                  {formatQuantity(item.cantidad)} {item.unidadMedida}
                </td>
                <td>{money.format(item.valorUnitario)}</td>
                <td>{money.format(item.valorTotal)}</td>
                <td>
                  <span className={`status inventory ${inventoryStatusClass(item.estado)}`}>
                    {inventoryStatusLabels[item.estado]}
                  </span>
                </td>
                <td>{item.ubicacion || '-'}</td>
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
                <strong>{item.nombre}</strong>
                <span>
                  {item.categoria} / {item.subcategoria}
                </span>
              </div>
              <span className={`status inventory ${inventoryStatusClass(item.estado)}`}>
                {inventoryStatusLabels[item.estado]}
              </span>
            </header>
            <dl>
              <div>
                <dt>Piso</dt>
                <dd>{canonicalInventoryPiso(item.piso)}</dd>
              </div>
              <div>
                <dt>Cantidad</dt>
                <dd>
                  {formatQuantity(item.cantidad)} {item.unidadMedida}
                </dd>
              </div>
              <div>
                <dt>Valor unit.</dt>
                <dd>{money.format(item.valorUnitario)}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>{money.format(item.valorTotal)}</dd>
              </div>
            </dl>
            <p>{item.ubicacion || item.observacion || 'Sin ubicacion registrada'}</p>
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
    <section className="grid two ai-layout">
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
