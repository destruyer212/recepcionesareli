import { jsPDF } from 'jspdf'
import type { Client, ClientPayment, ContractPreview, PaymentVoucherContext } from './types'

const logoPath = '/areli-logo.png'
const signatureMaxProcessWidth = 720

const money = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
})

const longDate = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

const apdaycPayerLabels: Record<string, string> = {
  CLIENT: 'Cliente',
  ARELI: 'Recepciones Areli',
  SHARED: 'Compartido',
}

const apdaycStatusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  INCLUDED: 'Incluido',
  PAID: 'Pagado',
  NOT_APPLIES: 'No aplica',
}

const defaultApdaycPayer = 'CLIENT'
const defaultApdaycStatus = 'PENDING'

function apdaycPayerLabel(payer?: string | null) {
  const key = payer?.trim() || defaultApdaycPayer
  return apdaycPayerLabels[key] ?? apdaycPayerLabels[defaultApdaycPayer]
}

function apdaycStatusLabel(status?: string | null) {
  const key = status?.trim() || defaultApdaycStatus
  return apdaycStatusLabels[key] ?? apdaycStatusLabels[defaultApdaycStatus]
}

/** Texto estándar en PDFs: Asume: Cliente - Estado: Pendiente (por defecto). */
function formatApdaycAssumptionLine(payer?: string | null, status?: string | null) {
  return `Asume: ${apdaycPayerLabel(payer)} - Estado: ${apdaycStatusLabel(status)}`
}

/** Monto del paquete/evento + texto fijo al costado (por defecto Cliente / Pendiente). */
function formatAmountWithAssumption(amount: number, payer?: string | null, status?: string | null) {
  return `${money.format(amount)} - ${formatApdaycAssumptionLine(payer, status)}`
}

function formatGuaranteePdfLine(amount: number) {
  return formatAmountWithAssumption(amount)
}

/** Firma del arrendador lista para PDF (fondo limpio, recortada, proporción real). */
type LessorSignaturePdf = {
  dataUrl: string
  aspect: number
}

type PdfAssets = {
  logo: string
  watermark: string
  lessorSignature: LessorSignaturePdf | null
}

let pdfAssetsPromise: Promise<PdfAssets> | null = null

function resolveApiBaseForAssets(): string {
  const raw = import.meta.env.VITE_API_BASE_URL?.trim()
  return raw ? raw.replace(/\/$/, '') : '/api'
}

/** Misma convención que api.ts: recursos públicos bajo /api/public/… */
function lessorSignatureAssetUrl(): string {
  return `${resolveApiBaseForAssets()}/public/contract-signatures/lessor`
}

async function tryFetchImageDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { credentials: 'omit' })
    if (!response.ok) return null
    const blob = await response.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('read'))
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function valueOrDash(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }
  return String(value)
}

function valueOrLine(value: string | number | null | undefined) {
  return valueOrDash(value) === '-' ? '________________________' : valueOrDash(value)
}

export function buildFullClientAddress(
  street?: string | null,
  province?: string | null,
  district?: string | null,
) {
  return [street, province, district]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(' - ')
}

/** Arma domicilio completo para el PDF (API + datos del cliente en pantalla). */
export function prepareContractPreviewForPdf(preview: ContractPreview, client?: Client | null): ContractPreview {
  const street = (preview.clientStreet ?? client?.address)?.trim()
  const province = (preview.clientProvince ?? client?.province)?.trim()
  const district = (preview.clientDistrict ?? client?.district)?.trim()
  const fullAddress =
    buildFullClientAddress(street, province, district) ||
    preview.clientAddress?.trim() ||
    buildFullClientAddress(client?.address, client?.province, client?.district) ||
    ''
  return { ...preview, clientAddress: fullAddress, clientStreet: street, clientProvince: province, clientDistrict: district }
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) {
    return value
  }
  return longDate.format(new Date(year, month - 1, day))
}

