package com.kalantzisfoods.palletizer.repository;

import com.kalantzisfoods.palletizer.entity.BoxPreset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BoxPresetRepository extends JpaRepository<BoxPreset, Long> {

    long countByIsGlobalTrue();

    @Modifying
    @Query("DELETE FROM BoxPreset p WHERE p.isGlobal = true")
    void deleteByIsGlobalTrue();

    @Query("SELECT p FROM BoxPreset p LEFT JOIN p.user u WHERE p.isGlobal = true OR (u.email = :userEmail AND p.isGlobal = false)")
    List<BoxPreset> findAllGlobalAndUserPresets(@Param("userEmail") String userEmail);

    List<BoxPreset> findByIsGlobalTrue();
}