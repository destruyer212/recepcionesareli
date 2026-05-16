import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Briefcase,
  CalendarCheck,
  Camera,
  ChefHat,
  Check,
  ChevronDown,
  ClipboardList,
  GlassWater,
  Music,
  Paintbrush,
  PartyPopper,
  Phone,
  PhoneCall,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  Video,
} from 'lucide-react'
import { api } from '../../api'
import type { WorkerCategory, WorkerContact } from '../../types'

type FixedWorkerRole = Exclude<WorkerCategory, `MOZO_${number}`>
type WorkerRoleMode = FixedWorkerRole | 'MOZOS'
type WorkerRosterTab = WorkerRoleMode | 'ALL'

type WorkerRoleConfig = {
  id: FixedWorkerRole
  label: string
  hint: string
}

type WorkerRoleOption = {
  id: WorkerRoleMode
  label: string
  hint: string
}

const workerRoles: WorkerRoleConfig[] = [
  { id: 'EVENT_PLANNER', label: 'Event Planner', hint: 'Plan general, proveedores y cronograma.' },
  { id: 'COORDINADOR_EVENTO', label: 'Coordinador del Evento', hint: 'Responsable operativo durante el evento.' },
  { id: 'DJ', label: 'DJ', hint: 'Música, cabina y momentos especiales.' },
  { id: 'FOTOGRAFO', label: 'Fotógrafo', hint: 'Registro fotográfico del evento.' },
  { id: 'VIDEOGRAFO', label: 'Videógrafo', hint: 'Video, reels, tomas y entrega final.' },
  { id: 'SEGURIDAD', label: 'Seguridad', hint: 'Control de ingreso y orden.' },
  { id: 'ANFITRIONA', label: 'Anfitriona', hint: 'Recepción e indicaciones a invitados.' },
  { id: 'BARMAN', label: 'Barman', hint: 'Bar, bebidas y servicio de cocteles.' },
  { id: 'HORA_LOCA', label: 'Hora Loca', hint: 'Show, animación y accesorios.' },
  { id: 'DECORACION', label: 'Personal de Decoración', hint: 'Montaje, estilo y detalles visuales.' },
  { id: 'BOCADITOS', label: 'Personal de Bocaditos', hint: 'Mesa dulce, salados y atención.' },
  { id: 'COCINA', label: 'Personal de Cocina', hint: 'Preparación, apoyo y salida de platos.' },
  { id: 'LIMPIEZA', label: 'Personal de Limpieza', hint: 'Orden antes, durante y cierre.' },
  { id: 'APOYO', label: 'Personal de Apoyo', hint: 'Refuerzos para tareas generales.' },
]

const workerRoleOptions: WorkerRoleOption[] = [
  ...workerRoles.slice(0, 7),
  { id: 'MOZOS', label: 'Mozos', hint: 'Sub lista numerada para Mozo 1, Mozo 2, Mozo 3 y los que necesites.' },
  ...workerRoles.slice(7),
]

const workerRoleTabIcons: Record<WorkerRoleMode, LucideIcon> = {
  EVENT_PLANNER: Briefcase,
  COORDINADOR_EVENTO: CalendarCheck,
  DJ: Music,
  FOTOGRAFO: Camera,
  VIDEOGRAFO: Video,
  SEGURIDAD: ShieldCheck,
  ANFITRIONA: UserCheck,
  MOZOS: Users,
  BARMAN: GlassWater,
  HORA_LOCA: PartyPopper,
  DECORACION: Paintbrush,
  BOCADITOS: Sparkles,
  COCINA: ChefHat,
  LIMPIEZA: ClipboardList,
  APOYO: Users,
}

const legacyWorkerLabels: Record<string, string> = {
  MOZOS: 'Mozos (anterior)',
  FOTOGRAFOS: 'Fotógrafos (anterior)',
  TORTAS: 'Tortas y repostería (anterior)',
  OTROS: 'Otros proveedores (anterior)',
}

function isMozoCategory(category: string): category is `MOZO_${number}` {
  return /^MOZO_\d+$/.test(category)
}

function mozoNumber(category: string) {
  if (!isMozoCategory(category)) return 0
  return Number(category.replace('MOZO_', ''))
}

function labelForCategory(category: string) {
  if (isMozoCategory(category)) return `Mozo ${mozoNumber(category)}`
  return workerRoles.find((role) => role.id === category)?.label ?? legacyWorkerLabels[category] ?? category
}

