package com.example.gng.store.repository;

import com.example.gng.store.entity.StoreEmployeeModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StoreEmployeeRepository extends JpaRepository<StoreEmployeeModel, Long> {

    /** Pracownicy danego sklepu. */
    List<StoreEmployeeModel> findByStoreId(Long storeId);

    /** Strona pracowników danego sklepu — lista w panelu firmy. */
    Page<StoreEmployeeModel> findByStore_Id(Long storeId, Pageable pageable);

    /** Pracownik, ale tylko jeśli należy do wskazanego sklepu — cudzy jest dla firmy niewidoczny. */
    Optional<StoreEmployeeModel> findByIdAndStore_Id(Long id, Long storeId);
}
