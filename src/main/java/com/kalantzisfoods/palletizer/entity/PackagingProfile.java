package com.kalantzisfoods.palletizer.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "packaging_profiles")
public class PackagingProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "packaging_type")
    private String packagingType;

    @Column(name = "net_weight")
    private String netWeight;

    @Column(name = "box_qty")
    private Integer boxQty;

    @Column(name = "gross_box_weight")
    private Double grossBoxWeight;

    // --- NEW FIELDS ADDED HERE ---
    private Double length;
    private Double width;
    private Double height;

    // ... Keep your existing getters and setters ...

    // --- ADD NEW GETTERS AND SETTERS ---
    public Double getLength() { return length; }
    public void setLength(Double length) { this.length = length; }

    public Double getWidth() { return width; }
    public void setWidth(Double width) { this.width = width; }

    public Double getHeight() { return height; }
    public void setHeight(Double height) { this.height = height; }
}