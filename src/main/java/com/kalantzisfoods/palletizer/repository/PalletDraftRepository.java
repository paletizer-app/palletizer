package com.kalantzisfoods.palletizer.repository;

import com.kalantzisfoods.palletizer.entity.UserPalletDraft;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PalletDraftRepository extends JpaRepository<UserPalletDraft, String> {
}