function roleOptionFor(value: WorkerRoleMode) {
  return workerRoleOptions.find((role) => role.id === value) ?? workerRoleOptions[0]
}

function nextMozoNumber(directory: WorkerContact[]) {
  const used = new Set(directory.map((item) => String(item.category)).filter(isMozoCategory).map(mozoNumber))
  for (let index = 1; index <= used.size + 1; index++) {
    if (!used.has(index)) return index
  }
  return used.size + 1
}

function matchesSearch(item: WorkerContact, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [labelForCategory(String(item.category)), item.name, item.phone ?? '', item.notes ?? '']
    .join(' ')
    .toLowerCase()
    .includes(needle)
}

function phoneHref(phone?: string) {
  const cleanPhone = (phone ?? '').replace(/[^\d+]/g, '')
  return cleanPhone ? `tel:${cleanPhone}` : ''
}

function WorkerRolePicker({
  value,
  onChange,
  disabled,
}: {
  value: WorkerRoleMode
  onChange: (value: WorkerRoleMode) => void
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const selected = roleOptionFor(value)

  useEffect(() => {
    function closeOnOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null
      if (!target || wrapperRef.current?.contains(target)) return
      setIsOpen(false)
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('mousedown', closeOnOutside)
    window.addEventListener('touchstart', closeOnOutside, { passive: true })
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('mousedown', closeOnOutside)
      window.removeEventListener('touchstart', closeOnOutside)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  return (
    <div className={`worker-role-picker ${isOpen ? 'open' : ''}`} ref={wrapperRef}>
      <button
        aria-expanded={isOpen}
        className="worker-role-picker-trigger"
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span>
          <strong>{selected.label}</strong>
          <small>{selected.hint}</small>
        </span>
        <ChevronDown size={18} />
      </button>
      {isOpen && (
        <div className="worker-role-picker-menu" role="listbox">
          {workerRoleOptions.map((role) => {
            const active = role.id === value
            return (
              <button
                aria-selected={active}
                className={`worker-role-picker-option ${active ? 'active' : ''}`}
                key={role.id}
                onClick={() => {
                  onChange(role.id)
                  setIsOpen(false)
                }}
                role="option"
                type="button"
              >
                <span>
                  <strong>{role.label}</strong>
                  <small>{role.hint}</small>
                </span>
                {active && <Check size={16} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function WorkersView({ mode = 'registered' }: { mode?: 'registered' | 'create' }) {
  const [roleMode, setRoleMode] = useState<WorkerRoleMode>('EVENT_PLANNER')
  const [mozoSlot, setMozoSlot] = useState(1)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [directory, setDirectory] = useState<WorkerContact[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [editingWorker, setEditingWorker] = useState<WorkerContact | null>(null)
  const [editRoleMode, setEditRoleMode] = useState<WorkerRoleMode>('EVENT_PLANNER')
  const [editMozoSlot, setEditMozoSlot] = useState(1)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [selectedRosterTab, setSelectedRosterTab] = useState<WorkerRosterTab>('ALL')

  const loadWorkers = useCallback(async (showNotice = false) => {
    setLoading(true)
    setNotice('')
    try {
      const workers = await api.workers()
      setDirectory(workers)
      setMozoSlot(nextMozoNumber(workers))
      if (showNotice) {
        setNotice(`Equipo actualizado: ${workers.length} contactos activos.`)
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo cargar el directorio.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadWorkers()
  }, [loadWorkers])

  const selectedCategory: WorkerCategory =
    roleMode === 'MOZOS' ? (`MOZO_${mozoSlot}` as WorkerCategory) : roleMode
  const selectedRoleLabel = roleMode === 'MOZOS' ? `Mozo ${mozoSlot}` : labelForCategory(roleMode)
  const fixedContacts = useMemo(
    () => workerRoles.map((role) => ({
      ...role,
      contacts: directory
        .filter((item) => String(item.category) === role.id)
        .filter((item) => matchesSearch(item, search)),
    })),
    [directory, search],
  )
  const mozoContacts = useMemo(
    () =>
      directory
        .filter((item) => isMozoCategory(String(item.category)))
        .sort((a, b) => mozoNumber(String(a.category)) - mozoNumber(String(b.category)))
        .filter((item) => matchesSearch(item, search)),
    [directory, search],
  )
  const legacyContacts = useMemo(
    () =>
      directory
        .filter((item) => {
          const category = String(item.category)
          return !isMozoCategory(category) && !workerRoles.some((role) => role.id === category)
        })
        .filter((item) => matchesSearch(item, search)),
    [directory, search],
  )
  const highestMozoNumber = Math.max(0, ...directory.map((item) => mozoNumber(String(item.category))))
  const mozoSlotOptions = Array.from({ length: Math.max(12, highestMozoNumber + 3, mozoSlot) }, (_, index) => index + 1)
  const editMozoSlotOptions = Array.from({ length: Math.max(12, highestMozoNumber + 3, editMozoSlot) }, (_, index) => index + 1)
  const officialCount = directory.filter((item) => {
    const category = String(item.category)
    return isMozoCategory(category) || workerRoles.some((role) => role.id === category)
  }).length
  const visibleOfficialCount = fixedContacts.reduce((total, role) => total + role.contacts.length, 0) + mozoContacts.length
  const rosterTabs = useMemo(
    () => [
      {
        id: 'ALL' as const,
        label: 'Todos',
        hint: 'Equipo completo',
        icon: ClipboardList,
        count: visibleOfficialCount,
      },
      ...workerRoleOptions.map((role) => ({
        id: role.id,
        label: role.label,
        hint: role.hint,
        icon: workerRoleTabIcons[role.id],
        count:
          role.id === 'MOZOS'
            ? mozoContacts.length
            : fixedContacts.find((item) => item.id === role.id)?.contacts.length ?? 0,
      })),
    ],
    [fixedContacts, mozoContacts.length, visibleOfficialCount],
  )
  const selectedRosterOption = rosterTabs.find((tab) => tab.id === selectedRosterTab) ?? rosterTabs[0]
  const visibleFixedContacts =
    selectedRosterTab === 'ALL'
      ? fixedContacts
      : fixedContacts.filter((role) => role.id === selectedRosterTab)
  const showMozoRoster = selectedRosterTab === 'ALL' || selectedRosterTab === 'MOZOS'

  function selectRole(nextRole: WorkerRoleMode) {
    setRoleMode(nextRole)
    if (nextRole === 'MOZOS') {
      setMozoSlot(nextMozoNumber(directory))
    }
  }

  async function addWorker(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setNotice('Completa el nombre del contacto.')
      return
    }
    setBusy(true)
    try {
      const entry = await api.createWorker({
        category: selectedCategory,
        name: name.trim(),
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      const nextDirectory = [entry, ...directory]
      setDirectory(nextDirectory)
      setName('')
      setPhone('')
      setNotes('')
      if (roleMode === 'MOZOS') {
        setMozoSlot(nextMozoNumber(nextDirectory))
      }
      setNotice(`${selectedRoleLabel} guardado.`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo guardar el contacto.')
    } finally {
      setBusy(false)
    }
  }

  async function removeWorker(id: string) {
    const confirmed = window.confirm('Quitar este contacto del equipo oficial?')
    if (!confirmed) return
    setBusy(true)
    try {
      await api.deleteWorker(id)
      const nextDirectory = directory.filter((item) => item.id !== id)
      setDirectory(nextDirectory)
      if (roleMode === 'MOZOS') {
        setMozoSlot(nextMozoNumber(nextDirectory))
      }
      setNotice('Contacto eliminado.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo eliminar el contacto.')
    } finally {
      setBusy(false)
    }
  }

  function startEditWorker(item: WorkerContact) {
    const category = String(item.category)
    if (isMozoCategory(category)) {
      setEditRoleMode('MOZOS')
      setEditMozoSlot(mozoNumber(category))
    } else {
      setEditRoleMode((workerRoles.some((role) => role.id === category) ? category : 'EVENT_PLANNER') as WorkerRoleMode)
      setEditMozoSlot(nextMozoNumber(directory))
    }
    setEditingWorker(item)
    setEditName(item.name ?? '')
    setEditPhone(item.phone ?? '')
    setEditNotes(item.notes ?? '')
  }

  async function saveEditedWorker(event: FormEvent) {
    event.preventDefault()
    if (!editingWorker) return
    if (!editName.trim()) {
      setNotice('Completa el nombre del contacto.')
      return
    }
    const nextCategory: WorkerCategory =
      editRoleMode === 'MOZOS' ? (`MOZO_${editMozoSlot}` as WorkerCategory) : editRoleMode
    setBusy(true)
    try {
      const updated = await api.updateWorker(editingWorker.id, {
        category: nextCategory,
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
        notes: editNotes.trim() || undefined,
      })
      const nextDirectory = directory.map((item) => (item.id === updated.id ? updated : item))
      setDirectory(nextDirectory)
      setEditingWorker(null)
      setNotice('Contacto actualizado.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo actualizar el contacto.')
    } finally {
      setBusy(false)
    }
  }

  function renderContactCard(item: WorkerContact) {
    const callHref = phoneHref(item.phone)
    return (
      <article className="worker-card" key={item.id}>
        <header>
          <div>
            <span>{labelForCategory(String(item.category))}</span>
            <h3>{item.name}</h3>
          </div>
          <div className="worker-card-actions">
            {callHref && (
              <a className="btn icon call" href={callHref}>
                <PhoneCall size={14} />
                Llamar
              </a>
            )}
            <button className="btn icon" disabled={busy} onClick={() => startEditWorker(item)} type="button">
              Editar
            </button>
            <button className="btn icon danger" disabled={busy} onClick={() => void removeWorker(item.id)} type="button">
              <Trash2 size={14} />
              Quitar
            </button>
          </div>
        </header>
        <p>
          <Phone size={14} />
          {item.phone || 'Sin teléfono registrado'}
        </p>
        {item.notes && <p>{item.notes}</p>}
      </article>
    )
  }

  function renderRoleSection(role: (typeof fixedContacts)[number]) {
    return (
      <section className="worker-role-card" key={role.id}>
        <header>
          <div className="worker-role-icon">
            <ClipboardList size={18} />
          </div>
          <div>
            <h3>{role.label}</h3>
            <p>{role.hint}</p>
          </div>
          <span>{role.contacts.length}</span>
        </header>
        <div className="workers-grid">
          {role.contacts.length === 0 ? <p className="empty compact">Sin contacto asignado.</p> : role.contacts.map(renderContactCard)}
        </div>
        {mode === 'create' && (
          <button className="btn ghost" onClick={() => selectRole(role.id)} type="button">
            Agregar {role.label}
          </button>
        )}
      </section>
    )
  }

  return (
    <section className={`workers-page ${mode === 'create' ? 'workers-create-page' : 'workers-registered-page'}`}>
      {mode === 'create' && (
      <div className="panel workers-form-panel">
        <div className="workers-hero">
          <div>
            <p className="eyebrow">Equipo oficial</p>
            <h2>Registrar trabajador</h2>
            <p className="settings-intro">
              Elige el cargo oficial, completa el nombre y guarda el contacto para usarlo en los eventos.
            </p>
          </div>
          <div className="workers-counter">
            <Users size={18} />
            <strong>{officialCount}</strong>
            <span>contactos guardados</span>
          </div>
        </div>

        {notice && <p className="message ok">{notice}</p>}

        <form onSubmit={addWorker}>
          <div className="form-grid">
            <label className="full worker-role-picker-label">
              Puesto oficial
              <WorkerRolePicker disabled={busy} value={roleMode} onChange={selectRole} />
            </label>
            {roleMode === 'MOZOS' && (
              <label className="worker-mozo-slot-label">
                Sub puesto
                <select value={mozoSlot} onChange={(event) => setMozoSlot(Number(event.target.value))}>
                  {mozoSlotOptions.map((slot) => (
                    <option key={slot} value={slot}>
                      Mozo {slot}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Nombre
              <input onChange={(event) => setName(event.target.value)} placeholder="Ej: Jose Ramirez" value={name} />
            </label>
            <label>
              Teléfono / WhatsApp
              <input inputMode="tel" onChange={(event) => setPhone(event.target.value)} placeholder="Ej: 987654321" value={phone} />
            </label>
            <label className="full">
              Notas
              <textarea
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Pago, horario, uniforme, referencia, proveedor o cualquier detalle clave."
                value={notes}
              />
            </label>
          </div>
          <div className="form-actions">
            <button className="btn primary" disabled={busy} type="submit">
              <Save size={16} />
              {busy ? 'Guardando...' : `Guardar ${selectedRoleLabel}`}
            </button>
          </div>
        </form>
      </div>
      )}

      {mode === 'registered' && (
      <div className="panel workers-roster-panel">
        <div className="workers-toolbar">
          <div>
            <h2>Trabajadores registrados</h2>
            <p className="settings-intro">Consulta el equipo oficial por cargo, mozos numerados y contactos anteriores.</p>
          </div>
          <div className="workers-toolbar-actions">
          <label className="worker-search">
            <Search size={15} />
            <input placeholder="Buscar por nombre, cargo o teléfono" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <button className="btn ghost" disabled={loading || busy} onClick={() => void loadWorkers(true)} type="button">
            <RefreshCw size={15} />
            Recargar equipo
          </button>
          </div>
        </div>

        {notice && <p className="message ok">{notice}</p>}

        {!loading && (
          <>
            <div className="worker-roster-tabs-shell">
              <div className="worker-roster-tabs" role="tablist" aria-label="Filtrar trabajadores por puesto">
                {rosterTabs.map((tab) => {
                  const Icon = tab.icon
                  const active = selectedRosterTab === tab.id
                  return (
                    <button
                      aria-selected={active}
                      className={`worker-roster-tab ${active ? 'active' : ''}`}
                      key={tab.id}
                      onClick={() => setSelectedRosterTab(tab.id)}
                      role="tab"
                      type="button"
                    >
                      <Icon size={18} />
                      <span>{tab.label}</span>
                      <small>{tab.count}</small>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="worker-roster-focus">
              <div>
                <strong>{selectedRosterOption.label}</strong>
                <span>{selectedRosterOption.hint}</span>
              </div>
              <em>{selectedRosterOption.count} contactos</em>
            </div>
          </>
        )}

        {loading && <p className="empty">Cargando equipo oficial...</p>}
        {!loading && (
          <div className={`workers-role-grid ${selectedRosterTab === 'ALL' ? '' : 'filtered'}`}>
            {visibleFixedContacts.slice(0, 7).map(renderRoleSection)}

            {showMozoRoster && (
            <section className="worker-role-card mozos-role-card">
              <header>
                <div className="worker-role-icon">
                  <Users size={18} />
                </div>
                <div>
                  <h3>Mozos</h3>
                  <p>Sub lista numerada: Mozo 1, Mozo 2, Mozo 3 y los que necesites.</p>
                </div>
                <span>{mozoContacts.length}</span>
              </header>
              <div className="workers-grid">
                {mozoContacts.length === 0 ? <p className="empty compact">Aun no hay mozos asignados.</p> : mozoContacts.map(renderContactCard)}
              </div>
            </section>
            )}

            {visibleFixedContacts.slice(7).map(renderRoleSection)}
          </div>
        )}

        {selectedRosterTab === 'ALL' && legacyContacts.length > 0 && (
          <div className="worker-legacy-box">
            <h3>Contactos anteriores</h3>
            <p>Quedaron guardados con la clasificacion antigua. Puedes quitarlos o volver a crearlos con el puesto oficial.</p>
            <div className="workers-grid">{legacyContacts.map(renderContactCard)}</div>
          </div>
        )}
      </div>
      )}

      {editingWorker && (
        <div className="quick-modal" role="presentation">
          <div className="modal-2026 worker-edit-modal">
            <div className="modal-2026-header">
              <div>
                <p className="eyebrow">Equipo oficial</p>
                <h3>Editar trabajador</h3>
              </div>
              <button className="btn ghost" onClick={() => setEditingWorker(null)} type="button">
                Cerrar
              </button>
            </div>
            <form onSubmit={saveEditedWorker}>
              <div className="form-grid">
                <label className="full worker-role-picker-label">
                  Puesto oficial
                  <WorkerRolePicker disabled={busy} value={editRoleMode} onChange={setEditRoleMode} />
                </label>
                {editRoleMode === 'MOZOS' && (
                  <label className="worker-mozo-slot-label">
                    Sub puesto
                    <select value={editMozoSlot} onChange={(event) => setEditMozoSlot(Number(event.target.value))}>
                      {editMozoSlotOptions.map((slot) => (
                        <option key={slot} value={slot}>
                          Mozo {slot}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label>
                  Nombre
                  <input onChange={(event) => setEditName(event.target.value)} value={editName} required />
                </label>
                <label>
                  Telefono / WhatsApp
                  <input inputMode="tel" onChange={(event) => setEditPhone(event.target.value)} value={editPhone} />
                </label>
                <label className="full">
                  Notas
                  <textarea onChange={(event) => setEditNotes(event.target.value)} value={editNotes} />
                </label>
              </div>
              <div className="form-actions modal-2026-actions">
                <button className="btn ghost" onClick={() => setEditingWorker(null)} type="button">
                  Cancelar
                </button>
                <button className="btn primary" disabled={busy} type="submit">
                  <Save size={16} />
                  {busy ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