function slug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function contractPdfFilename(event: ContractPreview, contractCode: string) {
  const namePart = slug(event.clientName || event.title) || 'contrato'
  return `contrato-${contractCode}-${namePart}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '-')
}

function isIosWebKitBrowser() {
  const ua = window.navigator.userAgent
  const platform = window.navigator.platform
  const isTouchIpad = platform === 'MacIntel' && window.navigator.maxTouchPoints > 1
  return (/iPad|iPhone|iPod/.test(ua) || isTouchIpad) && /WebKit/.test(ua)
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

function openPdfBlobFallback(blob: Blob) {
  const url = URL.createObjectURL(blob)
  const opened = window.open(url, '_blank', 'noopener')
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return Boolean(opened)
}

async function sharePdfOnIos(blob: Blob, filename: string) {
  if (typeof File === 'undefined' || typeof navigator.share !== 'function') {
    return false
  }

  const file = new File([blob], filename, { type: 'application/pdf' })
  const shareData: ShareData = { files: [file], title: filename }
  if (typeof navigator.canShare === 'function' && !navigator.canShare(shareData)) {
    return false
  }

  try {
    await navigator.share(shareData)
    return true
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return true
    }
    return false
  }
}

async function downloadPdfBlob(blob: Blob, filename: string) {
  const pdfBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' })

  if (isIosWebKitBrowser()) {
    const shared = await sharePdfOnIos(pdfBlob, filename)
    if (shared) return

    triggerBlobDownload(pdfBlob, filename)
    alert('En iPhone, toca el botón Compartir y selecciona Guardar en Archivos.')
    if (!openPdfBlobFallback(pdfBlob)) {
      throw new Error('No se pudo descargar el contrato. Intente nuevamente.')
    }
    return
  }

  triggerBlobDownload(pdfBlob, filename)
}

async function imageDataUrl(path: string) {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error('No se pudo cargar el logo de Areli.')
  }

  const blob = await response.blob()
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('No se pudo leer el logo de Areli.'))
    reader.readAsDataURL(blob)
  })
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('No se pudo preparar la marca de agua.'))
    image.src = src
  })
}

async function createWatermark(source: string) {
  const image = await loadImage(source)
  const canvas = document.createElement('canvas')
  const width = 1200
  const height = Math.round((image.height / image.width) * width)
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('No se pudo crear la marca de agua.')
  }

  context.clearRect(0, 0, width, height)
  context.globalAlpha = 0.11
  context.drawImage(image, 0, 0, width, height)
  return canvas.toDataURL('image/png')
}

/**
 * Limpia fondo de papel, recorta al trazo y suaviza bordes para integrar la firma en el PDF
 * sin caja blanca ni halo duro (aspecto más cercano a tinta escaneada).
 */
async function prepareLessorSignatureForPdf(dataUrl: string): Promise<LessorSignaturePdf | null> {
  try {
    const image = await loadImage(dataUrl)
    const naturalW = image.naturalWidth
    const naturalH = image.naturalHeight
    if (!naturalW || !naturalH) {
      return null
    }
    const scale = Math.min(1, signatureMaxProcessWidth / naturalW)
    const srcW = Math.max(1, Math.round(naturalW * scale))
    const srcH = Math.max(1, Math.round(naturalH * scale))

    const canvas = document.createElement('canvas')
    canvas.width = srcW
    canvas.height = srcH
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) {
      return null
    }

    ctx.clearRect(0, 0, srcW, srcH)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(image, 0, 0, srcW, srcH)
    const snap = ctx.getImageData(0, 0, srcW, srcH)
    const px = snap.data
    const out = ctx.createImageData(srcW, srcH)
    const o = out.data

    for (let i = 0; i < px.length; i += 4) {
      const r = px[i]
      const g = px[i + 1]
      const b = px[i + 2]
      const aIn = px[i + 3]
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b

      if (aIn < 8) {
        o[i + 3] = 0
        continue
      }

      // Quitar papel blanco / gris muy claro (anti “sticker” rectangular)
      if (lum > 248 && Math.max(r, g, b) - Math.min(r, g, b) < 18) {
        o[i + 3] = 0
        continue
      }

      const paper = Math.min(1, Math.max(0, (lum - 198) / 52))
      const ink = (1 - paper) * (aIn / 255)
      if (ink < 0.03) {
        o[i + 3] = 0
        continue
      }

      // Tinta ligeramente suave (no negro puro 255) para acercarse al texto impreso
      const level = Math.min(1, ink * 0.97)
      const tone = Math.round(14 + 22 * level)
      o[i] = tone
      o[i + 1] = tone
      o[i + 2] = Math.min(255, tone + 2)
      o[i + 3] = Math.round(255 * level)
    }

    ctx.putImageData(out, 0, 0)

    const alphaAt = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= srcW || y >= srcH) {
        return 0
      }
      return o[(y * srcW + x) * 4 + 3]
    }

    const blurred = ctx.createImageData(srcW, srcH)
    const b = blurred.data
    for (let y = 0; y < srcH; y++) {
      for (let x = 0; x < srcW; x++) {
        const idx = (y * srcW + x) * 4
        let sum = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            sum += alphaAt(x + dx, y + dy)
          }
        }
        const a = Math.round(sum / 9)
        b[idx] = o[idx]
        b[idx + 1] = o[idx + 1]
        b[idx + 2] = o[idx + 2]
        b[idx + 3] = a
      }
    }
    ctx.putImageData(blurred, 0, 0)

    const trimmed = ctx.getImageData(0, 0, srcW, srcH)
    const t = trimmed.data
    let minX = srcW
    let minY = srcH
    let maxX = 0
    let maxY = 0
    const threshold = 14
    for (let y = 0; y < srcH; y++) {
      for (let x = 0; x < srcW; x++) {
        if (t[(y * srcW + x) * 4 + 3] > threshold) {
          if (x < minX) {
            minX = x
          }
          if (y < minY) {
            minY = y
          }
          if (x > maxX) {
            maxX = x
          }
          if (y > maxY) {
            maxY = y
          }
        }
      }
    }

    if (minX > maxX || minY > maxY) {
      return null
    }

    const pad = 3
    minX = Math.max(0, minX - pad)
    minY = Math.max(0, minY - pad)
    maxX = Math.min(srcW - 1, maxX + pad)
    maxY = Math.min(srcH - 1, maxY + pad)
    const cropW = maxX - minX + 1
    const cropH = maxY - minY + 1

    const crop = document.createElement('canvas')
    crop.width = cropW
    crop.height = cropH
    const cctx = crop.getContext('2d')
    if (!cctx) {
      return null
    }
    cctx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH)

    return {
      dataUrl: crop.toDataURL('image/png'),
      aspect: cropW / cropH,
    }
  } catch {
    return null
  }
}

async function createPdfAssets(): Promise<PdfAssets> {
  const logo = await imageDataUrl(logoPath)
  const watermark = await createWatermark(logo)
  const rawSignature = await tryFetchImageDataUrl(lessorSignatureAssetUrl())
  const lessorSignature = rawSignature ? await prepareLessorSignatureForPdf(rawSignature) : null
  return { logo, watermark, lessorSignature }
}

async function loadAssets(): Promise<PdfAssets> {
  pdfAssetsPromise ??= createPdfAssets().catch((error) => {
    pdfAssetsPromise = null
    throw error
  })
  return pdfAssetsPromise
}

const PDF_FOOTER_HEIGHT_MM = 14

function pdfMaxContentY(doc: jsPDF) {
  return doc.internal.pageSize.getHeight() - PDF_FOOTER_HEIGHT_MM - 8
}

function drawWatermark(doc: jsPDF, assets: PdfAssets) {
  doc.addImage(assets.watermark, 'PNG', 40, 90, 130, 105, undefined, 'FAST')
}

function drawPageFooter(doc: jsPDF, documentCode: string) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(105, 105, 105)
  doc.text(`Documento generado por sistema - Código: ${documentCode}`, pageWidth / 2, pageHeight - 10, {
    align: 'center',
  })
}

function stampFootersOnAllPages(doc: jsPDF, documentCode: string) {
  const total = doc.getNumberOfPages()
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page)
    drawPageFooter(doc, documentCode)
  }
}

function drawChrome(doc: jsPDF, assets: PdfAssets, contractCode: string) {
  drawWatermark(doc, assets)
  drawPageFooter(doc, contractCode)
}

function addTitle(doc: jsPDF, assets: PdfAssets, event: ContractPreview) {
  const pageWidth = doc.internal.pageSize.getWidth()
  doc.addImage(assets.logo, 'PNG', pageWidth / 2 - 18, 10, 36, 29, undefined, 'FAST')

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(31, 78, 121)
  doc.setFontSize(13)
  doc.text('ARELI', pageWidth / 2, 45, { align: 'center' })
  doc.setFontSize(10)
  doc.text('SALÓN DE RECEPCIONES', pageWidth / 2, 51, { align: 'center' })

  doc.setTextColor(0, 0, 0)
  doc.setFontSize(15)
  doc.text('CONTRATO DE ALQUILER TEMPORAL DE LOCAL', pageWidth / 2, 60, { align: 'center' })
  doc.setTextColor(196, 145, 0)
  doc.setFontSize(15)
  doc.text('SALÓN DE RECEPCIONES ARELI', pageWidth / 2, 69, { align: 'center' })
  doc.setFontSize(12)
  doc.text(`${event.floorName.toUpperCase()} - ${event.packageName.toUpperCase()}`, pageWidth / 2, 77, {
    align: 'center',
    maxWidth: 175,
  })
}

function addHeading(doc: jsPDF, text: string, y: number) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0)
  doc.text(text, 14, y)
  return y + 7
}

function addParagraph(doc: jsPDF, text: string, y: number, fontSize = 9.2) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(fontSize)
  doc.setTextColor(32, 32, 32)
  const lines = doc.splitTextToSize(text, 182)
  doc.text(lines, 14, y)
  return y + lines.length * (fontSize * 0.46) + 3
}

function addTable(doc: jsPDF, rows: Array<[string, string]>, y: number) {
  const x = 14
  const labelWidth = 84
  const valueWidth = 98
  const rowHeight = 7.2

  doc.setLineWidth(0.25)
  rows.forEach(([label, value]) => {
    const valueLines = doc.splitTextToSize(value, valueWidth - 5)
    const height = Math.max(rowHeight, valueLines.length * 4.2 + 2.8)

    doc.setFillColor(255, 244, 214)
    doc.setDrawColor(185, 153, 82)
    doc.rect(x, y, labelWidth, height, 'FD')
    doc.rect(x + labelWidth, y, valueWidth, height, 'S')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    doc.text(label, x + 2.4, y + 4.8)

    doc.setFont('helvetica', 'normal')
    doc.text(valueLines, x + labelWidth + 2.4, y + 4.8)

    y += height
  })

  return y + 7
}

function ensurePage(doc: jsPDF, assets: PdfAssets, y: number, needed: number, contractCode: string) {
  if (y + needed <= pdfMaxContentY(doc)) {
    return y
  }
  doc.addPage()
  drawChrome(doc, assets, contractCode)
  return 18
}

/** Firma del arrendador (misma imagen del contrato) sobre la línea de sello. */
function addLessorSignatureBlock(doc: jsPDF, assets: PdfAssets, y: number, lineX = 14, lineWidth = 76) {
  const signatureLineY = y + 26
  const columnMid = lineX + lineWidth / 2
  const lessorSigMaxW = 52
  const lessorSigMaxH = 20
  const lessorSigBottomGapMm = -0.9

  if (assets.lessorSignature) {
    const ar = assets.lessorSignature.aspect
    let lessorImgW = lessorSigMaxW
    let lessorImgH = lessorSigMaxW / ar
    if (lessorImgH > lessorSigMaxH) {
      lessorImgH = lessorSigMaxH
      lessorImgW = lessorSigMaxH * ar
    }
    doc.addImage(
      assets.lessorSignature.dataUrl,
      'PNG',
      columnMid - lessorImgW / 2,
      signatureLineY - lessorImgH - lessorSigBottomGapMm,
      lessorImgW,
      lessorImgH,
      undefined,
      'FAST',
    )
  }

  doc.setDrawColor(45, 45, 45)
  doc.setLineWidth(0.3)
  doc.line(lineX, signatureLineY, lineX + lineWidth, signatureLineY)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.text('Recepciones Areli', columnMid, signatureLineY + 6, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text('Sello / firma interna', columnMid, signatureLineY + 12, { align: 'center' })
  return signatureLineY + 18
}

function estimateClauseHeight(doc: jsPDF, body: string, fontSize = 9.2) {
  const lines = doc.splitTextToSize(body, 182)
  return 10 + lines.length * (fontSize * 0.46) + 5
}

function addClause(doc: jsPDF, assets: PdfAssets, contractCode: string, title: string, body: string, y: number) {
  y = ensurePage(doc, assets, y, estimateClauseHeight(doc, body), contractCode)
  y = addHeading(doc, title, y)
  return addParagraph(doc, body, y)
}

export async function downloadEventContractPdf(event: ContractPreview, client?: Client | null) {
  const contract = prepareContractPreviewForPdf(event, client)
  const assets = await loadAssets()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const contractCode = `ARELI-${event.eventDate}-${event.eventId.slice(0, 8).toUpperCase()}`

  drawChrome(doc, assets, contractCode)
  addTitle(doc, assets, event)

  const capacityText = event.capacityMaximum ? `${event.capacityMaximum} personas` : 'aforo autorizado por el local'
  const signatureDate = longDate.format(new Date())

  let y = 86
  y = addTable(doc, [
    ['Código de contrato', contractCode],
    ['Fecha de emisión', longDate.format(new Date())],
    ['Cliente / arrendatario', event.clientName],
    ['DNI/RUC del cliente', valueOrDash(event.clientDocument)],
  ], y)

  y = addParagraph(
    doc,
    `Conste por el presente documento el contrato de alquiler temporal de local para evento privado que celebran, de una parte, Recepciones Areli, a quien en adelante se le denominará EL ARRENDADOR; y de la otra parte, ${event.clientName}, identificado(a) con DNI/RUC N.° ${valueOrLine(event.clientDocument)}, con domicilio en ${valueOrLine(contract.clientAddress)}, a quien en adelante se le denominará EL ARRENDATARIO; bajo los términos y condiciones siguientes:`,
    y,
  )

  y = addHeading(doc, 'DATOS GENERALES DEL EVENTO', y)
  y = addTable(doc, [
    ['Tipo de evento', event.eventType],
    ['Nombre del evento', event.title],
    ['Fecha del evento', formatDate(event.eventDate)],
    ['Horario contratado', `Desde ${event.startTime} hasta ${event.endTime}`],
    ['Ambiente contratado', event.floorName],
    ['Paquete contratado', event.packageName],
    ['Capacidad máxima', capacityText],
    ['Monto total', money.format(event.totalAmount)],
    ['Garantía por daños', formatGuaranteePdfLine(event.guaranteeAmount)],
    ['Contacto del cliente', valueOrDash(event.clientPhone)],
    [
      'Pago APDAYC',
      formatAmountWithAssumption(event.apdaycAmount ?? 0, event.apdaycPayer, event.apdaycStatus),
    ],
  ], y)

  const clauses = [
    {
      title: 'CLÁUSULA PRIMERA: OBJETO DEL CONTRATO',
      body: `EL ARRENDADOR entrega en alquiler temporal a EL ARRENDATARIO el uso del ambiente ${event.floorName} del local denominado Salón de Recepciones Areli, ubicado en Calle Los Nísperos Mz. B1 Lote 19, distrito de Carabayllo, exclusivamente para la realización del evento "${event.title}", correspondiente a ${event.eventType}, en la fecha y horario indicados en los datos generales del presente contrato.`,
    },
    {
      title: 'CLÁUSULA SEGUNDA: DESCRIPCIÓN DEL PAQUETE CONTRATADO',
      body: `EL ARRENDATARIO contrata el paquete ${event.packageName}. El servicio comprende el uso de los ambientes habilitados, áreas de atención, circulación interna, servicios higiénicos y demás espacios entregados por EL ARRENDADOR según la contratación realizada. La entrega del local se efectuará en condiciones operativas para el desarrollo del evento. Los alcances, inclusiones y condiciones específicas del paquete seleccionado se detallan en el anexo final del presente contrato.`,
    },
    {
      title: 'CLÁUSULA TERCERA: CAPACIDAD, ORDEN Y CONTROL DEL EVENTO',
      body: `La capacidad máxima permitida será de ${capacityText}. EL ARRENDATARIO se obliga a no exceder dicho aforo por razones de seguridad, orden, control del evento y adecuada prestación del servicio. EL ARRENDADOR podrá adoptar medidas razonables de control cuando se advierta exceso de asistentes, ingreso no autorizado o situaciones que comprometan la seguridad del local.`,
    },
    {
      title: 'CLÁUSULA CUARTA: MONTO, ADELANTO, SALDO Y REGISTRO DE PAGOS',
      body: `El monto total pactado por el alquiler y paquete contratado es de ${money.format(event.totalAmount)}. El adelanto, saldo pendiente, medio de pago y fecha límite de cancelación deberán constar en la boleta interna, recibo, voucher, comprobante, constancia o registro generado por el sistema administrativo de Recepciones Areli. La reserva del local quedará confirmada únicamente con el pago del adelanto correspondiente y con la aceptación de las condiciones de contratación.`,
    },
    {
      title: 'CLÁUSULA QUINTA: GARANTÍA POR DAÑOS Y RESERVA DE FECHA',
      body: event.guaranteeClause,
    },
    {
      title: 'CLÁUSULA SEXTA: RESPONSABILIDAD POR DAÑOS Y DETERIOROS',
      body: 'EL ARRENDATARIO será responsable por cualquier desperfecto, deterioro, pérdida, rotura o daño ocasionado al local, mobiliario, paredes, pisos, puertas, instalaciones eléctricas, servicios higiénicos, equipos, accesorios, decoración o cualquier otro bien entregado para el uso del evento. En caso se verifiquen daños al finalizar el evento, EL ARRENDATARIO deberá asumir el costo de reparación, reposición, limpieza especial o compensación correspondiente.',
    },
    {
      title: 'CLÁUSULA SÉPTIMA: HORARIO, ENTREGA DEL AMBIENTE Y HORA EXTRA',
      body: 'EL ARRENDATARIO se obliga a respetar estrictamente el horario contratado. Al llegar la hora de finalización, los asistentes deberán desocupar el local para permitir la revisión, cierre, limpieza y entrega del ambiente. Toda ampliación de horario deberá contar con autorización expresa de EL ARRENDADOR. De autorizarse hora extra, EL ARRENDATARIO asumirá el costo vigente informado por EL ARRENDADOR por cada hora adicional o fracción.',
    },
    {
      title: 'CLÁUSULA OCTAVA: SEGURIDAD Y BIENES PERSONALES',
      body: 'EL ARRENDADOR se responsabiliza por entregar el local en buenas condiciones de uso y con servicios básicos operativos, tales como agua, luz y servicios higiénicos. EL ARRENDADOR no se responsabiliza por pérdidas, robos, objetos extraviados, accidentes fortuitos, daños personales, conflictos entre asistentes o hechos ocasionados por terceros durante el evento, dentro o fuera del local. La seguridad de menores de edad será responsabilidad exclusiva de sus padres, tutores o adultos responsables.',
    },
    {
      title: 'CLÁUSULA NOVENA: PROHIBICIONES',
      body: 'Queda prohibido a EL ARRENDATARIO subarrendar, ceder o transferir el uso del local sin autorización escrita; exceder la capacidad máxima permitida; realizar actividades distintas al evento declarado; dañar, perforar, pintar, modificar o alterar paredes, pisos, puertas, instalaciones o accesorios; usar pirotécnicos, materiales inflamables, elementos peligrosos o equipos que afecten la seguridad del local sin autorización expresa; e ingresar o permanecer en el local fuera del horario contratado sin autorización de EL ARRENDADOR.',
    },
    {
      title: 'CLÁUSULA DÉCIMA: CANCELACIÓN O REPROGRAMACIÓN',
      body: event.rescheduleClause,
    },
    {
      title: 'CLÁUSULA DÉCIMO PRIMERA: APDAYC, IGV, PERMISOS Y DERECHOS',
      body: `${event.apdaycClause} Registro APDAYC del evento: monto ${money.format(event.apdaycAmount ?? 0)}, ${formatApdaycAssumptionLine(event.apdaycPayer, event.apdaycStatus)}. Observación: ${valueOrDash(event.apdaycNotes)}.`,
    },
    {
      title: 'CLÁUSULA DÉCIMO SEGUNDA: PERSONAL, PROVEEDORES Y COORDINACIÓN',
      body: 'El ingreso de mozos, barman, DJ, animador, seguridad, decoradores, proveedores externos u otro personal relacionado con el evento deberá coordinarse previamente con EL ARRENDADOR. EL ARRENDATARIO será responsable de que dicho personal respete los horarios, normas internas, zonas permitidas, cuidado del local y condiciones de seguridad. Cualquier servicio adicional no incluido en el paquete deberá ser aprobado y registrado por escrito.',
    },
    {
      title: 'CLÁUSULA DÉCIMO TERCERA: ACTA DE ENTREGA Y CONFORMIDAD',
      body: 'Al finalizar el evento, ambas partes podrán verificar el estado de entrega del local. De existir observaciones, estas podrán registrarse mediante acta, fotografías, videos, boleta interna o anotación del sistema, indicando daños, pérdidas, saldos pendientes u otras incidencias que correspondan. La falta de observación inmediata no impedirá a EL ARRENDADOR comunicar posteriormente daños detectados durante la limpieza o revisión final, siempre que guarden relación con el evento contratado.',
    },
    {
      title: 'CLÁUSULA DÉCIMO CUARTA: ACEPTACIÓN',
      body: `Ambas partes declaran haber leído el presente contrato, comprender su contenido y estar conformes con todas sus cláusulas, firmándolo en señal de aceptación en la ciudad de Carabayllo, con fecha ${signatureDate}. Observación del sistema: ${valueOrDash(event.eventNotes)}.`,
    },
  ]

  clauses.forEach((clause) => {
    y = addClause(doc, assets, contractCode, clause.title, clause.body, y)
  })

  y = ensurePage(doc, assets, y, 76, contractCode)
  y = addHeading(doc, 'ACEPTACIÓN Y FIRMAS', y)
  y = addParagraph(
    doc,
    'En señal de conformidad, ambas partes suscriben el presente documento. Las firmas podrán ser manuscritas o completadas en versión impresa, junto con los datos de identificación que correspondan.',
    y,
  )
  y += 18
  doc.setDrawColor(45, 45, 45)
  const signatureLineY = y + 8
  const lessorColumnMid = (23 + 88) / 2
  /** Caja de firma realista: ocupa la línea sin invadir el texto inferior. */
  const lessorSigMaxW = 58
  const lessorSigMaxH = 22
  /** La base toca ligeramente la línea, como una firma manuscrita normal. */
  const lessorSigBottomGapMm = -0.9
  if (assets.lessorSignature) {
    const ar = assets.lessorSignature.aspect
    let lessorImgW = lessorSigMaxW
    let lessorImgH = lessorSigMaxW / ar
    if (lessorImgH > lessorSigMaxH) {
      lessorImgH = lessorSigMaxH
      lessorImgW = lessorSigMaxH * ar
    }
    doc.addImage(
      assets.lessorSignature.dataUrl,
      'PNG',
      lessorColumnMid - lessorImgW / 2,
      signatureLineY - lessorImgH - lessorSigBottomGapMm,
      lessorImgW,
      lessorImgH,
      undefined,
      'FAST',
    )
  }
  doc.line(23, signatureLineY, 88, signatureLineY)
  doc.line(122, signatureLineY, 187, signatureLineY)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('EL ARRENDADOR', 55, y + 14, { align: 'center' })
  doc.text('EL ARRENDATARIO', 155, y + 14, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text('DNI/RUC: __________________', 55, y + 20, { align: 'center' })
  doc.text(`DNI/RUC: ${valueOrLine(event.clientDocument)}`, 155, y + 20, { align: 'center' })
  y += 26

  doc.addPage()
  drawChrome(doc, assets, contractCode)
  doc.addImage(assets.logo, 'PNG', 89, 14, 32, 26, undefined, 'FAST')
  y = 48
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(196, 145, 0)
  doc.setFontSize(15)
  doc.text('ANEXO FINAL', 105, y, { align: 'center' })
  y += 8
  doc.setTextColor(31, 78, 121)
  doc.setFontSize(13)
  doc.text('DETALLE DEL PAQUETE CONTRATADO', 105, y, { align: 'center' })
  y += 12
  y = addTable(doc, [
    ['Paquete seleccionado', event.packageName],
    ['Ambiente', event.floorName],
    ['Precio del paquete', money.format(event.totalAmount)],
    ['Capacidad máxima', capacityText],
    ['Garantía', formatGuaranteePdfLine(event.guaranteeAmount)],
    ['APDAYC / derechos', formatAmountWithAssumption(event.apdaycAmount ?? 0, event.apdaycPayer, event.apdaycStatus)],
  ], y)

  y = addHeading(doc, 'SERVICIOS INCLUIDOS', y)
  y = addParagraph(doc, valueOrDash(event.packageLastPageDetails), y)
  y = addHeading(doc, 'CONDICIONES DEL PAQUETE', y)
  y = addParagraph(doc, valueOrDash(event.packageTerms), y)
  y = addHeading(doc, 'NOTA OPERATIVA', y)
  addParagraph(
    doc,
    'Este anexo se completa según el paquete elegido en el sistema: Básico, Areli, Premium, Promociones escolares o paquete personalizado. Si APDAYC, IGV, permisos u otros derechos no están incluidos, dichos conceptos se asumen conforme a las cláusulas del contrato.',
    y,
  )

  await downloadPdfBlob(doc.output('blob'), contractPdfFilename(event, contractCode))
}

const paymentTypePdfLabels: Record<string, string> = {
  EVENT_PAYMENT: 'Pago del evento',
  APDAYC: 'APDAYC',
  GUARANTEE: 'Garantía',
}

function paymentVoucherCode(payment: ClientPayment) {
  const manual = payment.internalReceiptNumber?.trim()
  if (manual) {
    return manual
  }
  const suffix = payment.id.replace(/-/g, '').slice(0, 8).toUpperCase()
  return `ARELI-PAGO-${payment.paymentDate}-${suffix}`
}

function voucherPdfFilename(voucherCode: string, clientName: string) {
  const codePart = slug(voucherCode) || 'comprobante'
  const namePart = slug(clientName) || 'cliente'
  return `comprobante-${codePart}-${namePart}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '-')
}

