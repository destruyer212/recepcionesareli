import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
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
  ClientPayment,
  ClientPaymentPayload,
  ClientPayload,
  ContractPreview,
  CancellationPaymentStatus,
  DashboardSummary,
  DocumentType,
  ApdaycPayer,
  ApdaycStatus,
  EventStaffAssignment,
  EventStaffRoleKey,
  EventItem,
  EventPackage,
  EventPackagePayload,
  EventPayload,
  EventStatus,
  Floor,
  FloorStatus,
  IaEventoResponse,
  InventoryDashboard,
  InventoryItem,
  InventoryPayload,
  InventoryStatus,
  PeruLocations,
  RescheduleOptions,
  StaffAvailability,
  AppSettings,
  PaymentType,
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
  searchable,
  searchPlaceholder = 'Buscar...',
  mobileSearchTitle,
}: {
  value: string
  onChange: (value: string) => void
  options: FancySelectOption[]
  placeholder?: string
  required?: boolean
  disabled?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  mobileSearchTitle?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const mobileSearchInputRef = useRef<HTMLInputElement | null>(null)
  const mobileSheet = useMobileModalBehavior(isMobileSheetOpen)

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

  useEffect(() => {
    if (!isOpen) setSearchTerm('')
  }, [isOpen])

  useEffect(() => {
    const query = window.matchMedia('(max-width: 720px)')
    const update = () => setIsMobileViewport(query.matches)
    update()
    if (query.addEventListener) {
      query.addEventListener('change', update)
      return () => query.removeEventListener('change', update)
    }
    query.addListener(update)
    return () => query.removeListener(update)
  }, [])

  useEffect(() => {
    if (!isMobileSheetOpen) return
    window.setTimeout(() => mobileSearchInputRef.current?.focus(), 80)
  }, [isMobileSheetOpen])

  useEffect(() => {
    if (!isMobileViewport) setIsMobileSheetOpen(false)
  }, [isMobileViewport])

  const selected = options.find((option) => option.value === value)
  const shouldShowSearch = Boolean(searchable || options.length > 16)
  const shouldUseMobileSheet = Boolean(searchable && isMobileViewport)
  const visibleOptions = useMemo(() => {
    const term = normalizeSearchText(searchTerm.trim())
    if (!term) return options
    return options.filter((option) => normalizeSearchText(option.label).includes(term))
  }, [options, searchTerm])
  const sheetTitle = mobileSearchTitle || placeholder

  function closeMobileSheet() {
    setIsMobileSheetOpen(false)
    setSearchTerm('')
  }

  function selectOption(nextValue: string) {
    onChange(nextValue)
    setIsOpen(false)
    closeMobileSheet()
  }

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
        aria-expanded={isOpen || isMobileSheetOpen}
        className="fancy-select-trigger"
        disabled={disabled}
        onClick={() => {
          if (shouldUseMobileSheet) {
            setIsMobileSheetOpen(true)
            return
          }
          setIsOpen((current) => !current)
        }}
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
          {shouldShowSearch && (
            <div className="fancy-select-search-wrap">
              <input
                autoFocus
                className="fancy-select-search"
                onChange={(event) => setSearchTerm(event.target.value)}
                onClick={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.preventDefault()
                }}
                placeholder={searchPlaceholder}
                type="search"
                value={searchTerm}
              />
            </div>
          )}
          <button
            className={`fancy-select-option ${value === '' ? 'active' : ''}`}
            onClick={() => selectOption('')}
            type="button"
          >
            {placeholder}
          </button>
          {visibleOptions.map((option) => (
            <button
              className={`fancy-select-option ${value === option.value ? 'active' : ''}`}
              disabled={option.disabled}
              key={option.value}
              onClick={() => selectOption(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
          {visibleOptions.length === 0 && <div className="fancy-select-empty">Sin resultados.</div>}
        </div>
      )}
      {isMobileSheetOpen &&
        createPortal(
          <div
            aria-label={sheetTitle}
            aria-modal="true"
            className="mobile-search-select-layer"
            onClick={closeMobileSheet}
            role="dialog"
          >
            <section
              className="mobile-search-select-sheet"
              ref={mobileSheet.modalRef}
              onClick={(event) => event.stopPropagation()}
              onPointerDownCapture={mobileSheet.handlePointerDown}
            >
              <header className="mobile-search-select-head">
                <h3>{sheetTitle}</h3>
                <button className="btn icon" onClick={closeMobileSheet} type="button">
                  <X size={16} />
                  Cerrar
                </button>
              </header>
              <div className="mobile-search-select-search">
                <input
                  ref={mobileSearchInputRef}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.preventDefault()
                  }}
                  placeholder={searchPlaceholder}
                  type="search"
                  value={searchTerm}
                />
              </div>
              <div className="mobile-search-select-list" ref={mobileSheet.modalBodyRef} role="listbox">
                {value && (
                  <button className="mobile-search-select-option muted" onClick={() => selectOption('')} type="button">
                    {placeholder}
                  </button>
                )}
                {visibleOptions.map((option) => (
                  <button
                    className={`mobile-search-select-option ${value === option.value ? 'active' : ''}`}
                    disabled={option.disabled}
                    key={option.value}
                    onClick={() => selectOption(option.value)}
                    type="button"
                  >
                    <span>{option.label}</span>
                    {value === option.value && <strong>Seleccionado</strong>}
                  </button>
                ))}
                {visibleOptions.length === 0 && <div className="mobile-search-select-empty">Sin resultados.</div>}
              </div>
            </section>
          </div>,
          document.body,
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
    const useFixedBodyLock = window.matchMedia('(max-width: 720px)').matches
    document.documentElement.classList.add('modal-scroll-locked')
    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehaviorY = 'none'
    if (useFixedBodyLock) {
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.left = '0'
      document.body.style.right = '0'
      document.body.style.width = '100%'
    }
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
      if (useFixedBodyLock) window.scrollTo(0, scrollY)
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
  province: '',
  district: '',
  provinceUbigeo: '',
  districtUbigeo: '',
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
  status: 'INQUIRY',
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
  CANCELLED: 'Cancelado',
}

const eventStatusOptions: Array<{ value: EventStatus; label: string }> = [
  { value: 'INQUIRY', label: 'Consulta' },
  { value: 'SEPARATED', label: 'Separado' },
  { value: 'CONTRACTED', label: 'Contratado' },
  { value: 'CANCELLED', label: 'Cancelado' },
]

const cancellationPaymentStatusLabels: Record<CancellationPaymentStatus, string> = {
  ADELANTO_RETENIDO: 'Adelanto retenido',
  DEVOLUCION_PARCIAL: 'Devolución parcial',
  DEVOLUCION_TOTAL: 'Devolución total',
  SIN_ADELANTO: 'Sin adelanto',
}

const paymentTypeLabels: Record<PaymentType, string> = {
  EVENT_PAYMENT: 'Pago del evento',
  APDAYC: 'APDAYC',
  GUARANTEE: 'Garantía',
}

const paymentTypeOptions: Array<{ value: PaymentType; label: string }> = [
  { value: 'EVENT_PAYMENT', label: 'Pago del evento' },
  { value: 'APDAYC', label: 'APDAYC (no suma como ingreso)' },
  { value: 'GUARANTEE', label: 'Garantía (devolvible, no ingreso)' },
]

const cancellationPaymentOptions: Array<{ value: CancellationPaymentStatus; label: string }> = [
  { value: 'SIN_ADELANTO', label: 'Cancelado sin adelanto' },
  { value: 'ADELANTO_RETENIDO', label: 'Adelanto retenido' },
  { value: 'DEVOLUCION_PARCIAL', label: 'Devolución parcial' },
  { value: 'DEVOLUCION_TOTAL', label: 'Devolución total' },
]

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
type EventCancellationFilter =
  | 'ALL'
  | 'CANCELLED_NO_ADVANCE'
  | 'CANCELLED_RETAINED'
  | 'CANCELLED_PARTIAL_REFUND'
  | 'CANCELLED_TOTAL_REFUND'

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

const eventCancellationFilterOptions: Array<{ value: EventCancellationFilter; label: string }> = [
  { value: 'ALL', label: 'Todos los eventos' },
  { value: 'CANCELLED_NO_ADVANCE', label: 'Cancelados sin adelanto' },
  { value: 'CANCELLED_RETAINED', label: 'Cancelados con adelanto retenido' },
  { value: 'CANCELLED_PARTIAL_REFUND', label: 'Cancelados con devolución parcial' },
  { value: 'CANCELLED_TOTAL_REFUND', label: 'Cancelados con devolución total' },
]

type EventStaffRoleConfig = {
  id: EventStaffRoleKey
  label: string
  hint: string
  multi?: boolean
}

const eventStaffRoles: EventStaffRoleConfig[] = [
  { id: 'EVENT_PLANNER', label: 'Event Planner', hint: 'Plan general, proveedores y cronograma.' },
  { id: 'COORDINADOR_EVENTO', label: 'Coordinador del Evento', hint: 'Responsable operativo durante el evento.' },
  { id: 'DJ', label: 'DJ', hint: 'Música, cabina y momentos especiales.' },
  { id: 'FOTOGRAFO', label: 'Fotógrafo', hint: 'Registro fotográfico del evento.' },
  { id: 'VIDEOGRAFO', label: 'Videógrafo', hint: 'Video, reels, tomas y entrega final.' },
  { id: 'SEGURIDAD', label: 'Seguridad', hint: 'Control de ingreso y orden.' },
  { id: 'ANFITRIONA', label: 'Anfitriona', hint: 'Recepción e indicaciones a invitados.' },
  { id: 'MOZOS', label: 'Mozos', hint: 'Sub lista numerada: Mozo 1, Mozo 2, Mozo 3 y los que necesites.', multi: true },
  { id: 'BARMAN', label: 'Barman', hint: 'Bar, bebidas y servicio de cocteles.' },
  { id: 'HORA_LOCA', label: 'Hora Loca', hint: 'Show, animación y accesorios.' },
  { id: 'DECORACION', label: 'Personal de Decoración', hint: 'Montaje, estilo y detalles visuales.' },
  { id: 'BOCADITOS', label: 'Personal de Bocaditos', hint: 'Mesa dulce, salados y atención.' },
  { id: 'COCINA', label: 'Personal de Cocina', hint: 'Preparación, apoyo y salida de platos.' },
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
  const [peruLocations, setPeruLocations] = useState<PeruLocations>({ provinces: [], districts: [] })
  const [clientForm, setClientForm] = useState<ClientPayload>(emptyClient)
  const [eventForm, setEventForm] = useState<EventPayload>(emptyEvent)
  const [inventoryForm, setInventoryForm] = useState<InventoryPayload>(emptyInventoryItem)
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null)
  const [editEventForm, setEditEventForm] = useState<EventPayload | null>(null)
  const [editBusy, setEditBusy] = useState(false)
  const activePackages = useMemo(() => packages.filter((item) => item.active !== false), [packages])
  const selectedPackage = useMemo(
    () => activePackages.find((item) => item.id === eventForm.packageId),
    [activePackages, eventForm.packageId],
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
      void Promise.all([
        api.clients(),
        api.packages(true),
        api.inventory(),
        api.peruLocations().catch(() => ({ provinces: [], districts: [] }) as PeruLocations),
      ])
        .then(([clientList, packageList, inventoryData, locationsData]) => {
          setClients(clientList)
          setPackages(packageList)
          setInventory(inventoryData)
          setPeruLocations(locationsData)
          const nextActivePackages = packageList.filter((item) => item.active !== false)
          const firstInventoryCategory = inventoryData.categories[0]
          const firstInventorySubcategory = firstInventoryCategory?.subcategorias[0]
          setEventForm((current) => ({
            ...current,
            clientId: current.clientId || clientList[0]?.id || '',
            packageId:
              current.packageId && nextActivePackages.some((item) => item.id === current.packageId)
                ? current.packageId
                : nextActivePackages[0]?.id || '',
            totalAmount: current.totalAmount || Number(nextActivePackages[0]?.basePrice ?? 0),
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

  async function createEventFromAi(draft: AiEventDraft) {
    setMessage('')
    setError('')
    let clientId = draft.clientId ?? ''
    if (!clientId && draft.clientName?.trim() && draft.clientPhone?.trim()) {
      const documentType = draft.clientDocumentType ?? 'DNI'
      const documentNumber = (draft.clientDocumentNumber ?? '').replace(/\D/g, '')
      if (documentType === 'DNI' && documentNumber.length !== 8) {
        throw new Error('Para crear un cliente nuevo desde IA falta un DNI valido de 8 digitos.')
      }
      if (documentType === 'RUC' && documentNumber.length !== 11) {
        throw new Error('Para crear un cliente nuevo desde IA falta un RUC valido de 11 digitos.')
      }
      const createdClient = await api.createClient({
        fullName: draft.clientName.trim(),
        documentType,
        documentNumber,
        phone: draft.clientPhone.trim(),
        whatsapp: draft.clientPhone.trim(),
        email: draft.clientEmail?.trim() || undefined,
      })
      clientId = createdClient.id
    }

    const selectedClient = clients.find((item) => item.id === clientId)
    const hasNewClientContact = !selectedClient && Boolean(draft.clientName?.trim() && draft.clientPhone?.trim())
    const contractContact = selectedClient ? contractualContactNumber(selectedClient) : draft.clientPhone?.trim() ?? ''
    if (!clientId) {
      throw new Error('Falta seleccionar un cliente registrado o dar nombre y telefono para crear uno.')
    }
    if (!contractContact && !hasNewClientContact) {
      throw new Error('El cliente necesita WhatsApp o telefono antes de separar.')
    }
    if (!draft.floorId) {
      throw new Error('Falta seleccionar ambiente.')
    }
  if (!draft.eventDate || !draft.startTime || !draft.endTime) {
    throw new Error('Falta completar fecha y horario.')
  }
  const contractCapacity = resolvedAiCapacity(draft, packages)
  if (!contractCapacity || contractCapacity <= 0) {
    throw new Error('Falta capacidad contractual mayor a 0.')
  }
  if (!draft.totalAmount || Number(draft.totalAmount) <= 0) {
    throw new Error('Falta monto total mayor a 0.')
  }
  if (!isAiApdaycComplete(draft)) {
    throw new Error('Falta completar APDAYC en el asistente IA.')
  }

  await api.createEvent({
      clientId,
      floorId: draft.floorId,
      packageId: draft.packageId || undefined,
      title: draft.title || `${draft.eventType || 'Evento'} - ${draft.clientName || selectedClient?.fullName || 'Cliente'}`,
      eventType: draft.eventType || 'Evento',
      eventDate: draft.eventDate,
      startTime: draft.startTime,
      endTime: draft.endTime,
      status: draft.status ?? 'INQUIRY',
      totalAmount: Number(draft.totalAmount),
      apdaycAmount: Number(draft.apdaycAmount ?? 0),
      apdaycPayer: draft.apdaycPayer ?? 'CLIENT',
      apdaycStatus: draft.apdaycStatus ?? 'NOT_APPLIES',
      contractCapacityOverride: contractCapacity,
      apdaycNotes: draft.apdaycNotes || undefined,
      notes: draft.notes || undefined,
    })
    setMessage('Evento creado desde el asistente IA.')
    await loadData()
    setView('eventsRegistered')
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
            packages={activePackages}
            peruLocations={peruLocations}
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
                          options={eventStatusOptions}
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
            events={events}
            peruLocations={peruLocations}
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
            events={events}
            peruLocations={peruLocations}
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
        {!loading && view === 'packages' && <PackagesView packages={packages} onPackagesChanged={loadData} />}
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
            updateInventoryItem={async (id, payload) => {
              await api.updateInventoryItem(id, payload)
              setMessage('Articulo actualizado correctamente.')
              await loadData()
            }}
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
            updateInventoryItem={async (id, payload) => {
              await api.updateInventoryItem(id, payload)
              setMessage('Articulo actualizado correctamente.')
              await loadData()
            }}
          />
        )}
        {!loading && view === 'ai' && (
          <AiView
            clients={clients}
            floors={floors}
            packages={activePackages}
            onCreateEvent={createEventFromAi}
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
    ai: 'Asistente IA de eventos',
    settings: 'Configuración del sistema',
  }
  return labels[view]
}

function SettingsView() {
  const [data, setData] = useState<AppSettings | null>(null)
  const [tokenInput, setTokenInput] = useState('')
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState('')
  const [geminiModelInput, setGeminiModelInput] = useState('gemini-2.5-flash')
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
      setGeminiModelInput(s.geminiModel || 'gemini-2.5-flash')
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

  async function saveGeminiSettings() {
    if (!geminiApiKeyInput.trim() && !geminiModelInput.trim()) {
      setNotice('Pega una API key de Gemini o indica un modelo antes de guardar.')
      return
    }
    setBusy(true)
    setNotice('')
    try {
      const s = await api.updateSettings({
        geminiApiKey: geminiApiKeyInput.trim() || undefined,
        geminiModel: geminiModelInput.trim() || undefined,
      })
      setData(s)
      setGeminiApiKeyInput('')
      setGeminiModelInput(s.geminiModel || 'gemini-2.5-flash')
      setNotice('Configuración de Gemini guardada. Tiene prioridad sobre variables de entorno del servidor.')
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'No se pudo guardar Gemini.')
    } finally {
      setBusy(false)
    }
  }

  async function clearStoredGeminiKey() {
    if (!window.confirm('¿Quitar la API key Gemini guardada en base de datos y usar solo GEMINI_API_KEY del servidor (si existe)?')) {
      return
    }
    setBusy(true)
    setNotice('')
    try {
      const s = await api.updateSettings({ clearGeminiApiKey: true })
      setData(s)
      setGeminiApiKeyInput('')
      setNotice('API key Gemini de base de datos eliminada.')
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'No se pudo actualizar Gemini.')
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

  const geminiSourceLabel =
    data?.geminiApiKeySource === 'BASE_DE_DATOS'
      ? 'Base de datos'
      : data?.geminiApiKeySource === 'ENTORNO'
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
        <div className="settings-divider" />
        <h3>Gemini IA</h3>
        <p className="settings-intro">
          Esta integración alimenta el apartado IA para interpretar mensajes naturales y preparar borradores antes de guardar.
        </p>
        <div className="settings-status">
          <span>Estado Gemini</span>
          <strong>{data?.geminiApiKeyReady ? 'Listo para interpretar' : 'Falta API key'}</strong>
          <span>Origen activo</span>
          <strong>{geminiSourceLabel}</strong>
          <span>Modelo</span>
          <strong>{data?.geminiModel || 'gemini-2.5-flash'}</strong>
        </div>
        <p className="settings-hint">{data?.geminiApiKeyHint}</p>
        <div className="form-grid">
          <label className="full">
            API key Gemini
            <input
              autoComplete="off"
              onChange={(e) => setGeminiApiKeyInput(e.target.value)}
              placeholder="Pega aquí tu GEMINI_API_KEY"
              type="password"
              value={geminiApiKeyInput}
            />
          </label>
          <label className="full">
            Modelo Gemini
            <input
              onChange={(e) => setGeminiModelInput(e.target.value)}
              placeholder="gemini-2.5-flash"
              value={geminiModelInput}
            />
          </label>
        </div>
        <div className="form-actions">
          <button className="btn danger" disabled={busy} onClick={() => void clearStoredGeminiKey()} type="button">
            Quitar key Gemini de base de datos
          </button>
          <button className="btn primary" disabled={busy} onClick={() => void saveGeminiSettings()} type="button">
            <Save size={16} />
            {busy ? 'Guardando...' : 'Guardar Gemini'}
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
  peruLocations,
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
  peruLocations: PeruLocations
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
  const quickLookupAutofillRef = useRef<{ fullName?: string; address?: string }>({})
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
    province: '',
    district: '',
    provinceUbigeo: '',
    districtUbigeo: '',
    notes: '',
  })
  const quickClientModal = useMobileModalBehavior(isQuickClientOpen)
  const quickProvinceOptions = useMemo(
    () =>
      peruLocations.provinces.map((province) => ({
        value: province.ubigeo,
        label: `${province.name} (${province.departmentName})`,
      })),
    [peruLocations.provinces],
  )
  const quickDistrictOptions = useMemo(
    () =>
      peruLocations.districts
        .filter((district) => district.provinceUbigeo === quickClientForm.provinceUbigeo)
        .map((district) => ({ value: district.ubigeo, label: district.name })),
    [peruLocations.districts, quickClientForm.provinceUbigeo],
  )
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
        province: '',
        district: '',
        provinceUbigeo: '',
        districtUbigeo: '',
        notes: '',
      })
      quickLookupKeyRef.current = ''
      quickLookupAutofillRef.current = {}
      setQuickLookupMessage('')
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
      quickLookupKeyRef.current = ''
      setQuickLookupBusy(false)
      setQuickLookupMessage('')
      return
    }
    const lookupKey = `${documentType}:${digitsOnly}`
    if (quickLookupKeyRef.current === lookupKey) return
    quickLookupKeyRef.current = lookupKey
    setQuickLookupBusy(true)
    try {
      const data = await api.lookupClientDocument(documentType, digitsOnly)
      setQuickClientForm((current) => {
        const currentDocumentType = (current.documentType ?? 'DNI') as 'DNI' | 'RUC'
        const currentDigits = (current.documentNumber ?? '').replace(/\D/g, '')
        if (`${currentDocumentType}:${currentDigits}` !== lookupKey) return current

        const previousAutofill = quickLookupAutofillRef.current
        const shouldReplaceName =
          !current.fullName.trim() ||
          Boolean(previousAutofill.fullName && current.fullName.trim() === previousAutofill.fullName.trim())
        const shouldReplaceAddress =
          !current.address?.trim() ||
          Boolean(previousAutofill.address && current.address.trim() === previousAutofill.address.trim())
        const nextFullName = shouldReplaceName ? data.fullName || current.fullName : current.fullName
        const nextAddress = shouldReplaceAddress ? data.address || current.address || '' : current.address

        quickLookupAutofillRef.current = {
          fullName: data.fullName || previousAutofill.fullName,
          address: data.address || previousAutofill.address,
        }

        return {
          ...current,
          fullName: nextFullName,
          address: nextAddress,
        }
      })
      if (quickLookupKeyRef.current !== lookupKey) return
      setQuickLookupMessage(data.fullName ? 'Datos cargados automáticamente desde Perú API.' : MANUAL_LOOKUP_FALLBACK_MESSAGE)
    } catch {
      if (quickLookupKeyRef.current === lookupKey) {
        setQuickLookupMessage(MANUAL_LOOKUP_FALLBACK_MESSAGE)
      }
    } finally {
      if (quickLookupKeyRef.current === lookupKey) {
        setQuickLookupBusy(false)
      }
    }
  }

  function updateQuickClientProvince(provinceUbigeo: string) {
    const province = peruLocations.provinces.find((item) => item.ubigeo === provinceUbigeo)
    setQuickClientForm((current) => ({
      ...current,
      province: province?.name ?? '',
      provinceUbigeo: province?.ubigeo ?? '',
      district: '',
      districtUbigeo: '',
    }))
  }

  function updateQuickClientDistrict(districtUbigeo: string) {
    const district = peruLocations.districts.find((item) => item.ubigeo === districtUbigeo)
    setQuickClientForm((current) => ({
      ...current,
      district: district?.name ?? '',
      districtUbigeo: district?.ubigeo ?? '',
    }))
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
                options={eventStatusOptions}
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
      {isQuickClientOpen &&
        createPortal(
          <div
            className="quick-modal-layer"
            role="dialog"
            aria-modal="true"
            aria-label="Crear cliente rápido"
            onClick={() => setIsQuickClientOpen(false)}
          >
          <div
            className="quick-modal-card modal-2026 quick-modal-card-mobile quick-client-create-modal"
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
                        quickLookupAutofillRef.current = {}
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
                  <label className="full">
                    Dirección
                    <input
                      value={quickClientForm.address}
                      onChange={(e) => setQuickClientForm((current) => ({ ...current, address: e.target.value }))}
                    />
                  </label>
                  <label>
                    Provincia
                    <FancySelect
                      disabled={peruLocations.provinces.length === 0}
                      onChange={updateQuickClientProvince}
                      options={quickProvinceOptions}
                      placeholder={peruLocations.provinces.length ? 'Seleccionar provincia' : 'Cargando provincias...'}
                      searchable
                      searchPlaceholder="Buscar provincia..."
                      mobileSearchTitle="Seleccionar provincia"
                      value={quickClientForm.provinceUbigeo ?? ''}
                    />
                  </label>
                  <label>
                    Distrito
                    <FancySelect
                      disabled={!quickClientForm.provinceUbigeo}
                      onChange={updateQuickClientDistrict}
                      options={quickDistrictOptions}
                      placeholder={quickClientForm.provinceUbigeo ? 'Seleccionar distrito' : 'Elige provincia primero'}
                      searchable
                      searchPlaceholder="Buscar distrito..."
                      mobileSearchTitle="Seleccionar distrito"
                      value={quickClientForm.districtUbigeo ?? ''}
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
          </div>,
          document.body,
        )}
    </section>
  )
}

function matchesCancellationFilter(event: EventItem, filter: EventCancellationFilter) {
  if (filter === 'ALL') return true
  if (event.status !== 'CANCELLED') return false
  if (filter === 'CANCELLED_NO_ADVANCE') return event.cancellationPaymentStatus === 'SIN_ADELANTO'
  if (filter === 'CANCELLED_RETAINED') return event.cancellationPaymentStatus === 'ADELANTO_RETENIDO'
  if (filter === 'CANCELLED_PARTIAL_REFUND') return event.cancellationPaymentStatus === 'DEVOLUCION_PARCIAL'
  if (filter === 'CANCELLED_TOTAL_REFUND') return event.cancellationPaymentStatus === 'DEVOLUCION_TOTAL'
  return true
}

function cancellationFinancialLine(event: EventItem) {
  if (event.status !== 'CANCELLED') return ''
  const status = event.cancellationPaymentStatus ? cancellationPaymentStatusLabels[event.cancellationPaymentStatus] : 'Sin detalle'
  return `Cancelacion: ${status} - Adelanto ${money.format(event.cancellationAdvanceAmount ?? event.paidAmount ?? 0)} - Retenido ${money.format(event.cancellationRetainedAmount ?? event.retainedAdvanceAmount ?? 0)} - Devuelto ${money.format(event.cancellationRefundedAmount ?? 0)}`
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
  const [cancelPaymentStatus, setCancelPaymentStatus] = useState<CancellationPaymentStatus>('SIN_ADELANTO')
  const [cancelRefundedAmount, setCancelRefundedAmount] = useState(0)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelDate, setCancelDate] = useState(new Date().toISOString().slice(0, 10))
  const [cancelObservation, setCancelObservation] = useState('')
  const [cancellationFilter, setCancellationFilter] = useState<EventCancellationFilter>('ALL')
  const [paymentTarget, setPaymentTarget] = useState<EventItem | null>(null)
  const [paymentRows, setPaymentRows] = useState<ClientPayment[]>([])
  const [paymentBusy, setPaymentBusy] = useState(false)
  const [paymentForm, setPaymentForm] = useState<ClientPaymentPayload>({
    paymentDate: new Date().toISOString().slice(0, 10),
    concept: 'Adelanto',
    amount: 0,
    method: 'Efectivo',
    paymentType: 'EVENT_PAYMENT',
    internalReceiptNumber: '',
    notes: '',
  })
  const [staffAssignmentTarget, setStaffAssignmentTarget] = useState<EventItem | null>(null)
  const cancelModal = useMobileModalBehavior(Boolean(cancelTarget))
  const paymentModal = useMobileModalBehavior(Boolean(paymentTarget))
  const todayKey = dateKey(new Date())
  const visibleEvents = useMemo(() => {
    const filtered = events.filter((event) => matchesCancellationFilter(event, cancellationFilter))
    const sorted = [...filtered]
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
  }, [events, sortMode, todayKey, cancellationFilter])

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

  async function openPayments(event: EventItem) {
    setPaymentTarget(event)
    setPaymentForm({
      paymentDate: new Date().toISOString().slice(0, 10),
      concept: (event.paidAmount ?? 0) > 0 ? 'Pago a cuenta' : 'Adelanto',
      amount: 0,
      method: 'Efectivo',
      paymentType: 'EVENT_PAYMENT',
      internalReceiptNumber: '',
      notes: '',
    })
    setPaymentBusy(true)
    try {
      setPaymentRows(await api.eventPayments(event.id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudieron cargar los pagos del evento.')
    } finally {
      setPaymentBusy(false)
    }
  }

  function closePayments() {
    if (paymentBusy) return
    setPaymentTarget(null)
    setPaymentRows([])
  }

  function updatePayment<K extends keyof ClientPaymentPayload>(key: K, value: ClientPaymentPayload[K]) {
    setPaymentForm((current) => ({ ...current, [key]: value }))
  }

  async function submitPayment(event: FormEvent) {
    event.preventDefault()
    if (!paymentTarget) return
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      alert('Ingresa un monto mayor a 0.')
      return
    }
    setPaymentBusy(true)
    try {
      await api.createEventPayment(paymentTarget.id, {
        ...paymentForm,
        amount: Number(paymentForm.amount),
        internalReceiptNumber: paymentForm.internalReceiptNumber || undefined,
        notes: paymentForm.notes || undefined,
      })
      const [nextRows] = await Promise.all([api.eventPayments(paymentTarget.id), onEventUpdated()])
      setPaymentRows(nextRows)
      setPaymentForm((current) => ({
        ...current,
        concept: 'Pago a cuenta',
        amount: 0,
        internalReceiptNumber: '',
        notes: '',
      }))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo registrar el pago.')
    } finally {
      setPaymentBusy(false)
    }
  }

  function openCancelDialog(event: EventItem) {
    const advance = Number(event.paidAmount ?? 0)
    setCancelTarget(event)
    setCancelCancellationType('CLIENT_REQUEST')
    setCancelPaymentStatus(advance > 0 ? 'ADELANTO_RETENIDO' : 'SIN_ADELANTO')
    setCancelRefundedAmount(0)
    setCancelReason('')
    setCancelDate(new Date().toISOString().slice(0, 10))
    setCancelObservation('')
    setCancelNotes('')
  }

  function closeCancelDialog() {
    if (cancelTarget && processingId === cancelTarget.id) return
    setCancelTarget(null)
  }

  async function confirmCancelEvent() {
    if (!cancelTarget) return
    const advanceAmount = Number(cancelTarget.paidAmount ?? 0)
    if (advanceAmount <= 0 && cancelPaymentStatus !== 'SIN_ADELANTO') {
      alert('Este evento no tiene adelanto registrado. Usa "Cancelado sin adelanto".')
      return
    }
    if (advanceAmount > 0 && cancelPaymentStatus === 'SIN_ADELANTO') {
      alert('Este evento tiene adelanto registrado. Selecciona retencion o devolucion.')
      return
    }
    if (cancelPaymentStatus === 'DEVOLUCION_PARCIAL') {
      const refunded = Number(cancelRefundedAmount)
      if (refunded <= 0 || refunded >= advanceAmount) {
        alert('La devolucion parcial debe ser mayor a 0 y menor al adelanto recibido.')
        return
      }
    }
    setProcessingId(cancelTarget.id)
    try {
      const cancelled = await api.cancelEventWithContract(cancelTarget.id, {
        cancellationType: cancelCancellationType,
        cancellationPaymentStatus: cancelPaymentStatus,
        refundedAmount: cancelPaymentStatus === 'DEVOLUCION_PARCIAL' ? Number(cancelRefundedAmount) : undefined,
        cancellationReason: cancelReason.trim(),
        cancellationDate: cancelDate,
        cancellationObservation: cancelObservation.trim(),
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

  const paymentEventPaid = paymentRows
    .filter((row) => row.countsTowardsEventTotal)
    .reduce((sum, row) => sum + Number(row.amount ?? 0), 0)
  const paymentEventBalance = paymentTarget ? Math.max(0, Number(paymentTarget.totalAmount ?? 0) - paymentEventPaid) : 0
  const cancelAdvanceAmount = Number(cancelTarget?.paidAmount ?? 0)
  const cancelRefundedPreview =
    cancelPaymentStatus === 'DEVOLUCION_TOTAL'
      ? cancelAdvanceAmount
      : cancelPaymentStatus === 'DEVOLUCION_PARCIAL'
        ? Number(cancelRefundedAmount || 0)
        : 0
  const cancelRetainedPreview =
    cancelPaymentStatus === 'ADELANTO_RETENIDO'
      ? cancelAdvanceAmount
      : cancelPaymentStatus === 'DEVOLUCION_PARCIAL'
        ? Math.max(0, cancelAdvanceAmount - cancelRefundedPreview)
        : 0
  const cancelPaymentOptions = cancellationPaymentOptions.map((option) => ({
    ...option,
    disabled: cancelAdvanceAmount > 0 ? option.value === 'SIN_ADELANTO' : option.value !== 'SIN_ADELANTO',
  }))

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
    {paymentTarget && (
      <div
        aria-labelledby="payment-event-title"
        aria-modal="true"
        className="quick-modal-layer"
        role="dialog"
        onClick={() => closePayments()}
      >
        <div
          className="quick-modal-card modal-2026 quick-modal-card-mobile event-payment-modal"
          ref={paymentModal.modalRef}
          onPointerDownCapture={paymentModal.handlePointerDown}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="quick-modal-head modal-2026-head">
            <div>
              <h3 id="payment-event-title">Pagos del evento</h3>
              <p>{paymentTarget.title}</p>
            </div>
            <button className="btn icon modal-close-btn" disabled={paymentBusy} onClick={() => closePayments()} type="button">
              <X size={15} />
              Cerrar
            </button>
          </div>
          <div className="modal-2026-body" ref={paymentModal.modalBodyRef}>
            <div className="payment-summary-grid">
              <article>
                <span>Total evento</span>
                <strong>{money.format(paymentTarget.totalAmount)}</strong>
              </article>
              <article>
                <span>Pagado evento</span>
                <strong>{money.format(paymentEventPaid)}</strong>
              </article>
              <article>
                <span>Saldo</span>
                <strong>{money.format(paymentEventBalance)}</strong>
              </article>
            </div>
            <p className="payment-accounting-note">
              APDAYC y garantía se registran para control, pero no suman como ingreso del evento ni completan el saldo.
            </p>
            <form className="payment-form" onSubmit={submitPayment}>
              <div className="form-grid">
                <label>
                  Fecha
                  <input
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(event) => updatePayment('paymentDate', event.target.value)}
                    required
                  />
                </label>
                <label>
                  Tipo
                  <FancySelect
                    value={paymentForm.paymentType ?? 'EVENT_PAYMENT'}
                    onChange={(value) => updatePayment('paymentType', value as PaymentType)}
                    options={paymentTypeOptions}
                  />
                </label>
                <label>
                  Concepto
                  <input value={paymentForm.concept} onChange={(event) => updatePayment('concept', event.target.value)} required />
                </label>
                <label>
                  Monto
                  <input
                    min="0.01"
                    step="0.01"
                    type="number"
                    value={paymentForm.amount || ''}
                    onChange={(event) => updatePayment('amount', Number(event.target.value))}
                    required
                  />
                </label>
                <label>
                  Medio de pago
                  <input value={paymentForm.method} onChange={(event) => updatePayment('method', event.target.value)} required />
                </label>
                <label>
                  Recibo interno
                  <input
                    value={paymentForm.internalReceiptNumber ?? ''}
                    onChange={(event) => updatePayment('internalReceiptNumber', event.target.value)}
                  />
                </label>
                <label className="full">
                  Notas
                  <textarea value={paymentForm.notes ?? ''} onChange={(event) => updatePayment('notes', event.target.value)} rows={2} />
                </label>
              </div>
              <div className="form-actions">
                <button className="btn primary" disabled={paymentBusy} type="submit">
                  <Save size={16} />
                  {paymentBusy ? 'Guardando...' : 'Registrar pago'}
                </button>
              </div>
            </form>
            <div className="payment-history">
              <strong>Historial de pagos</strong>
              {paymentRows.length === 0 ? (
                <p className="empty compact">Todavía no hay pagos registrados.</p>
              ) : (
                paymentRows.map((row) => (
                  <article key={row.id}>
                    <div>
                      <strong>{row.concept}</strong>
                      <span>{row.paymentDate} - {paymentTypeLabels[row.paymentType]}</span>
                    </div>
                    <div>
                      <strong>{money.format(row.amount)}</strong>
                      <span>{row.countsTowardsEventTotal ? 'Suma al evento' : 'No es ingreso del evento'}</span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
          <div className="form-actions modal-2026-actions">
            <button className="btn ghost" disabled={paymentBusy} onClick={() => closePayments()} type="button">
              Listo
            </button>
          </div>
        </div>
      </div>
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
          <col className="ercol-event" />
          <col className="ercol-client" />
          <col className="ercol-floor" />
          <col className="ercol-status" />
          <col className="ercol-amount" />
          <col className="ercol-apdayc" />
          <col className="ercol-actions" />
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
                  {downloadingId === event.id ? 'Preparando...' : 'Descargar PDF'}
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
  const totalAvailableSlots = eventStaffRoles.reduce(
    (total, role) => total + availabilityFor(role.id).filter((item) => item.available).length,
    0,
  )

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

  function assignmentsFor(roleKey: EventStaffRoleKey) {
    return assignments.filter((assignment) => assignment.roleKey === roleKey)
  }

  function availableCountFor(roleKey: EventStaffRoleKey) {
    return availabilityFor(roleKey).filter((item) => item.available).length
  }

  function assignedCountLabel(count: number) {
    return `${count} asignado${count === 1 ? '' : 's'}`
  }

  function renderAvailabilitySelect(role: EventStaffRoleConfig) {
    const options = availabilityFor(role.id)
    const hasAvailable = options.some((item) => item.available)
    const selectOptions = options.map((item) => ({
      value: item.staffMemberId,
      label: staffAvailabilityLabel(item),
      disabled: !item.available,
    }))
    return (
      <label className="staff-select-label">
        <span>Trabajador disponible</span>
        <FancySelect
          disabled={loading || Boolean(busyKey) || !hasAvailable}
          mobileSearchTitle={`Seleccionar ${role.label}`}
          onChange={(value) => selectStaff(role.id, value)}
          options={selectOptions}
          placeholder={hasAvailable ? 'Seleccionar trabajador' : 'No hay disponibles'}
          searchable
          searchPlaceholder="Buscar por nombre o teléfono..."
          value={selectedStaff[role.id] ?? ''}
        />
        <small>{hasAvailable ? `${availableCountFor(role.id)} disponibles para este horario` : 'Sin disponibles para este horario'}</small>
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
            {assignment.staffPhone ? ` - ${assignment.staffPhone}` : ' - Sin teléfono'}
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
    const roleAssignments = assignmentsFor(role.id)
    const assigned = roleAssignments[0]
    const availableCount = availableCountFor(role.id)
    return (
      <article className="event-staff-role-card" key={role.id}>
        <header>
          <div>
            <h4>{role.label}</h4>
            <p>{role.hint}</p>
          </div>
          <span className="staff-count-badge">
            <strong>{availableCount}</strong>
            <small>disp.</small>
          </span>
        </header>
        <div className="event-staff-card-stats">
          <span>{assignedCountLabel(roleAssignments.length)}</span>
          <span>{availableCount} disponible{availableCount === 1 ? '' : 's'}</span>
        </div>
        {assigned ? roleAssignments.map(renderAssigned) : <p className="empty compact">Sin contacto asignado.</p>}
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
              <span>Asignados al evento</span>
              <strong>{assignments.length}</strong>
            </article>
            <article>
              <span>Disponibles</span>
              <strong>{totalAvailableSlots}</strong>
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
                  <span className="staff-count-badge">
                    <strong>{availableCountFor('MOZOS')}</strong>
                    <small>disp.</small>
                  </span>
                </header>
                <div className="event-staff-card-stats">
                  <span>{assignedCountLabel(mozoAssignments.length)}</span>
                  <span>{availableCountFor('MOZOS')} disponible{availableCountFor('MOZOS') === 1 ? '' : 's'}</span>
                </div>
                <div className="event-staff-mozos-list">
                  {mozoAssignments.length === 0 ? (
                    <p className="empty compact">Aún no hay mozos asignados.</p>
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
  events,
  peruLocations,
  clientForm,
  updateClient,
  submitClient,
  saveClientEdit,
}: {
  mode: 'create' | 'registered'
  clients: Client[]
  events: EventItem[]
  peruLocations: PeruLocations
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
  const clientEditModal = useMobileModalBehavior(Boolean(editingClientId))
  const createLookupKeyRef = useRef('')
  const clientMetrics = useMemo(() => {
    const values = new Map<string, { eventCount: number; packageName?: string }>()
    clients.forEach((client) => values.set(client.id, { eventCount: 0 }))
    events
      .filter((event) => event.status === 'SEPARATED' || event.status === 'CONTRACTED')
      .forEach((event) => {
        const current = values.get(event.clientId)
        if (!current) return
        current.eventCount += 1
        if (!current.packageName && event.packageName) {
          current.packageName = event.packageName
        }
      })
    return values
  }, [clients, events])
  const provinceOptions = useMemo(
    () =>
      peruLocations.provinces.map((province) => ({
        value: province.ubigeo,
        label: `${province.name} (${province.departmentName})`,
      })),
    [peruLocations.provinces],
  )
  const createDistrictOptions = useMemo(
    () =>
      peruLocations.districts
        .filter((district) => district.provinceUbigeo === clientForm.provinceUbigeo)
        .map((district) => ({ value: district.ubigeo, label: district.name })),
    [clientForm.provinceUbigeo, peruLocations.districts],
  )
  const editingDistrictOptions = useMemo(
    () =>
      peruLocations.districts
        .filter((district) => district.provinceUbigeo === editingClientForm?.provinceUbigeo)
        .map((district) => ({ value: district.ubigeo, label: district.name })),
    [editingClientForm?.provinceUbigeo, peruLocations.districts],
  )

  function startEditingClient(client: Client) {
    setEditingClientId(client.id)
    setEditingClientForm({
      fullName: client.fullName ?? '',
      documentType: client.documentType ?? 'DNI',
      documentNumber: client.documentNumber ?? '',
      phone: client.phone ?? '',
      whatsapp: client.whatsapp ?? '',
      email: client.email ?? '',
      address: client.address ?? '',
      province: client.province ?? '',
      district: client.district ?? '',
      provinceUbigeo: client.provinceUbigeo ?? '',
      districtUbigeo: client.districtUbigeo ?? '',
      notes: client.notes ?? '',
    })
  }

  function updateEditingClient<K extends keyof ClientPayload>(key: K, value: ClientPayload[K]) {
    setEditingClientForm((current) => (current ? { ...current, [key]: value } : current))
  }

  function updateCreateProvince(provinceUbigeo: string) {
    const province = peruLocations.provinces.find((item) => item.ubigeo === provinceUbigeo)
    updateClient('provinceUbigeo', province?.ubigeo ?? '')
    updateClient('province', province?.name ?? '')
    updateClient('districtUbigeo', '')
    updateClient('district', '')
  }

  function updateCreateDistrict(districtUbigeo: string) {
    const district = peruLocations.districts.find((item) => item.ubigeo === districtUbigeo)
    updateClient('districtUbigeo', district?.ubigeo ?? '')
    updateClient('district', district?.name ?? '')
  }

  function updateEditingProvince(provinceUbigeo: string) {
    const province = peruLocations.provinces.find((item) => item.ubigeo === provinceUbigeo)
    setEditingClientForm((current) =>
      current
        ? {
            ...current,
            provinceUbigeo: province?.ubigeo ?? '',
            province: province?.name ?? '',
            districtUbigeo: '',
            district: '',
          }
        : current,
    )
  }

  function updateEditingDistrict(districtUbigeo: string) {
    const district = peruLocations.districts.find((item) => item.ubigeo === districtUbigeo)
    setEditingClientForm((current) =>
      current
        ? {
            ...current,
            districtUbigeo: district?.ubigeo ?? '',
            district: district?.name ?? '',
          }
        : current,
    )
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
              <label>
                Provincia
                <FancySelect
                  disabled={peruLocations.provinces.length === 0}
                  onChange={updateCreateProvince}
                  options={provinceOptions}
                  placeholder={peruLocations.provinces.length ? 'Seleccionar provincia' : 'Cargando provincias...'}
                  searchable
                  searchPlaceholder="Buscar provincia..."
                  mobileSearchTitle="Seleccionar provincia"
                  value={clientForm.provinceUbigeo ?? ''}
                />
              </label>
              <label>
                Distrito
                <FancySelect
                  disabled={!clientForm.provinceUbigeo}
                  onChange={updateCreateDistrict}
                  options={createDistrictOptions}
                  placeholder={clientForm.provinceUbigeo ? 'Seleccionar distrito' : 'Elige provincia primero'}
                  searchable
                  searchPlaceholder="Buscar distrito..."
                  mobileSearchTitle="Seleccionar distrito"
                  value={clientForm.districtUbigeo ?? ''}
                />
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
          <div
            className="quick-modal-layer client-edit-layer"
            onClick={() => {
              setEditingClientId(null)
              setEditingClientForm(null)
            }}
            role="presentation"
          >
            <div
              aria-labelledby="client-edit-title"
              aria-modal="true"
              className="modal-2026 quick-modal-card-mobile client-edit-modal"
              onClick={(event) => event.stopPropagation()}
              onPointerDownCapture={clientEditModal.handlePointerDown}
              ref={clientEditModal.modalRef}
              role="dialog"
            >
              <div className="modal-2026-head">
                <div>
                  <p className="eyebrow">Cliente</p>
                  <h3 id="client-edit-title">Editar cliente</h3>
                  <p className="muted">{editingClientForm.fullName || 'Cliente sin nombre'}</p>
                </div>
                <button
                  className="btn ghost"
                  onClick={() => {
                    setEditingClientId(null)
                    setEditingClientForm(null)
                  }}
                  type="button"
                >
                  <X size={16} />
                  Cerrar
                </button>
              </div>
              <form className="modal-2026-form" onSubmit={submitEditingClient}>
                <div className="modal-2026-body" ref={clientEditModal.modalBodyRef}>
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
                <label className="full">
                  Domicilio
                  <input value={editingClientForm.address} onChange={(e) => updateEditingClient('address', e.target.value)} />
                </label>
                <label>
                  Provincia
                  <FancySelect
                    disabled={peruLocations.provinces.length === 0}
                    onChange={updateEditingProvince}
                    options={provinceOptions}
                    placeholder={peruLocations.provinces.length ? 'Seleccionar provincia' : 'Cargando provincias...'}
                    searchable
                    searchPlaceholder="Buscar provincia..."
                    mobileSearchTitle="Seleccionar provincia"
                    value={editingClientForm.provinceUbigeo ?? ''}
                  />
                </label>
                <label>
                  Distrito
                  <FancySelect
                    disabled={!editingClientForm.provinceUbigeo}
                    onChange={updateEditingDistrict}
                    options={editingDistrictOptions}
                    placeholder={editingClientForm.provinceUbigeo ? 'Seleccionar distrito' : 'Elige provincia primero'}
                    searchable
                    searchPlaceholder="Buscar distrito..."
                    mobileSearchTitle="Seleccionar distrito"
                    value={editingClientForm.districtUbigeo ?? ''}
                  />
                </label>
                <label className="full">
                  Observaciones
                  <textarea value={editingClientForm.notes} onChange={(e) => updateEditingClient('notes', e.target.value)} />
                </label>
                  </div>
                </div>
              <div className="form-actions modal-2026-actions">
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
          </div>
        )}
        <div className="client-color-legend" aria-label="Leyenda de colores por paquete">
          <span className="client-color-legend-title">Leyenda de paquetes</span>
          <span><i className="legend-dot areli" /> Paquete Areli / VIP</span>
          <span><i className="legend-dot premium" /> Paquete Premium</span>
          <span><i className="legend-dot basic" /> Paquete Basico</span>
          <span><i className="legend-dot school" /> Promociones escolares</span>
          <span><i className="legend-dot none" /> Sin eventos activos</span>
        </div>
        <div className="item-list">
          {clients.length === 0 && <p className="empty">Registra el primer cliente para separar eventos.</p>}
          {clients.map((client) => {
            const metrics = clientMetrics.get(client.id) ?? { eventCount: 0 }
            return (
            <article className={`item-card client-card ${clientPackageClass(metrics.packageName)}`} key={client.id}>
              <header>
                <strong>{client.fullName}</strong>
                <span>
                  {client.documentNumber ? `${client.documentType ?? 'DNI'}: ${client.documentNumber}` : 'Sin documento'}
                </span>
              </header>
              <p>
                {client.whatsapp || client.phone || 'Sin teléfono'} {client.email ? `- ${client.email}` : ''}
              </p>
              <p>Domicilio: {client.address || 'Sin domicilio registrado'}</p>
              <p>Ubicación: {[client.district, client.province].filter(Boolean).join(' - ') || 'Sin provincia/distrito'}</p>
              <div className="client-card-meta">
                <span>Numero de eventos: {metrics.eventCount}</span>
                {metrics.packageName && <span>{clientPackageLabel(metrics.packageName)}</span>}
              </div>
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
            )
          })}
        </div>
      </div>
    </section>
  )
}

function clientPackageClass(packageName?: string) {
  const value = normalizeSearchText(packageName ?? '')
  if (!value) return ''
  if (value.includes('areli')) return 'client-package-areli'
  if (value.includes('premium')) return 'client-package-premium'
  if (value.includes('basico')) return 'client-package-basic'
  if (value.includes('promocion') || value.includes('escolar')) {
    return 'client-package-school'
  }
  return ''
}

function clientPackageLabel(packageName?: string) {
  const value = normalizeSearchText(packageName ?? '')
  if (value.includes('areli')) return 'VIP Areli'
  return packageName ?? ''
}

function normalizeSearchText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function PackagesView({
  packages,
  onPackagesChanged,
}: {
  packages: EventPackage[]
  onPackagesChanged: () => Promise<void>
}) {
  const [editingPackage, setEditingPackage] = useState<EventPackage | null>(null)
  const [packageForm, setPackageForm] = useState<EventPackagePayload>(emptyPackagePayload())
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false)
  const [packageBusy, setPackageBusy] = useState(false)
  const [packageNotice, setPackageNotice] = useState('')
  const packageModal = useMobileModalBehavior(isPackageModalOpen)

  function openCreatePackage() {
    setEditingPackage(null)
    setPackageForm(emptyPackagePayload())
    setPackageNotice('')
    setIsPackageModalOpen(true)
  }

  function openEditPackage(eventPackage: EventPackage) {
    setEditingPackage(eventPackage)
    setPackageForm(packageToPayload(eventPackage))
    setPackageNotice('')
    setIsPackageModalOpen(true)
  }

  function updatePackageForm<K extends keyof EventPackagePayload>(key: K, value: EventPackagePayload[K]) {
    setPackageForm((current) => ({ ...current, [key]: value }))
  }

  async function submitPackage(event: FormEvent) {
    event.preventDefault()
    setPackageBusy(true)
    setPackageNotice('')
    try {
      const payload = cleanPackagePayload(packageForm)
      if (editingPackage) {
        await api.updatePackage(editingPackage.id, payload)
        setPackageNotice('Paquete actualizado correctamente.')
      } else {
        await api.createPackage(payload)
        setPackageNotice('Paquete comercial creado correctamente.')
      }
      setIsPackageModalOpen(false)
      await onPackagesChanged()
    } catch (error) {
      setPackageNotice(error instanceof Error ? error.message : 'No se pudo guardar el paquete.')
    } finally {
      setPackageBusy(false)
    }
  }

  async function togglePackage(eventPackage: EventPackage) {
    setPackageBusy(true)
    setPackageNotice('')
    try {
      await api.updatePackage(eventPackage.id, {
        ...packageToPayload(eventPackage),
        active: !eventPackage.active,
      })
      await onPackagesChanged()
      setPackageNotice(eventPackage.active ? 'Paquete desactivado.' : 'Paquete activado.')
    } catch (error) {
      setPackageNotice(error instanceof Error ? error.message : 'No se pudo cambiar el estado del paquete.')
    } finally {
      setPackageBusy(false)
    }
  }

  return (
    <>
      <section className="grid packages-layout">
        <div className="panel packages-toolbar">
          <div>
            <h2>Paquetes comerciales</h2>
            <p className="settings-intro">Gestiona precios, capacidad, garantia y condiciones del contrato.</p>
          </div>
          <button className="btn primary" onClick={openCreatePackage} type="button">
            <Plus size={17} />
            Crear paquete comercial
          </button>
        </div>

        {packageNotice && <p className="message ok">{packageNotice}</p>}

        <div className="packages-card-grid">
          {packages.map((eventPackage) => (
            <article className={`item-card package-card ${eventPackage.active ? '' : 'inactive'}`} key={eventPackage.id}>
              <header>
                <strong>{eventPackage.name}</strong>
                <span>{money.format(eventPackage.basePrice)}</span>
              </header>
              <p>{eventPackage.includedServices || 'Sin descripcion registrada.'}</p>
              <p>
                Capacidad: {eventPackage.includedCapacity ?? 'Por definir'} - Garantia:{' '}
                {money.format(eventPackage.guaranteeAmount ?? 0)}
              </p>
              <p>{eventPackage.terms || 'Sin condiciones registradas.'}</p>
              <div className="package-card-actions">
                <span className={`status ${eventPackage.active ? 'CONTRACTED' : 'CANCELLED'}`}>
                  {eventPackage.active ? 'Activo' : 'Inactivo'}
                </span>
                <button className="btn ghost" onClick={() => openEditPackage(eventPackage)} type="button">
                  Editar
                </button>
                <button className="btn icon" disabled={packageBusy} onClick={() => void togglePackage(eventPackage)} type="button">
                  {eventPackage.active ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {isPackageModalOpen && (
        <div className="quick-modal-layer package-modal-layer" onClick={() => setIsPackageModalOpen(false)} role="presentation">
          <div
            aria-labelledby="package-modal-title"
            aria-modal="true"
            className="modal-2026 quick-modal-card-mobile package-modal"
            ref={packageModal.modalRef}
            role="dialog"
            onClick={(event) => event.stopPropagation()}
            onPointerDownCapture={packageModal.handlePointerDown}
          >
            <div className="modal-2026-head">
              <div>
                <p className="eyebrow">Paquete comercial</p>
                <h3 id="package-modal-title">{editingPackage ? 'Editar paquete' : 'Crear paquete comercial'}</h3>
              </div>
              <button className="btn ghost" onClick={() => setIsPackageModalOpen(false)} type="button">
                <X size={16} />
                Cerrar
              </button>
            </div>
            <form className="modal-2026-form" onSubmit={submitPackage}>
              <div className="modal-2026-body" ref={packageModal.modalBodyRef}>
                <div className="form-grid">
                  <label>
                    Nombre del paquete
                    <input value={packageForm.name} onChange={(event) => updatePackageForm('name', event.target.value)} required />
                  </label>
                  <label>
                    Tipo sugerido
                    <input value={packageForm.eventType ?? ''} onChange={(event) => updatePackageForm('eventType', event.target.value)} />
                  </label>
                  <label>
                    Precio
                    <input
                      min="0"
                      step="0.01"
                      type="number"
                      value={packageForm.basePrice}
                      onChange={(event) => updatePackageForm('basePrice', Number(event.target.value))}
                      required
                    />
                  </label>
                  <label>
                    Capacidad
                    <input
                      min="0"
                      type="number"
                      value={packageForm.includedCapacity ?? ''}
                      onChange={(event) => updatePackageForm('includedCapacity', event.target.value ? Number(event.target.value) : undefined)}
                      placeholder="Por definir"
                    />
                  </label>
                  <label>
                    Garantia
                    <input
                      min="0"
                      step="0.01"
                      type="number"
                      value={packageForm.guaranteeAmount ?? 0}
                      onChange={(event) => updatePackageForm('guaranteeAmount', Number(event.target.value))}
                    />
                  </label>
                  <label>
                    Estado
                    <FancySelect
                      value={packageForm.active === false ? 'inactive' : 'active'}
                      onChange={(value) => updatePackageForm('active', value === 'active')}
                      options={[
                        { value: 'active', label: 'Activo' },
                        { value: 'inactive', label: 'Inactivo' },
                      ]}
                    />
                  </label>
                  <label className="full">
                    Descripcion del paquete
                    <textarea
                      value={packageForm.includedServices ?? ''}
                      onChange={(event) => updatePackageForm('includedServices', event.target.value)}
                    />
                  </label>
                  <label className="full">
                    Condiciones comerciales
                    <textarea value={packageForm.terms ?? ''} onChange={(event) => updatePackageForm('terms', event.target.value)} />
                  </label>
                </div>
              </div>
              <div className="form-actions modal-2026-actions">
                <button className="btn ghost" onClick={() => setIsPackageModalOpen(false)} type="button">
                  Cancelar
                </button>
                <button className="btn primary" disabled={packageBusy} type="submit">
                  <Save size={16} />
                  {packageBusy ? 'Guardando...' : 'Guardar paquete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )

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

function emptyPackagePayload(): EventPackagePayload {
  return {
    name: '',
    eventType: '',
    basePrice: 0,
    includedCapacity: undefined,
    guaranteeAmount: 0,
    includedServices: '',
    terms: '',
    active: true,
  }
}

function packageToPayload(eventPackage: EventPackage): EventPackagePayload {
  return {
    name: eventPackage.name,
    eventType: eventPackage.eventType ?? '',
    basePrice: Number(eventPackage.basePrice ?? 0),
    includedCapacity: eventPackage.includedCapacity,
    guaranteeAmount: Number(eventPackage.guaranteeAmount ?? 0),
    includedServices: eventPackage.includedServices ?? '',
    terms: eventPackage.terms ?? '',
    active: eventPackage.active,
  }
}

function cleanPackagePayload(payload: EventPackagePayload): EventPackagePayload {
  return {
    ...payload,
    eventType: payload.eventType?.trim() || undefined,
    includedServices: payload.includedServices?.trim() || undefined,
    terms: payload.terms?.trim() || undefined,
    includedCapacity: payload.includedCapacity && payload.includedCapacity > 0 ? payload.includedCapacity : undefined,
    guaranteeAmount: Number(payload.guaranteeAmount ?? 0),
    basePrice: Number(payload.basePrice ?? 0),
    active: payload.active !== false,
  }
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
  updateInventoryItem,
}: {
  floors: Floor[]
  inventory: InventoryDashboard | null
  inventoryForm: InventoryPayload
  mode: 'list' | 'create'
  updateInventory: <K extends keyof InventoryPayload>(key: K, value: InventoryPayload[K]) => void
  submitInventory: (event: FormEvent) => Promise<void>
  removeInventoryItem: (item: InventoryItem) => Promise<void>
  updateInventoryItem: (id: string, payload: InventoryPayload) => Promise<void>
}) {
  const [pisoFilter, setPisoFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const categories = inventory?.categories ?? []
  const selectedCategory = categories.find((category) => category.id === inventoryForm.categoriaId)
  const subcategoryOptions = selectedCategory?.subcategorias ?? []
  const formUnitValue =
    Number(inventoryForm.cantidad || 0) > 0 ? Number(inventoryForm.valorTotal || 0) / Number(inventoryForm.cantidad) : 0
  const [editingInventoryItem, setEditingInventoryItem] = useState<InventoryItem | null>(null)
  const [editingInventoryForm, setEditingInventoryForm] = useState<InventoryPayload | null>(null)
  const [inventoryEditBusy, setInventoryEditBusy] = useState(false)
  const inventoryEditModal = useMobileModalBehavior(Boolean(editingInventoryItem))
  const editingCategory = categories.find((category) => category.id === editingInventoryForm?.categoriaId)
  const editingSubcategoryOptions = editingCategory?.subcategorias ?? []
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
  const editingUnitValue =
    editingInventoryForm && Number(editingInventoryForm.cantidad || 0) > 0
      ? Number(editingInventoryForm.valorTotal || 0) / Number(editingInventoryForm.cantidad)
      : 0

  function openInventoryEdit(item: InventoryItem) {
    setEditingInventoryItem(item)
    setEditingInventoryForm(inventoryItemToPayload(item))
  }

  function updateEditingInventory<K extends keyof InventoryPayload>(key: K, value: InventoryPayload[K]) {
    setEditingInventoryForm((current) => (current ? { ...current, [key]: value } : current))
  }

  function updateEditingInventoryQuantity(quantity: number) {
    setEditingInventoryForm((current) => {
      if (!current) return current
      const currentUnitValue = Number(current.cantidad || 0) > 0 ? Number(current.valorTotal || 0) / Number(current.cantidad) : 0
      return {
        ...current,
        cantidad: quantity,
        valorTotal: Number((currentUnitValue * quantity).toFixed(2)),
      }
    })
  }

  function updateEditingInventoryUnitValue(unitValue: number) {
    setEditingInventoryForm((current) => {
      if (!current) return current
      return {
        ...current,
        valorTotal: Number((unitValue * Number(current.cantidad || 0)).toFixed(2)),
      }
    })
  }

  async function submitInventoryEdit(event: FormEvent) {
    event.preventDefault()
    if (!editingInventoryItem || !editingInventoryForm) return
    setInventoryEditBusy(true)
    try {
      await updateInventoryItem(editingInventoryItem.id, {
        ...editingInventoryForm,
        piso: canonicalInventoryPiso(editingInventoryForm.piso),
        cantidad: Number(editingInventoryForm.cantidad),
        valorTotal: Number(editingInventoryForm.valorTotal),
        descripcion: editingInventoryForm.descripcion || undefined,
        ubicacion: editingInventoryForm.ubicacion || undefined,
        observacion: editingInventoryForm.observacion || undefined,
      })
      setEditingInventoryItem(null)
      setEditingInventoryForm(null)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo actualizar el articulo.')
    } finally {
      setInventoryEditBusy(false)
    }
  }
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
        <InventoryTable items={filteredItems} onEditItem={openInventoryEdit} removeInventoryItem={removeInventoryItem} />
      </div>
      )}
      {editingInventoryItem && editingInventoryForm && (
        <div
          className="quick-modal-layer inventory-edit-layer"
          onClick={() => {
            setEditingInventoryItem(null)
            setEditingInventoryForm(null)
          }}
          role="presentation"
        >
          <div
            aria-labelledby="inventory-edit-title"
            aria-modal="true"
            className="modal-2026 quick-modal-card-mobile inventory-edit-modal"
            ref={inventoryEditModal.modalRef}
            role="dialog"
            onClick={(event) => event.stopPropagation()}
            onPointerDownCapture={inventoryEditModal.handlePointerDown}
          >
            <div className="modal-2026-head">
              <div>
                <p className="eyebrow">Inventario</p>
                <h3 id="inventory-edit-title">Editar articulo</h3>
              </div>
              <button
                className="btn ghost"
                onClick={() => {
                  setEditingInventoryItem(null)
                  setEditingInventoryForm(null)
                }}
                type="button"
              >
                <X size={16} />
                Cerrar
              </button>
            </div>
            <form className="modal-2026-form" onSubmit={submitInventoryEdit}>
              <div className="modal-2026-body" ref={inventoryEditModal.modalBodyRef}>
                <div className="form-grid">
                  <label>
                    Piso
                    <FancySelect
                      value={canonicalInventoryPiso(editingInventoryForm.piso)}
                      onChange={(nextValue) => updateEditingInventory('piso', canonicalInventoryPiso(nextValue))}
                      options={pisoOptions}
                    />
                  </label>
                  <label>
                    Categoria
                    <FancySelect
                      value={editingInventoryForm.categoriaId}
                      onChange={(nextValue) => {
                        const nextCategory = categories.find((category) => category.id === nextValue)
                        updateEditingInventory('categoriaId', nextValue)
                        updateEditingInventory('subcategoriaId', nextCategory?.subcategorias[0]?.id ?? '')
                      }}
                      options={categories.map((category) => ({ value: category.id, label: category.nombre }))}
                    />
                  </label>
                  <label>
                    Subcategoria
                    <FancySelect
                      value={editingInventoryForm.subcategoriaId}
                      onChange={(nextValue) => updateEditingInventory('subcategoriaId', nextValue)}
                      options={editingSubcategoryOptions.map((subcategory) => ({ value: subcategory.id, label: subcategory.nombre }))}
                    />
                  </label>
                  <label className="full">
                    Articulo
                    <input value={editingInventoryForm.nombre} onChange={(event) => updateEditingInventory('nombre', event.target.value)} required />
                  </label>
                  <label>
                    Cantidad
                    <input
                      min="0.01"
                      step="0.01"
                      type="number"
                      value={editingInventoryForm.cantidad}
                      onChange={(event) => updateEditingInventoryQuantity(Number(event.target.value))}
                      required
                    />
                  </label>
                  <label>
                    Unidad
                    <input
                      value={editingInventoryForm.unidadMedida}
                      onChange={(event) => updateEditingInventory('unidadMedida', event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Valor unitario
                    <input
                      min="0"
                      step="0.01"
                      type="number"
                      value={Number(editingUnitValue.toFixed(2))}
                      onChange={(event) => updateEditingInventoryUnitValue(Number(event.target.value))}
                      required
                    />
                  </label>
                  <label>
                    Estado
                    <FancySelect
                      value={editingInventoryForm.estado}
                      onChange={(nextValue) => updateEditingInventory('estado', nextValue as InventoryStatus)}
                      options={Object.entries(inventoryStatusLabels).map(([value, label]) => ({ value, label }))}
                    />
                  </label>
                  <label>
                    Ubicacion
                    <input value={editingInventoryForm.ubicacion} onChange={(event) => updateEditingInventory('ubicacion', event.target.value)} />
                  </label>
                  <label>
                    Descripcion
                    <input value={editingInventoryForm.descripcion} onChange={(event) => updateEditingInventory('descripcion', event.target.value)} />
                  </label>
                  <label className="full">
                    Observaciones
                    <textarea value={editingInventoryForm.observacion} onChange={(event) => updateEditingInventory('observacion', event.target.value)} />
                  </label>
                </div>
                <div className="inventory-form-total">
                  Total recalculado: <strong>{money.format(Number(editingInventoryForm.valorTotal || 0))}</strong>
                </div>
              </div>
              <div className="form-actions modal-2026-actions">
                <button
                  className="btn ghost"
                  onClick={() => {
                    setEditingInventoryItem(null)
                    setEditingInventoryForm(null)
                  }}
                  type="button"
                >
                  Cancelar
                </button>
                <button className="btn primary" disabled={inventoryEditBusy} type="submit">
                  <Save size={16} />
                  {inventoryEditBusy ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

function inventoryItemToPayload(item: InventoryItem): InventoryPayload {
  return {
    piso: canonicalInventoryPiso(item.piso),
    categoriaId: item.categoriaId,
    subcategoriaId: item.subcategoriaId,
    nombre: item.nombre,
    descripcion: item.descripcion ?? '',
    cantidad: Number(item.cantidad ?? 1),
    unidadMedida: item.unidadMedida,
    valorTotal: Number(item.valorTotal ?? 0),
    estado: item.estado,
    ubicacion: item.ubicacion ?? '',
    observacion: item.observacion ?? '',
  }
}

function InventoryTable({
  items,
  onEditItem,
  removeInventoryItem,
}: {
  items: InventoryItem[]
  onEditItem: (item: InventoryItem) => void
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
                    className="btn icon"
                    onClick={() => onEditItem(item)}
                    title="Editar articulo"
                    type="button"
                  >
                    Editar
                  </button>
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
                className="btn icon"
                onClick={() => onEditItem(item)}
                title="Editar articulo"
                type="button"
              >
                Editar
              </button>
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

type AiEventDraft = Partial<EventPayload> & {
  clientName?: string
  clientPhone?: string
  clientDocumentType?: DocumentType
  clientDocumentNumber?: string
  clientEmail?: string
  floorName?: string
  packageName?: string
  apdaycConfirmed?: boolean
  capacityFromPackage?: boolean
}

type AiChatMessage = {
  id: string
  role: 'assistant' | 'user'
  text: string
}

type AiDetectedResult = {
  draft: AiEventDraft
  detected: string[]
  clientMatches: AiClientMatch[]
}

type AiClientMatch = {
  id: string
  name: string
  phone: string
  documentType?: DocumentType
  documentNumber?: string
  detail: string
  score: number
}

type AiMissingField =
  | 'client'
  | 'clientDocument'
  | 'floor'
  | 'package'
  | 'eventType'
  | 'title'
  | 'date'
  | 'time'
  | 'capacity'
  | 'amount'
  | 'apdayc'

const monthNameToNumber: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
}

function newAiDraft(): AiEventDraft {
  return {
    status: 'SEPARATED',
  }
}

function aiMessageId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeAiText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function aiTitleFromDraft(draft: AiEventDraft, clientName?: string) {
  if (!draft.eventType) return draft.title ?? ''
  return `${draft.eventType} - ${clientName || draft.clientName || 'Cliente pendiente'}`
}

function normalizeAiMoney(value: string) {
  return Number(value.replace(',', '.'))
}

function formatAiDraftValue(value: unknown) {
  if (value === undefined || value === null || value === '') return 'Pendiente'
  if (typeof value === 'number') return value > 0 ? money.format(value) : 'Pendiente'
  return String(value)
}

function findAiDraftPackage(draft: AiEventDraft, packages: EventPackage[]) {
  return (
    packages.find((eventPackage) => eventPackage.id === draft.packageId) ??
    packages.find((eventPackage) => normalizeAiText(eventPackage.name) === normalizeAiText(draft.packageName ?? ''))
  )
}

function packageCapacityValue(eventPackage?: EventPackage) {
  const capacity = Number(eventPackage?.includedCapacity ?? 0)
  return Number.isFinite(capacity) && capacity > 0 ? capacity : 0
}

function resolvedAiCapacity(draft: AiEventDraft, packages: EventPackage[]) {
  const packageCapacity = packageCapacityValue(findAiDraftPackage(draft, packages))
  if (draft.capacityFromPackage && packageCapacity > 0) return packageCapacity
  const draftCapacity = Number(draft.contractCapacityOverride ?? 0)
  if (Number.isFinite(draftCapacity) && draftCapacity > 0) return draftCapacity
  return packageCapacity
}

function normalizeIaAction(action?: string) {
  return normalizeAiText(action ?? '').replace(/\s+/g, '_').toUpperCase()
}

function isAiDraftAction(action?: string) {
  return ['CREAR_EVENTO', 'ACTUALIZAR_EVENTO'].includes(normalizeIaAction(action))
}

function isAiSmallTalkMessage(text: string) {
  const normalized = normalizeAiText(text).replace(/[¿?¡!.,;:]+/g, '').trim()
  if (!normalized) return true
  const hasEventIntent =
    /\b(evento|reserva|separ|crear|registrar|boda|matrimonio|cumple|quince|promo|promocion|cliente|dni|ruc|telefono|whatsapp|piso|ambiente|paquete|monto|total|capacidad|fecha|hora|apdayc|dj|mozo|fotografo|videografo|barman|decoracion)\b/.test(
      normalized,
    ) || aiHasApdaycMention(normalized)
  if (hasEventIntent) return false
  return /^(hola|buenas|buenos dias|buenas tardes|buenas noches|gracias|ok|okay|listo|ayuda|que puedes hacer|como funciona|quien eres)(\s|$)/.test(
    normalized,
  )
}

function aiDigits(value: string) {
  return value.replace(/\D/g, '')
}

function parseAiDocument(text: string): { documentType: DocumentType; documentNumber: string } | null {
  const normalized = normalizeAiText(text)
  const ruc = normalized.match(/\bruc\s*:?\s*(\d{11})\b/) ?? normalized.match(/\b(10\d{9}|20\d{9})\b/)
  if (ruc) {
    return { documentType: 'RUC', documentNumber: ruc[1] }
  }
  const looseRuc = normalized.match(/\b(\d{11})\b/)
  if (looseRuc && !normalized.includes('monto') && !normalized.includes('total') && !aiHasApdaycMention(normalized)) {
    return { documentType: 'RUC', documentNumber: looseRuc[1] }
  }
  const dni = normalized.match(/\bdni\s*:?\s*(\d{8})\b/)
  if (dni) {
    return { documentType: 'DNI', documentNumber: dni[1] }
  }
  const looseDni = normalized.match(/\b(\d{8})\b/)
  if (looseDni && !normalized.includes('monto') && !normalized.includes('total')) {
    return { documentType: 'DNI', documentNumber: looseDni[1] }
  }
  return null
}

function validAiClientDocument(draft: AiEventDraft) {
  const digits = aiDigits(draft.clientDocumentNumber ?? '')
  return draft.clientDocumentType === 'RUC' ? digits.length === 11 : digits.length === 8
}

function isAiApdaycComplete(draft: AiEventDraft) {
  if (!draft.apdaycConfirmed) return false
  if (draft.apdaycStatus === 'NOT_APPLIES') return true
  const amount = Number(draft.apdaycAmount)
  return Boolean(draft.apdaycPayer && draft.apdaycStatus && Number.isFinite(amount) && amount > 0)
}

function formatAiApdaycDraft(draft: AiEventDraft) {
  if (!draft.apdaycConfirmed) return 'Pendiente'
  if (draft.apdaycStatus === 'NOT_APPLIES') return 'No aplica'
  const amountValue = Number(draft.apdaycAmount)
  const amount = Number.isFinite(amountValue) && amountValue > 0 ? money.format(amountValue) : 'Monto pendiente'
  const payer = draft.apdaycPayer ? apdaycPayerLabels[draft.apdaycPayer] : 'Responsable pendiente'
  return `${amount} - ${payer}`
}

function extractAiClientQuery(text: string) {
  if (isAiSmallTalkMessage(text)) return ''

  const explicit = text.match(
    /\b(?:buscar cliente|cliente|para|a nombre de)\s+(.+?)(?=\s+(?:el|en|con|paquete|desde|de\s+\d|a\s+las|telefono|tel|whatsapp|dni|ruc|monto|total|capacidad)\b|[.,;]|$)/i,
  )
  if (explicit?.[1]) {
    return explicit[1].replace(/[.,;]+$/g, '').trim()
  }

  const compact = text.replace(/[.,;]+$/g, '').trim()
  const normalized = normalizeAiText(compact)
  const words = normalized.split(' ').filter(Boolean)
  const looksLikeOnlyAName =
    words.length > 0 &&
    words.length <= 4 &&
    /[a-záéíóúñ]/i.test(compact) &&
    !/\d/.test(compact) &&
    !/\b(matrimonio|boda|cumple|quince|promo|promocion|piso|ambiente|paquete|monto|total|capacidad|apdayc|resumen|limpiar|nuevo)\b/.test(normalized)

  return looksLikeOnlyAName ? compact : ''
}

function looksLikeClientOnlyAnswer(text: string) {
  const normalized = normalizeAiText(text).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!normalized) return false
  if (parseAiDocument(normalized)) return true
  if (/\b9\d{8}\b/.test(normalized)) return true
  const words = normalized.split(' ').filter(Boolean)
  return (
    words.length > 0 &&
    words.length <= 5 &&
    /[a-z]/.test(normalized) &&
    !/\b(evento|reserva|separ|crear|registrar|boda|matrimonio|cumple|quince|promo|promocion|piso|ambiente|paquete|monto|total|capacidad|fecha|hora|apdayc|apday|apdac|apdyc|dj|mozo|fotografo|videografo|barman|decoracion|limpiar|resumen|nuevo)\b/.test(
      normalized,
    )
  )
}

function applyAiClientOnlyAnswer(message: string, currentDraft: AiEventDraft, clients: Client[]): AiDetectedResult | null {
  if (!looksLikeClientOnlyAnswer(message)) return null
  const document = parseAiDocument(message)
  const phone = message.match(/\b9\d{8}\b/)?.[0]
  const searchText = document
    ? `${document.documentType} ${document.documentNumber}`
    : phone
      ? phone
      : `cliente ${message}`
  const matches = searchAiClientMatches(searchText, clients)
  const selected = matches.length === 1 && shouldAutoSelectAiClient(searchText, matches[0]) ? matches[0] : null
  const nextDraft: AiEventDraft = { ...currentDraft }
  const detected: string[] = []

  if (selected) {
    nextDraft.clientId = selected.id
    nextDraft.clientName = selected.name
    nextDraft.clientPhone = selected.phone || nextDraft.clientPhone
    nextDraft.clientDocumentType = selected.documentType || nextDraft.clientDocumentType
    nextDraft.clientDocumentNumber = selected.documentNumber || nextDraft.clientDocumentNumber
    nextDraft.title = nextDraft.eventType ? aiTitleFromDraft({ ...nextDraft, clientName: selected.name }) : nextDraft.title
    detected.push('cliente registrado')
    return { draft: nextDraft, detected, clientMatches: [] }
  }

  if (document) {
    nextDraft.clientId = ''
    nextDraft.clientDocumentType = document.documentType
    nextDraft.clientDocumentNumber = document.documentNumber
    detected.push(document.documentType)
  } else if (phone) {
    nextDraft.clientPhone = phone
    detected.push('telefono de cliente')
  } else {
    nextDraft.clientId = ''
    nextDraft.clientName = message.trim()
    nextDraft.title = nextDraft.eventType ? aiTitleFromDraft(nextDraft, message.trim()) : nextDraft.title
    detected.push('nombre de cliente')
  }

  return { draft: nextDraft, detected, clientMatches: matches }
}

function clientAiDetail(client: Client) {
  const document = client.documentNumber ? `${client.documentType ?? 'Doc'} ${client.documentNumber}` : 'Sin documento'
  const phone = contractualContactNumber(client) || 'Sin telefono'
  return `${document} - ${phone}`
}

function toAiClientMatch(client: Client, score: number): AiClientMatch {
  return {
    id: client.id,
    name: client.fullName,
    phone: contractualContactNumber(client),
    documentType: client.documentType,
    documentNumber: client.documentNumber,
    detail: clientAiDetail(client),
    score,
  }
}

function searchAiClientMatches(text: string, clients: Client[]) {
  const normalized = normalizeAiText(text)
  const document = parseAiDocument(text)
  const phone = text.match(/\b9\d{8}\b/)?.[0]
  const query = normalizeAiText(extractAiClientQuery(text))
  const queryTokens = query
    .split(' ')
    .filter((token) => token.length > 2 && !['cliente', 'para', 'evento', 'matrimonio', 'cumpleanos'].includes(token))

  return clients
    .map((client) => {
      const name = normalizeAiText(client.fullName)
      const clientDocument = aiDigits(client.documentNumber ?? '')
      const clientPhone = `${aiDigits(client.phone ?? '')} ${aiDigits(client.whatsapp ?? '')}`.trim()
      let score = 0

      if (document && clientDocument === document.documentNumber) score += 120
      if (phone && clientPhone.includes(phone)) score += 90
      if (query && name === query) score += 80
      if (query && name.includes(query)) score += 55
      score += queryTokens.filter((token) => name.includes(token)).length * 16
      if (!query && normalized.includes(name)) score += 70

      return score > 0 ? toAiClientMatch(client, score) : null
    })
    .filter((match): match is AiClientMatch => Boolean(match))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
}

function shouldAutoSelectAiClient(text: string, match: AiClientMatch) {
  const document = parseAiDocument(text)
  const phone = text.match(/\b9\d{8}\b/)?.[0]
  const query = normalizeAiText(extractAiClientQuery(text))
  const normalizedName = normalizeAiText(match.name)
  const normalizedText = normalizeAiText(text)

  if (document && match.documentNumber === document.documentNumber) return true
  if (phone && aiDigits(match.phone).includes(phone)) return true
  if (query && query === normalizedName) return true
  if (!query && normalizedText.includes(normalizedName)) return true
  return false
}

function inferEventTypeFromText(normalized: string) {
  if (/\b(matri|matrimonio|boda)\b/.test(normalized)) return 'Matrimonio'
  if (/\b(15|quince|quincean|cumple de 15)\b/.test(normalized)) return '15 años'
  if (/\b(promo|promocion)\b/.test(normalized)) return 'Promoción'
  if (/\b(cumple|cumpleanos|birthday)\b/.test(normalized)) return 'Cumpleaños'
  if (/\b(bautizo|bautismo)\b/.test(normalized)) return 'Bautizo'
  if (/\b(corporativo|empresa|institucional)\b/.test(normalized)) return 'Corporativo'
  return ''
}

function parseAiDate(text: string) {
  const normalized = normalizeAiText(text)
  const iso = normalized.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/)
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`
  }
  const slash = normalized.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/)
  if (slash) {
    const year = slash[3] ? Number(slash[3].length === 2 ? `20${slash[3]}` : slash[3]) : new Date().getFullYear()
    return `${year}-${slash[2].padStart(2, '0')}-${slash[1].padStart(2, '0')}`
  }
  const monthMatch = normalized.match(/\b(\d{1,2})\s*(?:de\s*)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/)
  if (monthMatch) {
    const day = Number(monthMatch[1])
    const month = monthNameToNumber[monthMatch[2]]
    const today = new Date()
    let year = today.getFullYear()
    const candidate = new Date(year, month - 1, day)
    if (candidate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
      year += 1
    }
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
  return ''
}

function normalizeAiHour(hourValue: string, minuteValue: string | undefined, suffix: string | undefined, isEnd: boolean, startHour: number, normalizedText: string) {
  let hour = Number(hourValue)
  const minute = minuteValue ?? '00'
  const cleanSuffix = suffix ?? ''
  if (cleanSuffix === 'am' && hour === 12) hour = 0
  if (cleanSuffix === 'pm' && hour < 12) hour += 12
  if ((cleanSuffix === 'noche' || cleanSuffix === 'tarde') && hour < 12) hour += 12
  if (cleanSuffix === 'madrugada' && hour === 12) hour = 0
  if (!cleanSuffix && !isEnd && hour >= 5 && hour <= 11 && (normalizedText.includes('noche') || normalizedText.includes('pm'))) {
    hour += 12
  }
  if (!cleanSuffix && !isEnd && hour >= 6 && hour <= 11 && normalizedText.match(/\b\d{1,2}\s*(?:a|hasta|-)\s*\d{1,2}\b/)) {
    hour += 12
  }
  if (!cleanSuffix && isEnd && hour > 12) {
    hour = hour % 24
  }
  if (!cleanSuffix && isEnd && hour > 0 && hour <= 6 && startHour >= 12) {
    return `${String(hour).padStart(2, '0')}:${minute}`
  }
  return `${String(hour).padStart(2, '0')}:${minute}`
}

function parseAiTimeRange(text: string) {
  const normalized = normalizeAiText(text)
  const range = normalized.match(/\b(?:de\s*)?(?:las\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|noche|tarde|madrugada)?\s*(?:a|hasta|-)\s*(?:las\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|noche|tarde|madrugada)?\b/)
  if (!range) return null
  const start = normalizeAiHour(range[1], range[2], range[3], false, 0, normalized)
  const startHour = Number(start.slice(0, 2))
  const end = normalizeAiHour(range[4], range[5], range[6], true, startHour, normalized)
  return { startTime: start, endTime: end }
}

function findAiClient(text: string, clients: Client[]) {
  const matches = searchAiClientMatches(text, clients)
  const confident = matches[0]
  if (confident && shouldAutoSelectAiClient(text, confident)) {
    return confident
  }
  if (matches.length > 0) {
    return null
  }

  const guessedName = extractAiClientQuery(text)
  if (guessedName && guessedName.length > 2) {
    return { id: '', name: guessedName, phone: '', detail: 'Cliente nuevo pendiente de DNI/RUC y telefono', score: 0 }
  }
  return null
}

function aiIncludesAny(value: string, options: string[]) {
  return options.some((option) => value.includes(option))
}

function aiEditDistance(a: string, b: string) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0]
    previous[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const saved = previous[j]
      previous[j] = a[i - 1] === b[j - 1]
        ? diagonal
        : Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + 1)
      diagonal = saved
    }
  }
  return previous[b.length]
}

function aiWordLikeAny(tokens: string[], targets: string[]) {
  return tokens.some((token) =>
    targets.some((target) => {
      if (token === target || token.includes(target) || target.includes(token)) return true
      if (token.length < 4 || target.length < 4) return false
      const allowed = target.length >= 7 ? 3 : 2
      return aiEditDistance(token, target) <= allowed
    }),
  )
}

function aiIsApdaycTokenLike(token: string) {
  const clean = token.replace(/[^a-z]/g, '')
  if (!clean) return false
  if (['apdayc', 'apday', 'apdac', 'apdyc', 'apdacy', 'apdaic', 'apdeyc', 'apdai', 'apdic', 'apd'].includes(clean)) {
    return true
  }
  if (clean.includes('apdayc') || clean.includes('apday') || clean.includes('apdac')) return true
  return clean.length >= 4 && clean.length <= 9 && aiEditDistance(clean, 'apdayc') <= 2
}

function aiHasApdaycMention(text: string) {
  const normalized = normalizeAiText(text).replace(/[^a-z0-9\s/.,]/g, ' ')
  const compact = normalized.replace(/\s+/g, '')
  if (['apdayc', 'apday', 'apdac', 'apdyc', 'apdacy', 'apdaic', 'apdeyc'].some((alias) => compact.includes(alias))) {
    return true
  }
  return normalized.split(/\s+/).filter(Boolean).some(aiIsApdaycTokenLike)
}

function parseAiApdaycInfo(text: string): {
  mentioned: boolean
  amount?: number
  payer?: ApdaycPayer
  status?: ApdaycStatus
  noAplica?: boolean
} {
  const normalized = normalizeAiText(text).replace(/[^a-z0-9\s/.,]/g, ' ').replace(/\s+/g, ' ').trim()
  const tokens = normalized.split(/\s+/).filter(Boolean)
  const apdaycIndexes = tokens
    .map((token, index) => (aiIsApdaycTokenLike(token) ? index : -1))
    .filter((index) => index >= 0)
  const mentioned = aiHasApdaycMention(normalized)
  if (!mentioned) return { mentioned: false }

  const noAplica = /\b(?:sin|no\s+aplica|exonerado|exonerada|no\s+corresponde)\b/.test(normalized)
  const payer: ApdaycPayer | undefined = normalized.includes('areli')
    ? 'ARELI'
    : normalized.includes('compart')
      ? 'SHARED'
      : normalized.includes('cliente') || normalized.includes('contratante') || normalized.includes('promocion') || normalized.includes('institucion')
        ? 'CLIENT'
        : undefined
  const status: ApdaycStatus | undefined = normalized.includes('pagado') || normalized.includes('cancelado')
    ? 'PAID'
    : normalized.includes('incluido')
      ? 'INCLUDED'
      : normalized.includes('pendiente')
        ? 'PENDING'
        : undefined
  const isMoneyToken = (token: string) => token.replace(/^s\/?/, '').match(/^\d+(?:[.,]\d+)?$/)
  let amountToken = ''
  for (const index of apdaycIndexes) {
    const nearby = tokens.slice(Math.max(0, index - 4), index + 5)
    amountToken = nearby.find((token) => Boolean(isMoneyToken(token))) ?? ''
    if (amountToken) break
  }
  if (!amountToken) {
    amountToken = tokens.find((token) => Boolean(isMoneyToken(token)) && !/^(10|20)\d{9}$/.test(token) && !/^\d{8}$/.test(token)) ?? ''
  }
  const amount = amountToken ? normalizeAiMoney(amountToken.replace(/^s\/?/, '')) : undefined
  return { mentioned, amount, payer, status, noAplica }
}

function findAiFloor(text: string, floors: Floor[]) {
  const normalized = normalizeAiText(text).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
  const compact = normalized.replace(/\s+/g, '')
  const tokens = normalized.split(' ').filter(Boolean)
  const looksLikeShortFloorAnswer = tokens.length <= 3
  const hasFloorContext = aiIncludesAny(normalized, ['piso', 'ambiente', 'local', 'salon']) || compact.includes('piso')
  const canUseLooseWords = hasFloorContext || looksLikeShortFloorAnswer
  const firstWords = ['primer', 'primero', 'priemr', 'prmer']
  const secondWords = ['segundo', 'segundop', 'segnudo', 'segudno', 'segndo', 'segund']
  const thirdWords = ['tercer', 'tercero', 'tecreer', 'terceer', 'tecer', 'terser', 'tercr', 'terce', 'terc']
  const firstCompact = ['1erpiso', '1primerpiso', 'primerpiso', 'primeropis', 'primeropiso', 'pisoprimero', 'pisouno', 'piso1']
  const secondCompact = ['2dopiso', '2segundopiso', 'segundopiso', 'segundopisop', 'pisosegundo', 'pisodos', 'piso2']
  const thirdCompact = [
    '3erpiso',
    '3ropiso',
    '3eropiso',
    '3tercerpiso',
    'tercerpiso',
    'terceropiso',
    'tecreerpiso',
    'terceerpiso',
    'tecerpiso',
    'terserpiso',
    'pisotercero',
    'pisotres',
    'piso3',
    'piso4',
    '4topiso',
    'cuartopiso',
    'pisocuarto',
  ]
  const canonical = aiIncludesAny(compact, secondCompact) || (canUseLooseWords && (normalized.includes('2do') || normalized.includes('piso 2') || aiWordLikeAny(tokens, secondWords)))
    ? '2do piso'
    : aiIncludesAny(compact, thirdCompact) ||
        normalized.includes('3 y 4') ||
        normalized.includes('3er') ||
        normalized.includes('3ro') ||
        normalized.includes('3ero') ||
        normalized.includes('4to') ||
        (canUseLooseWords && (aiWordLikeAny(tokens, thirdWords) ||
        normalized.includes('cuarto') ||
        normalized.includes('piso 3') ||
        normalized.includes('piso 4')))
      ? '3er y 4to piso'
      : aiIncludesAny(compact, firstCompact) || (canUseLooseWords && (normalized.includes('1er') || normalized.includes('piso 1') || aiWordLikeAny(tokens, firstWords)))
        ? '1er piso'
        : ''
  if (canonical) {
    return floors.find((floor) => canonicalInventoryPiso(floor.name) === canonical)
  }
  return floors.find((floor) => normalized.includes(normalizeAiText(floor.name)))
}

function findAiPackage(text: string, packages: EventPackage[]) {
  const normalized = normalizeAiText(text)
  return packages
    .slice()
    .sort((a, b) => b.name.length - a.name.length)
    .find((eventPackage) => normalized.includes(normalizeAiText(eventPackage.name)))
}

function applyAiExtraction(message: string, currentDraft: AiEventDraft, clients: Client[], floors: Floor[], packages: EventPackage[]): AiDetectedResult {
  if (isAiSmallTalkMessage(message)) {
    return { draft: currentDraft, detected: [], clientMatches: [] }
  }

  const normalized = normalizeAiText(message)
  const nextDraft: AiEventDraft = { ...currentDraft }
  const detected: string[] = []
  const clientMatches = searchAiClientMatches(message, clients)
  const client = findAiClient(message, clients)
  const clientQuery = extractAiClientQuery(message)
  const phone = message.match(/\b9\d{8}\b/)?.[0]
  const document = parseAiDocument(message)
  const eventType = inferEventTypeFromText(normalized)
  const floor = findAiFloor(message, floors)
  const eventPackage = findAiPackage(message, packages)
  const eventDate = parseAiDate(message)
  const timeRange = parseAiTimeRange(message)
  const amount = normalized.match(/\b(?:monto|total|precio|costo|s\/|soles)\s*:?\s*(\d+(?:[.,]\d+)?)\b/)
  const apdaycInfo = parseAiApdaycInfo(message)
  const capacity = normalized.match(/\b(?:capacidad|aforo|para)\s*:?\s*(\d{2,4})\s*(?:personas|invitados|pax)?\b/)

  if (client) {
    nextDraft.clientId = client.id || nextDraft.clientId
    nextDraft.clientName = client.name
    nextDraft.clientPhone = client.phone || nextDraft.clientPhone
    nextDraft.clientDocumentType = client.documentType || nextDraft.clientDocumentType
    nextDraft.clientDocumentNumber = client.documentNumber || nextDraft.clientDocumentNumber
    detected.push(client.id ? 'cliente registrado' : 'nombre de cliente')
  } else if (clientMatches.length > 0) {
    if (clientQuery) nextDraft.clientName = clientQuery
    detected.push(clientMatches.length === 1 ? 'cliente registrado probable' : 'posibles clientes registrados')
  }
  if (phone) {
    nextDraft.clientPhone = phone
    detected.push('telefono de cliente')
  }
  if (document) {
    nextDraft.clientDocumentType = document.documentType
    nextDraft.clientDocumentNumber = document.documentNumber
    detected.push(document.documentType)
  }
  if (eventType) {
    nextDraft.eventType = eventType
    detected.push('tipo de evento')
  }
  if (floor) {
    nextDraft.floorId = floor.id
    nextDraft.floorName = floor.name
    detected.push('ambiente')
  }
  if (eventPackage) {
    nextDraft.packageId = eventPackage.id
    nextDraft.packageName = eventPackage.name
    if (!nextDraft.totalAmount || Number(nextDraft.totalAmount) <= 0) {
      nextDraft.totalAmount = Number(eventPackage.basePrice ?? 0)
    }
    const includedCapacity = packageCapacityValue(eventPackage)
    if (includedCapacity > 0 && (!nextDraft.contractCapacityOverride || Number(nextDraft.contractCapacityOverride) <= 0 || nextDraft.capacityFromPackage)) {
      nextDraft.contractCapacityOverride = includedCapacity
      nextDraft.capacityFromPackage = true
    }
    detected.push('paquete')
  }
  if (eventDate) {
    nextDraft.eventDate = eventDate
    detected.push('fecha')
  }
  if (timeRange) {
    nextDraft.startTime = timeRange.startTime
    nextDraft.endTime = timeRange.endTime
    detected.push('horario')
  }
  if (amount) {
    nextDraft.totalAmount = normalizeAiMoney(amount[1])
    detected.push('monto total')
  }
  if (capacity) {
    nextDraft.contractCapacityOverride = Number(capacity[1])
    nextDraft.capacityFromPackage = false
    detected.push('capacidad contractual')
  }
  if (apdaycInfo.noAplica) {
    nextDraft.apdaycAmount = 0
    nextDraft.apdaycPayer = 'CLIENT'
    nextDraft.apdaycStatus = 'NOT_APPLIES'
    nextDraft.apdaycConfirmed = true
    detected.push('APDAYC no aplica')
  } else if (apdaycInfo.mentioned) {
    if (apdaycInfo.amount !== undefined && Number.isFinite(apdaycInfo.amount) && apdaycInfo.amount > 0) {
      nextDraft.apdaycAmount = apdaycInfo.amount
      nextDraft.apdaycPayer = apdaycInfo.payer ?? nextDraft.apdaycPayer ?? 'CLIENT'
      nextDraft.apdaycStatus = apdaycInfo.status ?? nextDraft.apdaycStatus ?? 'PENDING'
      nextDraft.apdaycConfirmed = true
      detected.push('monto APDAYC')
    } else {
      nextDraft.apdaycPayer = apdaycInfo.payer ?? nextDraft.apdaycPayer
      nextDraft.apdaycStatus = apdaycInfo.status ?? nextDraft.apdaycStatus
      nextDraft.apdaycConfirmed = false
      detected.push('APDAYC mencionado')
    }
    if (apdaycInfo.payer) {
      detected.push(`APDAYC asumido por ${apdaycPayerLabels[apdaycInfo.payer]}`)
    }
    if (apdaycInfo.status) {
      detected.push(`estado APDAYC ${apdaycStatusLabels[apdaycInfo.status]}`)
    }
  }
  if (nextDraft.eventType && (nextDraft.clientName || nextDraft.clientId)) {
    nextDraft.title = aiTitleFromDraft(nextDraft)
  }
  return { draft: nextDraft, detected, clientMatches: client?.id ? [] : clientMatches }
}

function mergeLocalAiDetection(base: AiDetectedResult, local: AiDetectedResult): AiDetectedResult {
  if (local.detected.length === 0) return base
  const detectedText = normalizeAiText(local.detected.join(' '))
  const nextDraft: AiEventDraft = { ...base.draft }
  const copyWhen = (condition: boolean, apply: () => void) => {
    if (condition) apply()
  }

  copyWhen(detectedText.includes('ambiente'), () => {
    nextDraft.floorId = local.draft.floorId
    nextDraft.floorName = local.draft.floorName
  })
  copyWhen(detectedText.includes('paquete'), () => {
    nextDraft.packageId = local.draft.packageId
    nextDraft.packageName = local.draft.packageName
    nextDraft.totalAmount = nextDraft.totalAmount || local.draft.totalAmount
    nextDraft.contractCapacityOverride = nextDraft.contractCapacityOverride || local.draft.contractCapacityOverride
    nextDraft.capacityFromPackage = local.draft.capacityFromPackage ?? nextDraft.capacityFromPackage
  })
  copyWhen(detectedText.includes('monto total'), () => {
    nextDraft.totalAmount = local.draft.totalAmount
  })
  copyWhen(detectedText.includes('capacidad'), () => {
    nextDraft.contractCapacityOverride = local.draft.contractCapacityOverride
    nextDraft.capacityFromPackage = false
  })
  copyWhen(detectedText.includes('fecha'), () => {
    nextDraft.eventDate = local.draft.eventDate
  })
  copyWhen(detectedText.includes('horario'), () => {
    nextDraft.startTime = local.draft.startTime
    nextDraft.endTime = local.draft.endTime
  })
  copyWhen(detectedText.includes('tipo de evento'), () => {
    nextDraft.eventType = local.draft.eventType
    nextDraft.title = local.draft.title || nextDraft.title
  })
  copyWhen(detectedText.includes('cliente') || detectedText.includes('telefono') || detectedText.includes('dni') || detectedText.includes('ruc'), () => {
    nextDraft.clientId = local.draft.clientId || nextDraft.clientId
    nextDraft.clientName = local.draft.clientName || nextDraft.clientName
    nextDraft.clientPhone = local.draft.clientPhone || nextDraft.clientPhone
    nextDraft.clientDocumentType = local.draft.clientDocumentType || nextDraft.clientDocumentType
    nextDraft.clientDocumentNumber = local.draft.clientDocumentNumber || nextDraft.clientDocumentNumber
    nextDraft.title = local.draft.title || nextDraft.title
  })
  copyWhen(detectedText.includes('apdayc'), () => {
    nextDraft.apdaycAmount = local.draft.apdaycAmount
    nextDraft.apdaycPayer = local.draft.apdaycPayer
    nextDraft.apdaycStatus = local.draft.apdaycStatus
    nextDraft.apdaycConfirmed = local.draft.apdaycConfirmed
  })

  return {
    draft: nextDraft,
    detected: Array.from(new Set([...base.detected, ...local.detected])),
    clientMatches: base.clientMatches.length ? base.clientMatches : local.clientMatches,
  }
}

function missingAiFields(draft: AiEventDraft, packages: EventPackage[]): AiMissingField[] {
  const missing: AiMissingField[] = []
  const hasNewClientBasics = Boolean(draft.clientName?.trim() && draft.clientPhone?.trim())
  if (!draft.clientId && !hasNewClientBasics) missing.push('client')
  if (!draft.clientId && hasNewClientBasics && !validAiClientDocument(draft)) missing.push('clientDocument')
  if (!draft.floorId) missing.push('floor')
  if (packages.length > 0 && !draft.packageId) missing.push('package')
  if (!draft.eventType) missing.push('eventType')
  if (!draft.title) missing.push('title')
  if (!draft.eventDate) missing.push('date')
  if (!draft.startTime || !draft.endTime) missing.push('time')
  if (resolvedAiCapacity(draft, packages) <= 0) missing.push('capacity')
  if (!draft.totalAmount || Number(draft.totalAmount) <= 0) missing.push('amount')
  if (!isAiApdaycComplete(draft)) missing.push('apdayc')
  return missing
}

function aiMissingLabel(field: AiMissingField) {
  const labels: Record<AiMissingField, string> = {
    client: 'cliente registrado o cliente nuevo con telefono',
    clientDocument: 'DNI o RUC del cliente nuevo',
    floor: 'ambiente / piso',
    package: 'paquete',
    eventType: 'tipo de evento',
    title: 'titulo del evento',
    date: 'fecha',
    time: 'hora de inicio y fin',
    capacity: 'capacidad contractual',
    amount: 'monto total',
    apdayc: 'APDAYC monto, responsable y estado',
  }
  return labels[field]
}

function nextAiQuestion(field?: AiMissingField) {
  const questions: Record<AiMissingField, string> = {
    client: '¿Qué cliente usaremos? Puedes escribir nombre, DNI, RUC, telefono o elegirlo con los botones.',
    clientDocument: 'El cliente parece nuevo. ¿Será DNI o RUC? Envíame algo como "DNI 12345678" o "RUC 20123456789".',
    floor: '¿En qué ambiente será: 1er piso, 2do piso o 3er/4to piso?',
    package: '¿Qué paquete quieres usar?',
    eventType: '¿Qué tipo de evento será?',
    title: '¿Qué titulo quieres para el evento?',
    date: '¿Para qué fecha lo separamos?',
    time: '¿Cuál será el horario de inicio y fin?',
    capacity: '¿Cuál será la capacidad contractual?',
    amount: '¿Cuál será el monto total del evento?',
    apdayc: '¿Cuál es el monto del APDAYC? Puedes escribir "APDAYC 200", "200 APDAYC", "APDYC 300" o tocar "No aplica". Si no dices responsable, lo pondré como cliente pendiente.',
  }
  return field ? questions[field] : 'Ya tengo todo. Revisa el resumen y confirma para crear el evento.'
}

function summarizeAiDraft(draft: AiEventDraft, packages: EventPackage[] = []) {
  const capacity = resolvedAiCapacity(draft, packages)
  return [
    `Cliente: ${draft.clientName || 'Pendiente'}`,
    `Documento: ${draft.clientDocumentNumber ? `${draft.clientDocumentType ?? 'DNI'} ${draft.clientDocumentNumber}` : 'Pendiente'}`,
    `Telefono: ${draft.clientPhone || 'Pendiente'}`,
    `Ambiente: ${draft.floorName || 'Pendiente'}`,
    `Paquete: ${draft.packageName || 'Pendiente'}`,
    `Tipo: ${draft.eventType || 'Pendiente'}`,
    `Fecha: ${draft.eventDate || 'Pendiente'}`,
    `Horario: ${draft.startTime || '--:--'} - ${draft.endTime || '--:--'}`,
    `Monto: ${draft.totalAmount ? money.format(Number(draft.totalAmount)) : 'Pendiente'}`,
    `APDAYC: ${formatAiApdaycDraft(draft)}`,
    `Estado APDAYC: ${draft.apdaycStatus ? apdaycStatusLabels[draft.apdaycStatus] : 'Pendiente'}`,
    `Capacidad: ${capacity || 'Pendiente'}`,
  ].join('\n')
}

function applyGeminiInterpretation(
  response: IaEventoResponse,
  currentDraft: AiEventDraft,
  clients: Client[],
  floors: Floor[],
  packages: EventPackage[],
): AiDetectedResult {
  if (!isAiDraftAction(response.accion)) {
    return { draft: currentDraft, detected: [], clientMatches: [] }
  }

  const data = response.datos ?? {}
  const nextDraft: AiEventDraft = { ...currentDraft }
  const detected: string[] = []
  const clientName = [data.clientePrincipal, data.clienteSecundario].filter(Boolean).join(' y ')
  const clientSearchText = `${clientName} ${data.telefono ?? ''}`.trim()
  const clientMatches = clientSearchText ? searchAiClientMatches(`cliente ${clientSearchText}`, clients) : []
  const client = clientSearchText ? findAiClient(`cliente ${clientSearchText}`, clients) : null
  const floor = data.local ? findAiFloor(data.local, floors) : null
  const eventPackage = data.servicios?.length
    ? packages.find((item) => data.servicios?.some((service) => normalizeAiText(item.name).includes(normalizeAiText(service))))
    : undefined
  const date = data.fecha ? (/^\d{4}-\d{2}-\d{2}$/.test(data.fecha) ? data.fecha : parseAiDate(data.fecha)) : ''
  const timeRange = data.hora ? parseAiTimeRange(data.hora) : null
  const services = [...(data.servicios ?? []), ...(data.personal ?? [])].filter(Boolean)
  const notes = [services.length ? `Servicios/personal solicitados: ${services.join(', ')}` : '', data.observaciones ?? '']
    .filter(Boolean)
    .join('. ')

  if (normalizeIaAction(response.accion) === 'CREAR_EVENTO') {
    detected.push('accion crear evento')
  } else if (normalizeIaAction(response.accion) === 'ACTUALIZAR_EVENTO') {
    detected.push('actualizacion del borrador')
  }
  if (client) {
    nextDraft.clientId = client.id || nextDraft.clientId
    nextDraft.clientName = client.name
    nextDraft.clientPhone = client.phone || nextDraft.clientPhone
    nextDraft.clientDocumentType = client.documentType || nextDraft.clientDocumentType
    nextDraft.clientDocumentNumber = client.documentNumber || nextDraft.clientDocumentNumber
    detected.push(client.id ? 'cliente registrado' : 'cliente')
  } else if (clientName) {
    nextDraft.clientName = clientName
    detected.push('cliente')
  }
  if (data.telefono) {
    nextDraft.clientPhone = data.telefono
    detected.push('telefono')
  }
  if (data.tipoEvento) {
    nextDraft.eventType = data.tipoEvento
    detected.push('tipo de evento')
  }
  if (date) {
    nextDraft.eventDate = date
    detected.push('fecha')
  }
  if (timeRange) {
    nextDraft.startTime = timeRange.startTime
    nextDraft.endTime = timeRange.endTime
    detected.push('horario')
  }
  if (floor) {
    nextDraft.floorId = floor.id
    nextDraft.floorName = floor.name
    detected.push('local')
  }
  if (eventPackage) {
    nextDraft.packageId = eventPackage.id
    nextDraft.packageName = eventPackage.name
    if (!nextDraft.totalAmount || Number(nextDraft.totalAmount) <= 0) {
      nextDraft.totalAmount = Number(eventPackage.basePrice ?? 0)
    }
    const includedCapacity = packageCapacityValue(eventPackage)
    if (includedCapacity > 0 && (!nextDraft.contractCapacityOverride || Number(nextDraft.contractCapacityOverride) <= 0 || nextDraft.capacityFromPackage)) {
      nextDraft.contractCapacityOverride = includedCapacity
      nextDraft.capacityFromPackage = true
    }
    detected.push('paquete probable')
  }
  if (data.cantidadInvitados && Number(data.cantidadInvitados) > 0) {
    nextDraft.contractCapacityOverride = Number(data.cantidadInvitados)
    nextDraft.capacityFromPackage = false
    detected.push('cantidad de invitados')
  }
  if (notes) {
    nextDraft.notes = [nextDraft.notes, notes].filter(Boolean).join('\n')
    detected.push('observaciones')
  }
  if (nextDraft.eventType && (nextDraft.clientName || nextDraft.clientId)) {
    nextDraft.title = aiTitleFromDraft(nextDraft)
  }

  return { draft: nextDraft, detected, clientMatches: client?.id ? [] : clientMatches }
}

function AiView({
  clients,
  floors,
  packages,
  onCreateEvent,
}: {
  clients: Client[]
  floors: Floor[]
  packages: EventPackage[]
  onCreateEvent: (draft: AiEventDraft) => Promise<void>
}) {
  const [draft, setDraft] = useState<AiEventDraft>(() => newAiDraft())
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: aiMessageId(),
      role: 'assistant',
      text: 'Hola, soy el asistente de reservas Areli. Dime el evento como te salga: cliente, fecha, horario, ambiente, paquete o monto. Yo iré armando el borrador y preguntaré lo que falte.',
    },
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [clientMatches, setClientMatches] = useState<AiClientMatch[]>([])
  const [geminiResult, setGeminiResult] = useState<IaEventoResponse | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const missing = missingAiFields(draft, packages)
  const ready = missing.length === 0

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, thinking])

  function pushAssistant(text: string) {
    setMessages((current) => [...current, { id: aiMessageId(), role: 'assistant', text }])
  }

  async function processMessage(rawMessage: string) {
    const normalized = normalizeAiText(rawMessage)
    const contextualClientResult = applyAiClientOnlyAnswer(rawMessage, draft, clients)
    if (contextualClientResult && (!draft.clientId || contextualClientResult.detected.includes('cliente registrado'))) {
      setGeminiResult(null)
      setDraft(contextualClientResult.draft)
      setClientMatches(contextualClientResult.clientMatches)
      const nextMissing = missingAiFields(contextualClientResult.draft, packages)
      if (contextualClientResult.detected.includes('cliente registrado')) {
        return `Listo, encontré y seleccioné al cliente registrado: ${contextualClientResult.draft.clientName}.\n\n${nextAiQuestion(nextMissing[0])}`
      }
      if (contextualClientResult.clientMatches.length > 0) {
        return contextualClientResult.clientMatches.length === 1
          ? `Encontré este cliente parecido: ${contextualClientResult.clientMatches[0].name}. Confírmalo con el botón o usa "cliente nuevo" para registrar otro.\n\n${nextAiQuestion(nextMissing[0])}`
          : `Encontré varios clientes parecidos. Elige el correcto con los botones o escribe "cliente nuevo" para registrar "${contextualClientResult.draft.clientName || rawMessage}".`
      }
      if (parseAiDocument(rawMessage)) {
        return `No encontré un cliente registrado con ese ${contextualClientResult.draft.clientDocumentType}. Lo prepararé como cliente nuevo. Dime el nombre y teléfono para registrarlo antes de crear el evento.`
      }
      return `No encontré ningún cliente registrado llamado "${contextualClientResult.draft.clientName}". ¿Deseas crearlo como cliente nuevo? Si sí, escribe su teléfono y DNI/RUC.`
    }
    if (normalized.includes('limpiar')) {
      setDraft(newAiDraft())
      setClientMatches([])
      setGeminiResult(null)
      return 'Listo, limpié el borrador. Empecemos de nuevo: ¿qué evento quieres separar?'
    }
    if (normalized.includes('cliente nuevo')) {
      setDraft((current) => ({ ...current, clientId: '' }))
      setClientMatches([])
      return draft.clientName
        ? `Perfecto, crearé un cliente nuevo como "${draft.clientName}". Dime teléfono y DNI/RUC para registrarlo antes de crear el evento.`
        : 'Perfecto, lo trataré como cliente nuevo. Dime nombre, teléfono y DNI/RUC para registrarlo antes de crear el evento.'
    }
    if (normalized.includes('ver resumen') || normalized.includes('resumen')) {
      const currentMissing = missingAiFields(draft, packages)
      return `Este es el borrador actual:\n\n${summarizeAiDraft(draft, packages)}\n\n${currentMissing.length ? `Falta: ${currentMissing.map(aiMissingLabel).join(', ')}.` : 'Ya está listo para confirmar.'}`
    }
    if (normalized.includes('que falta') || normalized.includes('qué falta')) {
      const currentMissing = missingAiFields(draft, packages)
      return currentMissing.length
        ? `Falta completar: ${currentMissing.map(aiMissingLabel).join(', ')}.\n\n${nextAiQuestion(currentMissing[0])}`
        : 'No falta nada obligatorio. Revisa el resumen y presiona "Confirmar y crear evento".'
    }
    if (normalized.includes('crear evento') || normalized.includes('confirmar') || normalized.includes('confirmalo') || normalized.includes('confírmalo')) {
      const currentMissing = missingAiFields(draft, packages)
      return currentMissing.length
        ? `Todavía no puedo crear el evento. Falta: ${currentMissing.map(aiMissingLabel).join(', ')}.\n\n${nextAiQuestion(currentMissing[0])}`
        : `Este es el evento que voy a preparar:\n\n${summarizeAiDraft(draft, packages)}\n\nPresiona "Confirmar y registrar" para guardarlo.`
    }

    let result: AiDetectedResult
    let geminiLine = ''
    try {
      const interpreted = await api.iaInterpretar(rawMessage)
      if (!isAiDraftAction(interpreted.accion)) {
        const localResult = applyAiExtraction(rawMessage, draft, clients, floors, packages)
        if (localResult.detected.length > 0) {
          setGeminiResult(null)
          result = localResult
        } else {
          setGeminiResult(null)
          setClientMatches([])
          return interpreted.mensajeUsuario?.trim() || 'Hola. Puedo ayudarte a armar una reserva: dime cliente, fecha, horario, ambiente, paquete o monto.'
        }
      } else {
        setGeminiResult(interpreted)
        result = applyGeminiInterpretation(interpreted, draft, clients, floors, packages)
        geminiLine = interpreted.mensajeUsuario ? `${interpreted.mensajeUsuario}\n\n` : ''
      }
    } catch (err) {
      setGeminiResult(null)
      if (isAiSmallTalkMessage(rawMessage)) {
        setClientMatches([])
        return 'Hola. Puedo ayudarte a crear una reserva: escribe el evento como te salga y yo ordeno cliente, fecha, horario, ambiente, paquete, monto y APDAYC.'
      }
      result = applyAiExtraction(rawMessage, draft, clients, floors, packages)
      geminiLine = `No pude contactar Gemini, use interpretacion local. ${err instanceof Error ? err.message : ''}\n\n`
    }
    if (!isAiSmallTalkMessage(rawMessage)) {
      const localResult = applyAiExtraction(rawMessage, draft, clients, floors, packages)
      result = result.detected.length === 0 ? localResult : mergeLocalAiDetection(result, localResult)
    }
    setDraft(result.draft)
    setClientMatches(result.clientMatches)
    const nextMissing = missingAiFields(result.draft, packages)
    const detectedLine = result.detected.length ? `Detecté: ${result.detected.join(', ')}.` : 'No detecté datos nuevos con seguridad.'
    const matchesLine =
      result.clientMatches.length === 1
        ? `\n\n¿Te refieres a ${result.clientMatches[0].name}? Confírmalo con el botón o registra "${result.draft.clientName || 'este nombre'}" como cliente nuevo.`
        : result.clientMatches.length > 1
          ? '\n\nEncontré varios clientes registrados parecidos. Elige el correcto con los botones o registra uno nuevo.'
          : ''
    return nextMissing.length
      ? `${geminiLine}${detectedLine}${matchesLine}\n\n${nextAiQuestion(nextMissing[0])}`
      : `${geminiLine}${detectedLine}${matchesLine}\n\nEste es el evento que voy a crear:\n\n${summarizeAiDraft(result.draft, packages)}\n\nSi todo está correcto, presiona "Confirmar y registrar".`
  }

  function sendMessage(message = input) {
    const cleanMessage = message.trim()
    if (!cleanMessage || thinking || saving) return
    setInput('')
    setMessages((current) => [...current, { id: aiMessageId(), role: 'user', text: cleanMessage }])
    setThinking(true)
    window.setTimeout(() => {
      void (async () => {
        const answer = await processMessage(cleanMessage)
        pushAssistant(answer)
        setThinking(false)
      })()
    }, 360)
  }

  async function confirmCreate() {
    if (!ready || saving) {
      pushAssistant(`Antes de crear falta: ${missing.map(aiMissingLabel).join(', ')}.\n\n${nextAiQuestion(missing[0])}`)
      return
    }
    setSaving(true)
    try {
      await onCreateEvent(draft)
      pushAssistant('Evento creado correctamente. Te llevé a eventos registrados para revisarlo.')
      setDraft(newAiDraft())
    } catch (err) {
      pushAssistant(err instanceof Error ? err.message : 'No se pudo crear el evento. Revisa el borrador e intenta nuevamente.')
    } finally {
      setSaving(false)
    }
  }

  function chooseClient(match: AiClientMatch) {
    setDraft((current) => ({
      ...current,
      clientId: match.id,
      clientName: match.name,
      clientPhone: match.phone || current.clientPhone,
      clientDocumentType: match.documentType || current.clientDocumentType,
      clientDocumentNumber: match.documentNumber || current.clientDocumentNumber,
      title: current.eventType ? aiTitleFromDraft({ ...current, clientName: match.name }) : current.title,
    }))
    setClientMatches([])
    pushAssistant(`Listo, usaré el cliente registrado: ${match.name}.`)
  }

  function chooseFloor(floor: Floor) {
    setDraft((current) => ({ ...current, floorId: floor.id, floorName: floor.name }))
    pushAssistant(`Ambiente seleccionado: ${floor.name}.`)
  }

  function choosePackage(eventPackage: EventPackage) {
    setDraft((current) => ({
      ...current,
      packageId: eventPackage.id,
      packageName: eventPackage.name,
      totalAmount: current.totalAmount && Number(current.totalAmount) > 0 ? current.totalAmount : Number(eventPackage.basePrice ?? 0),
      contractCapacityOverride:
        current.contractCapacityOverride && Number(current.contractCapacityOverride) > 0 && !current.capacityFromPackage && current.packageId === eventPackage.id
          ? current.contractCapacityOverride
          : Number(eventPackage.includedCapacity ?? 0),
      capacityFromPackage: packageCapacityValue(eventPackage) > 0,
    }))
    const capacity = packageCapacityValue(eventPackage)
    pushAssistant(`Paquete seleccionado: ${eventPackage.name}.${capacity ? ` Capacidad tomada del paquete: ${capacity} personas.` : ''}`)
  }

  function chooseNewClientDocumentType(documentType: DocumentType) {
    setDraft((current) => ({ ...current, clientId: '', clientDocumentType: documentType, clientDocumentNumber: '' }))
    setClientMatches([])
    pushAssistant(`Usaremos ${documentType}. Envíame el número ${documentType === 'RUC' ? 'de 11 dígitos' : 'de 8 dígitos'}.`)
  }

  function chooseApdaycNoAplica() {
    setDraft((current) => ({
      ...current,
      apdaycAmount: 0,
      apdaycPayer: 'CLIENT',
      apdaycStatus: 'NOT_APPLIES',
      apdaycConfirmed: true,
    }))
    pushAssistant('Listo, APDAYC marcado como no aplica.')
  }

  function chooseApdaycPayer(payer: ApdaycPayer) {
    setDraft((current) => ({
      ...current,
      apdaycPayer: payer,
      apdaycStatus: current.apdaycStatus ?? (Number(current.apdaycAmount) > 0 ? 'PENDING' : current.apdaycStatus),
      apdaycConfirmed: Number(current.apdaycAmount) > 0 && Boolean(current.apdaycStatus ?? 'PENDING'),
    }))
    pushAssistant(`APDAYC lo asume: ${apdaycPayerLabels[payer]}. Falta el monto y estado si todavía no los diste.`)
  }

  function chooseApdaycStatus(status: ApdaycStatus) {
    setDraft((current) => ({
      ...current,
      apdaycStatus: status,
      apdaycAmount: status === 'NOT_APPLIES' ? 0 : current.apdaycAmount,
      apdaycPayer: status === 'NOT_APPLIES' ? 'CLIENT' : current.apdaycPayer ?? (Number(current.apdaycAmount) > 0 ? 'CLIENT' : undefined),
      apdaycConfirmed: status === 'NOT_APPLIES' ? true : Number(current.apdaycAmount) > 0 && Boolean(current.apdaycPayer ?? 'CLIENT'),
    }))
    pushAssistant(status === 'NOT_APPLIES' ? 'Listo, APDAYC marcado como no aplica.' : `Estado APDAYC: ${apdaycStatusLabels[status]}.`)
  }

  const displayedCapacity = resolvedAiCapacity(draft, packages)
  const draftRows = [
    ['Cliente', draft.clientName || (draft.clientId ? 'Cliente seleccionado' : '')],
    ['Documento', draft.clientDocumentNumber ? `${draft.clientDocumentType ?? 'DNI'} ${draft.clientDocumentNumber}` : ''],
    ['Telefono', draft.clientPhone],
    ['Ambiente', draft.floorName],
    ['Paquete', draft.packageName],
    ['Titulo', draft.title],
    ['Tipo', draft.eventType],
    ['Fecha', draft.eventDate],
    ['Horario', draft.startTime && draft.endTime ? `${draft.startTime} - ${draft.endTime}` : ''],
    ['Estado', draft.status ? eventStatusLabels[draft.status] : ''],
    ['Monto total', draft.totalAmount ? money.format(Number(draft.totalAmount)) : ''],
    ['APDAYC', formatAiApdaycDraft(draft)],
    ['Estado APDAYC', draft.apdaycStatus ? apdaycStatusLabels[draft.apdaycStatus] : ''],
    ['Capacidad', displayedCapacity ? `${displayedCapacity} personas` : ''],
    ['Notas', draft.notes],
  ] as const
  const shouldAskNewClientDocument = Boolean(!draft.clientId && draft.clientName?.trim() && draft.clientPhone?.trim() && !validAiClientDocument(draft))
  const showFloorButtons = !draft.floorId && floors.length > 0
  const showPackageButtons = !draft.packageId && packages.length > 0
  const showApdaycButtons = !isAiApdaycComplete(draft)
  const hasApdaycAmount = Number(draft.apdaycAmount) > 0

  return (
    <section className="ai-chat-layout">
      <div className="panel ai-chat-panel">
        <header className="ai-chat-head">
          <div>
            <p className="eyebrow">Asistente Gemini</p>
            <h2>Asistente IA</h2>
            <p>Escribe lo que deseas hacer y la IA lo ordenará por ti.</p>
          </div>
          <span className={`ai-ready-pill ${ready ? 'ready' : ''}`}>{ready ? 'Listo para confirmar' : `${missing.length} datos faltantes`}</span>
        </header>

        <div className="ai-chat-messages">
          {messages.map((message) => (
            <div className={`ai-message ${message.role}`} key={message.id}>
              {message.role === 'assistant' && (
                <span className="ai-avatar">
                  <Bot size={16} />
                </span>
              )}
              <p>{message.text}</p>
            </div>
          ))}
          {thinking && (
            <div className="ai-message assistant">
              <span className="ai-avatar">
                <Bot size={16} />
              </span>
              <p className="ai-thinking">Pensando...</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {(clientMatches.length > 0 || shouldAskNewClientDocument || showFloorButtons || showPackageButtons || showApdaycButtons) && (
          <div className="ai-context-actions">
            {clientMatches.length > 0 && (
              <div className="ai-action-group">
                <span>Clientes encontrados</span>
                <div>
                  {clientMatches.map((match) => (
                    <button className="btn ghost" key={match.id} onClick={() => chooseClient(match)} type="button">
                      {match.name}
                      <small>{match.detail}</small>
                    </button>
                  ))}
                  {draft.clientName && (
                    <button className="btn ghost" onClick={() => sendMessage('cliente nuevo')} type="button">
                      Registrar como nuevo
                    </button>
                  )}
                </div>
              </div>
            )}

            {shouldAskNewClientDocument && (
              <div className="ai-action-group">
                <span>Documento del cliente nuevo</span>
                <div>
                  <button className="btn ghost" onClick={() => chooseNewClientDocumentType('DNI')} type="button">
                    Usar DNI
                  </button>
                  <button className="btn ghost" onClick={() => chooseNewClientDocumentType('RUC')} type="button">
                    Usar RUC
                  </button>
                </div>
              </div>
            )}

            {showFloorButtons && (
              <div className="ai-action-group">
                <span>Ambiente</span>
                <div>
                  {floors.map((floor) => (
                    <button className="btn ghost" key={floor.id} onClick={() => chooseFloor(floor)} type="button">
                      {floor.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showPackageButtons && (
              <div className="ai-action-group">
                <span>Paquete</span>
                <div>
                  {packages.slice(0, 6).map((eventPackage) => (
                    <button className="btn ghost" key={eventPackage.id} onClick={() => choosePackage(eventPackage)} type="button">
                      {eventPackage.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showApdaycButtons && (
              <div className="ai-action-group">
                <span>APDAYC obligatorio</span>
                {!hasApdaycAmount && (
                  <p className="ai-action-hint">Primero dime el monto en el chat: APDAYC 200, 200 APDAYC, APDYC 300 o el monto real.</p>
                )}
                <div>
                  <button className="btn ghost" onClick={chooseApdaycNoAplica} type="button">
                    No aplica
                  </button>
                  {hasApdaycAmount && (
                    <>
                      <button className="btn ghost" onClick={() => chooseApdaycPayer('CLIENT')} type="button">
                        Lo paga cliente
                      </button>
                      <button className="btn ghost" onClick={() => chooseApdaycPayer('ARELI')} type="button">
                        Lo paga Areli
                      </button>
                      <button className="btn ghost" onClick={() => chooseApdaycPayer('SHARED')} type="button">
                        Compartido
                      </button>
                      <button className="btn ghost" onClick={() => chooseApdaycStatus('PENDING')} type="button">
                        Pendiente
                      </button>
                      <button className="btn ghost" onClick={() => chooseApdaycStatus('INCLUDED')} type="button">
                        Incluido
                      </button>
                      <button className="btn ghost" onClick={() => chooseApdaycStatus('PAID')} type="button">
                        Pagado
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="ai-quick-actions">
          {['qué falta', 'ver resumen', 'cliente nuevo', 'limpiar borrador'].map((command) => (
            <button className="btn ghost" key={command} onClick={() => sendMessage(command)} type="button">
              {command}
            </button>
          ))}
        </div>

        <form className="ai-chat-composer" onSubmit={(event) => { event.preventDefault(); sendMessage() }}>
          <input
            placeholder="Ej: crea evnto sabado boda carlos y dayana 120 invitados con dj y mozos..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
          <button className="btn primary" disabled={thinking || saving || !input.trim()} type="submit">
            <Sparkles size={16} />
            Interpretar con IA
          </button>
        </form>
      </div>

      <aside className="panel ai-draft-panel">
        <div className="ai-draft-head">
          <div>
            <p className="eyebrow">Borrador del evento</p>
            <h2>Reserva pendiente</h2>
          </div>
          <button className="btn primary" disabled={!ready || saving} onClick={() => void confirmCreate()} type="button">
            <Save size={16} />
            {saving ? 'Creando...' : 'Confirmar y registrar'}
          </button>
        </div>

        <div className="ai-missing-box">
          <strong>{ready ? 'Borrador completo' : 'Falta completar'}</strong>
          <p>{ready ? 'Revisa los datos y confirma para guardar.' : missing.map(aiMissingLabel).join(', ')}</p>
        </div>

        {geminiResult && (
          <div className="ai-gemini-result">
            <span>Interpretación Gemini</span>
            <strong>{geminiResult.accion}</strong>
            <p>{geminiResult.mensajeUsuario}</p>
            {geminiResult.faltantes.length > 0 && (
              <ul>
                {geminiResult.faltantes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="ai-draft-list">
          {draftRows.map(([label, value]) => (
            <article className={value ? 'filled' : ''} key={label}>
              <span>{label}</span>
              <strong>{formatAiDraftValue(value)}</strong>
            </article>
          ))}
        </div>
      </aside>
    </section>
  )
}

export default App

