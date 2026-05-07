package com.areli.api.web;

import com.areli.api.domain.Client;
import com.areli.api.domain.Enums.DocumentType;
import com.areli.api.repository.ClientRepository;
import com.areli.api.service.PeruApiLookupService;
import com.areli.api.web.dto.ApiDtos.ClientRequest;
import com.areli.api.web.dto.ApiDtos.ClientLookupResponse;
import com.areli.api.web.dto.ApiDtos.ClientResponse;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/clients")
public class ClientController {
    private final ClientRepository clients;
    private final PeruApiLookupService peruApiLookupService;

    public ClientController(ClientRepository clients, PeruApiLookupService peruApiLookupService) {
        this.clients = clients;
        this.peruApiLookupService = peruApiLookupService;
    }

    @GetMapping
    public List<ClientResponse> list() {
        return clients.findAll().stream().map(ClientResponse::from).toList();
    }

    @GetMapping("/lookup")
    public ClientLookupResponse lookupByDocument(
            @RequestParam DocumentType documentType,
            @RequestParam String documentNumber) {
        String digitsOnly = documentNumber.replaceAll("\\D", "");
        var result = peruApiLookupService.lookupValidated(documentType, digitsOnly);
        return new ClientLookupResponse(documentType, digitsOnly, result.fullName(), result.address());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ClientResponse create(@RequestBody @Valid ClientRequest request) {
        Client client = clients.save(request.toEntity());
        return ClientResponse.from(client);
    }

    @PutMapping("/{id}")
    public ClientResponse update(@PathVariable UUID id, @RequestBody @Valid ClientRequest request) {
        Client client = clients.findById(id).orElseThrow(() -> new EntityNotFoundException("Cliente no encontrado"));
        client.setFullName(request.fullName());
        client.setDocumentType(request.documentType());
        client.setDocumentNumber(request.documentNumber());
        client.setPhone(request.phone());
        client.setWhatsapp(request.whatsapp());
        client.setEmail(request.email());
        client.setAddress(request.address());
        client.setNotes(request.notes());
        return ClientResponse.from(clients.save(client));
    }
}
