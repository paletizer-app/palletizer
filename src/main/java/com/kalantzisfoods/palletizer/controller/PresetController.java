package com.kalantzisfoods.palletizer.controller;

import com.kalantzisfoods.palletizer.entity.BoxPreset;
import com.kalantzisfoods.palletizer.entity.User;
import com.kalantzisfoods.palletizer.repository.BoxPresetRepository;
import com.kalantzisfoods.palletizer.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/presets")
public class PresetController {

    private final BoxPresetRepository presetRepository;
    private final UserRepository userRepository;

    public PresetController(BoxPresetRepository presetRepository, UserRepository userRepository) {
        this.presetRepository = presetRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<BoxPreset>> getPresets(Authentication authentication) {
        if (authentication != null && authentication.isAuthenticated() && !"anonymousUser".equals(authentication.getName())) {
            return ResponseEntity.ok(presetRepository.findAllGlobalAndUserPresets(authentication.getName()));
        }
        return ResponseEntity.ok(presetRepository.findByIsGlobalTrue());
    }

    @PostMapping
    public ResponseEntity<?> createPreset(@RequestBody BoxPreset preset, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getName())) {
            return ResponseEntity.status(401).body("Authentication required to save custom presets.");
        }

        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body("User not found.");
        }

        preset.setUser(user);
        preset.setGlobal(false);

        BoxPreset saved = presetRepository.save(preset);
        return ResponseEntity.ok(saved);
    }
}