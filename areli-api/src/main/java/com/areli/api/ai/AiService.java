package com.areli.api.ai;

import com.areli.api.ai.dto.AiDtos.BalanceExplanationRequest;
import com.areli.api.ai.dto.AiDtos.ContractDraftRequest;
import com.areli.api.ai.dto.AiDtos.EventSummaryRequest;
import com.areli.api.ai.dto.AiDtos.MarketingCopyRequest;
import org.springframework.stereotype.Service;

@Service
public class AiService {
    private static final String STYLE = """
            Responde en espanol claro, profesional y util para Recepciones Areli.
            No inventes datos legales, montos ni fechas que no esten en el input.
            Si falta informacion, deja campos pendientes entre corchetes.
            """;

    private final OpenAiClient openAiClient;

    public AiService(OpenAiClient openAiClient) {
        this.openAiClient = openAiClient;
    }

    public String draftContract(ContractDraftRequest request) {
        String input = """
                Cliente: %s
                Documento cliente: %s
                Evento: %s
                Piso: %s
                Fecha: %s
                Horario: %s a %s
                Paquete: %s
                Monto total: %s
                Adelanto: %s
                Garantia: %s
                Condiciones especiales: %s
                """.formatted(
                request.clientName(),
                value(request.clientDocument()),
                request.eventType(),
                request.floorName(),
                request.eventDate(),
                request.startTime(),
                request.endTime(),
                request.packageName(),
                request.totalAmount(),
                request.depositAmount(),
                request.guaranteeAmount(),
                value(request.specialTerms()));
        return openAiClient.generate(
                "borrador de contrato",
                STYLE + "Genera un borrador de contrato de alquiler de local para evento, con clausulas ordenadas y espacios para firmas.",
                input);
    }

    public String summarizeEvent(EventSummaryRequest request) {
        return openAiClient.generate(
                "resumen de evento",
                STYLE + "Resume el evento en maximo 8 puntos: estado, pagos, pendientes, personal, riesgos y siguiente accion recomendada.",
                request.eventDetails());
    }

    public String marketingCopy(MarketingCopyRequest request) {
        String input = """
                Paquete: %s
                Publico objetivo: %s
                Oferta/detalles: %s
                """.formatted(request.packageName(), request.audience(), value(request.offerDetails()));
        return openAiClient.generate(
                "copy de marketing",
                STYLE + "Crea texto breve para WhatsApp, Facebook/Instagram y reel. Tono elegante, vendedor y directo.",
                input);
    }

    public String explainBalance(BalanceExplanationRequest request) {
        String input = """
                Periodo: %s
                Ingresos: %s
                Pago de personal: %s
                Gastos: %s
                Saldo pendiente por cobrar: %s
                """.formatted(request.period(), request.income(), request.staffPayments(), request.expenses(), request.pendingBalance());
        return openAiClient.generate(
                "explicacion de balance",
                STYLE + "Explica el balance de manera simple para el dueno del negocio e indica alertas financieras.",
                input);
    }

    public String model() {
        return openAiClient.model();
    }

    private String value(String text) {
        return text == null || text.isBlank() ? "[pendiente]" : text;
    }
}
