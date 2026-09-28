package com.kalantzisfoods.palletizer.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.ZonedDateTime;

@Entity
@Table(name = "user_pallet_drafts")
public class UserPalletDraft {

    @Id // Using the user's email as the primary key for the draft
    @Column(name = "user_id", nullable = false, unique = true)
    private String userId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "cargo_list", columnDefinition = "jsonb", nullable = false)
    private String cargoListJson = "[]";

    @Column(name = "updated_at", insertable = false, updatable = false)
    private ZonedDateTime updatedAt;

    public UserPalletDraft() {}

    public UserPalletDraft(String userId, String cargoListJson) {
        this.userId = userId;
        this.cargoListJson = cargoListJson;
    }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getCargoListJson() { return cargoListJson; }
    public void setCargoListJson(String cargoListJson) { this.cargoListJson = cargoListJson; }
    public ZonedDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(ZonedDateTime updatedAt) { this.updatedAt = updatedAt; }
}