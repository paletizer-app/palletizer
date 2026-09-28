package com.kalantzisfoods.palletizer.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "pallet_projects")
public class Project {

    @Id
    private String id;

    @Column(name = "user_email")
    private String userEmail;

    @Column(name = "name")
    private String name;

    @Column(name = "date")
    private String date;

    @Column(name = "items_count")
    private int itemsCount;

    @Column(name = "pallet_type")
    private String palletType;

    @Column(name = "optimizer_type")
    private String optimizerType;

    // Standard Postgres TEXT for unlimited length JSON blobs
    @Column(name = "cargo_list", columnDefinition = "TEXT")
    private String cargoList;

    @Column(name = "packed_data", columnDefinition = "TEXT")
    private String packedData;

    // Constructors
    public Project() {}

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public int getItemsCount() { return itemsCount; }
    public void setItemsCount(int itemsCount) { this.itemsCount = itemsCount; }

    public String getPalletType() { return palletType; }
    public void setPalletType(String palletType) { this.palletType = palletType; }

    public String getOptimizerType() { return optimizerType; }
    public void setOptimizerType(String optimizerType) { this.optimizerType = optimizerType; }

    public String getCargoList() { return cargoList; }
    public void setCargoList(String cargoList) { this.cargoList = cargoList; }

    public String getPackedData() { return packedData; }
    public void setPackedData(String packedData) { this.packedData = packedData; }
}