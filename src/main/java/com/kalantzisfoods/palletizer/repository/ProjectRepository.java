package com.kalantzisfoods.palletizer.repository;

import com.kalantzisfoods.palletizer.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectRepository extends JpaRepository<Project, String> {
    // Automatically generates a query to find projects by user and sort them by newest first
    List<Project> findByUserEmailOrderByDateDesc(String userEmail);
}