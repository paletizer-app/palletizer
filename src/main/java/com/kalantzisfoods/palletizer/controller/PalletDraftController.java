package com.kalantzisfoods.palletizer.controller;

import com.kalantzisfoods.palletizer.entity.UserPalletDraft;
import com.kalantzisfoods.palletizer.repository.PalletDraftRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/pallet-drafts")
@CrossOrigin(origins = "*") // Adjust origins as needed for your React frontend
public class PalletDraftController {

    @Autowired
    private PalletDraftRepository draftRepository;

    /**
     * Retrieves the saved pallet draft for a specific user.
     */
    @GetMapping("/{userId}")
    public ResponseEntity<UserPalletDraft> getDraft(@PathVariable String userId) {
        return draftRepository.findById(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Saves or updates the pallet draft for a specific user.
     */
    @PostMapping("/{userId}")
    public ResponseEntity<UserPalletDraft> saveDraft(
            @PathVariable String userId,
            @RequestBody String cargoListJson) {

        UserPalletDraft draft = draftRepository.findById(userId).orElse(new UserPalletDraft());
        draft.setUserId(userId);
        draft.setCargoListJson(cargoListJson);

        UserPalletDraft savedDraft = draftRepository.save(draft);
        return ResponseEntity.ok(savedDraft);
    }
}