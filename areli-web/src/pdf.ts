import { jsPDF } from 'jspdf'
import type { ContractPreview } from './types'

const logoPath = '/areli-logo.png'

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

type PdfAssets = {
  logo: string
  watermark: string
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

async function loadAssets(): Promise<PdfAssets> {
  const logo = await imageDataUrl(logoPath)
  const watermark = await createWatermark(logo)
  return { logo, watermark }
}

function drawChrome(doc: jsPDF, assets: PdfAssets, contractCode: string) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  doc.addImage(assets.watermark, 'PNG', 40, 90, 130, 105, undefined, 'FAST')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(105, 105, 105)
  doc.text(`Documento generado por sistema - Código: ${contractCode}`, pageWidth / 2, pageHeight - 9, {
    align: 'center',
  })
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
  if (y + needed < 282) {
    return y
  }
  doc.addPage()
  drawChrome(doc, assets, contractCode)
  return 18
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

export async function downloadEventContractPdf(event: ContractPreview) {
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
    `Conste por el presente documento el contrato de alquiler temporal de local para evento privado que celebran, de una parte, Recepciones Areli, a quien en adelante se le denominará EL ARRENDADOR; y de la otra parte, ${event.clientName}, identificado(a) con DNI/RUC N.° ${valueOrLine(event.clientDocument)}, con domicilio en ${valueOrLine(event.clientAddress)}, a quien en adelante se le denominará EL ARRENDATARIO; bajo los términos y condiciones siguientes:`,
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
    ['Garantía por daños', money.format(event.guaranteeAmount)],
    ['Contacto del cliente', valueOrDash(event.clientPhone)],
    [
      'Pago APDAYC',
      `${money.format(event.apdaycAmount ?? 0)} - Asume: ${apdaycPayerLabels[event.apdaycPayer] ?? event.apdaycPayer} - Estado: ${apdaycStatusLabels[event.apdaycStatus] ?? event.apdaycStatus}`,
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
      body: `${event.apdaycClause} Registro APDAYC del evento: monto ${money.format(event.apdaycAmount ?? 0)}, responsable ${apdaycPayerLabels[event.apdaycPayer] ?? event.apdaycPayer}, estado ${apdaycStatusLabels[event.apdaycStatus] ?? event.apdaycStatus}. Observación: ${valueOrDash(event.apdaycNotes)}.`,
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

  y = ensurePage(doc, assets, y, 50, contractCode)
  y = addHeading(doc, 'ACEPTACIÓN Y FIRMAS', y)
  y = addParagraph(
    doc,
    'En señal de conformidad, ambas partes suscriben el presente documento. Las firmas podrán ser manuscritas o completadas en versión impresa, junto con los datos de identificación que correspondan.',
    y,
  )
  y += 7
  doc.setDrawColor(45, 45, 45)
  doc.line(23, y + 8, 88, y + 8)
  doc.line(122, y + 8, 187, y + 8)
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
    ['Garantía', money.format(event.guaranteeAmount)],
    ['APDAYC / derechos', `${apdaycPayerLabels[event.apdaycPayer] ?? event.apdaycPayer} - ${apdaycStatusLabels[event.apdaycStatus] ?? event.apdaycStatus}`],
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

  doc.save(`${contractCode}-${slug(event.clientName || event.title)}.pdf`)
}
