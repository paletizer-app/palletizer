package com.kalantzisfoods.palletizer.controller;

import com.kalantzisfoods.palletizer.entity.Project;
import com.kalantzisfoods.palletizer.repository.ProjectRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/projects")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.DELETE, RequestMethod.OPTIONS})
public class ProjectController {

    @Autowired
    private ProjectRepository projectRepository;

    // Manually instantiate to avoid the "no beans found" error
    private final ObjectMapper objectMapper = new ObjectMapper();

    @GetMapping("/{userEmail:.+}")
    public List<Project> getUserProjects(@PathVariable String userEmail) {
        return projectRepository.findByUserEmailOrderByDateDesc(userEmail);
    }

    @PostMapping
    public ResponseEntity<Project> saveProject(@RequestBody Map<String, Object> payload) {
        try {
            Project project = new Project();

            // Bulletproof null-safe parsing
            if (payload.get("id") != null) project.setId(String.valueOf(payload.get("id")));
            if (payload.get("userEmail") != null) project.setUserEmail(String.valueOf(payload.get("userEmail")));
            if (payload.get("name") != null) project.setName(String.valueOf(payload.get("name")));
            if (payload.get("date") != null) project.setDate(String.valueOf(payload.get("date")));

            if (payload.get("itemsCount") != null) {
                // Safely handle both String or Integer types coming from React
                project.setItemsCount(Integer.parseInt(String.valueOf(payload.get("itemsCount"))));
            }

            if (payload.get("palletType") != null) {
                project.setPalletType(String.valueOf(payload.get("palletType")));
            }
            if (payload.get("optimizerType") != null) {
                project.setOptimizerType(String.valueOf(payload.get("optimizerType")));
            }

            // Convert the complex JSON arrays/objects from React into Strings for Supabase TEXT columns
            if (payload.get("cargoList") != null) {
                project.setCargoList(objectMapper.writeValueAsString(payload.get("cargoList")));
            }
            if (payload.get("packedData") != null) {
                project.setPackedData(objectMapper.writeValueAsString(payload.get("packedData")));
            }

            Project savedProject = projectRepository.save(project);
            System.out.println("✅ Successfully saved project to Supabase: " + project.getName());

            return ResponseEntity.ok(savedProject);

        } catch (Exception e) {
            System.err.println("❌ FAILED TO SAVE PROJECT:");
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProject(@PathVariable String id) {
        // If it exists, delete it. If it doesn't, just return OK anyway.
        if (projectRepository.existsById(id)) {
            projectRepository.deleteById(id);
        }
        return ResponseEntity.ok().build();
    }
}