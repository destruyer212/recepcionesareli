package com.areli.api.repository;

import com.areli.api.domain.PaymentAndOperations.InventoryItem;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface InventoryItemRepository extends JpaRepository<InventoryItem, UUID> {
    @Query("""
            select item
            from InventoryItem item
            join fetch item.categoria categoria
            join fetch item.subcategoria subcategoria
            where item.activo = true
            order by item.piso, categoria.nombre, subcategoria.nombre, item.nombre
            """)
    List<InventoryItem> findActiveDetailed();

    Optional<InventoryItem> findByPisoIgnoreCaseAndCategoria_IdAndSubcategoria_IdAndNombreIgnoreCase(
            String piso,
            UUID categoriaId,
            UUID subcategoriaId,
            String nombre);
}
