package com.kalantzisfoods.palletizer.repository;

import com.kalantzisfoods.palletizer.entity.StandardBox;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StandardBoxRepository extends JpaRepository<StandardBox, Long> {
}