function addVoucherTitle(doc: jsPDF, assets: PdfAssets, voucherCode: string) {
  const pageWidth = doc.internal.pageSize.getWidth()
  doc.addImage(assets.logo, 'PNG', pageWidth / 2 - 18, 10, 36, 29, undefined, 'FAST')

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(31, 78, 121)
  doc.setFontSize(13)
  doc.text('ARELI', pageWidth / 2, 45, { align: 'center' })
  doc.setFontSize(10)
  doc.text('SALÓN DE RECEPCIONES', pageWidth / 2, 51, { align: 'center' })

  doc.setTextColor(0, 0, 0)
  doc.setFontSize(14)
  doc.text('COMPROBANTE INTERNO DE PAGO', pageWidth / 2, 62, { align: 'center' })
  doc.setTextColor(196, 145, 0)
  doc.setFontSize(11)
  doc.text(`N.° ${voucherCode}`, pageWidth / 2, 70, { align: 'center' })
}

function addAmountHighlight(doc: jsPDF, label: string, amount: number, y: number) {
  const x = 14
  const width = 182
  const height = 22

  doc.setFillColor(255, 244, 214)
  doc.setDrawColor(185, 153, 82)
  doc.setLineWidth(0.35)
  doc.roundedRect(x, y, width, height, 2, 2, 'FD')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  doc.text(label, pageWidthCenter(doc), y + 7, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(31, 78, 121)
  doc.text(money.format(amount), pageWidthCenter(doc), y + 16, { align: 'center' })

  return y + height + 8
}

function pageWidthCenter(doc: jsPDF) {
  return doc.internal.pageSize.getWidth() / 2
}

function paymentOperationNumber(payment: ClientPayment): string | undefined {
  const direct = payment.operationNumber?.trim()
  if (direct) return direct
  const legacy = (payment as { operation_number?: string }).operation_number?.trim()
  return legacy || undefined
}

function paymentMethodRequiresOperationNumber(method: string) {
  const normalized = method.trim().toUpperCase()
  return normalized === 'BCP' || normalized === 'BBVA' || normalized === 'SCOTIABANK'
}

function paymentMethodLine(payment: ClientPayment) {
  const method = String(payment.method ?? '')
  const operationNumber = paymentOperationNumber(payment)
  if (operationNumber) {
    return `${method} · Op. ${operationNumber}`
  }
  return valueOrDash(method)
}

function paymentDetailRows(
  payment: ClientPayment,
  apdayc?: { payer?: string | null; status?: string | null },
): Array<[string, string]> {
  const countsLabel = payment.countsTowardsEventTotal ? 'Sí — suma al total del evento' : 'No — control interno'
  const method = String(payment.method ?? '')
  const operationNumber = paymentOperationNumber(payment)
  const rows: Array<[string, string]> = [
    ['Concepto', valueOrDash(payment.concept)],
    ['Tipo de registro', paymentTypePdfLabels[payment.paymentType] ?? payment.paymentType],
    ['Fecha del pago', formatDate(payment.paymentDate)],
    ['Medio de pago', paymentMethodLine(payment)],
  ]
  if (payment.paymentType === 'GUARANTEE' || payment.paymentType === 'APDAYC') {
    rows.push(['Garantía / APDAYC', formatAmountWithAssumption(payment.amount, apdayc?.payer, apdayc?.status)])
  }
  if (paymentMethodRequiresOperationNumber(method)) {
    rows.push(['Número de operación', operationNumber ?? '— (no registrado en el sistema)'])
  } else if (operationNumber) {
    rows.push(['Número de operación', operationNumber])
  }
  rows.push(['Suma al evento', countsLabel])
  return rows
}

export async function downloadPaymentVoucherPdf(ctx: PaymentVoucherContext) {
  const assets = await loadAssets()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const voucherCode = paymentVoucherCode(ctx.payment)
  const documentCode = `DOC-${voucherCode}`

  drawChrome(doc, assets, documentCode)
  addVoucherTitle(doc, assets, voucherCode)

  const payment = ctx.payment

  let y = 80
  y = addTable(
    doc,
    [
      ['Fecha de emisión', longDate.format(new Date())],
      ['Cliente', ctx.clientName],
      ['DNI / RUC', valueOrDash(ctx.clientDocument)],
      ['Contacto', valueOrDash(ctx.clientPhone)],
    ],
    y,
  )

  y = addHeading(doc, 'DATOS DEL EVENTO', y)
  y = addTable(
    doc,
    [
      ['Código del evento', ctx.eventCode],
      ['Evento', ctx.eventTitle],
      ['Ambiente', ctx.floorName],
      ['Fecha del evento', formatDate(ctx.eventDate)],
      ['Horario', `Desde ${ctx.startTime} hasta ${ctx.endTime}`],
      ['Monto total del evento', money.format(ctx.totalAmount)],
    ],
    y,
  )

  y = addHeading(doc, 'DETALLE DEL PAGO', y)
  y = addAmountHighlight(doc, 'MONTO REGISTRADO', payment.amount, y)
  y = addTable(
    doc,
    paymentDetailRows(payment, { payer: ctx.apdaycPayer, status: ctx.apdaycStatus }),
    y,
  )

  if (payment.notes?.trim()) {
    y = addHeading(doc, 'OBSERVACIONES', y)
    y = addParagraph(doc, payment.notes.trim(), y)
  }

  y = addHeading(doc, 'RESUMEN FINANCIERO DEL EVENTO', y)
  y = ensurePage(doc, assets, y, 95, documentCode)
  y = addTable(
    doc,
    [
      ['Total pactado', money.format(ctx.totalAmount)],
      ['Pagado a la fecha (incluye este pago)', money.format(ctx.paidToDate)],
      ['Saldo pendiente', money.format(ctx.balanceAfter)],
    ],
    y,
  )

  y += 10
  y = ensurePage(doc, assets, y, 58, documentCode)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.2)
  doc.setTextColor(90, 90, 90)
  const disclaimer =
    'Este documento es un comprobante interno emitido por Recepciones Areli para constancia del pago registrado en el sistema. No sustituye boleta, factura ni comprobante tributario ante SUNAT. Conserve este archivo para su control y puede compartirlo con el cliente como constancia del abono recibido.'
  y = addParagraph(doc, disclaimer, y, 8.2)

  y += 8
  y = ensurePage(doc, assets, y, 44, documentCode)
  y = addLessorSignatureBlock(doc, assets, y)

  stampFootersOnAllPages(doc, documentCode)

  await downloadPdfBlob(doc.output('blob'), voucherPdfFilename(voucherCode, ctx.clientName))
}
