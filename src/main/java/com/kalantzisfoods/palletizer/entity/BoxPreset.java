package com.kalantzisfoods.palletizer.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;

@Entity
@Table(name = "box_presets")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class BoxPreset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String type; // 'box', 'barrel', 'container'
    private Double width;
    private Double length;
    private Double height;
    private Double diameter;
    private Double weight; // Weight in kg

    @Column(name = "is_global", nullable = false)
    private boolean isGlobal = false;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = true)
    private User user;

    public BoxPreset() {}

    public BoxPreset(String name, String type, Double width, Double length, Double height, Double diameter, Double weight, boolean isGlobal, User user) {
        this.name = name;
        this.type = type;
        this.width = width;
        this.length = length;
        this.height = height;
        this.diameter = diameter;
        this.weight = weight;
        this.isGlobal = isGlobal;
        this.user = user;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public Double getWidth() { return width; }
    public void setWidth(Double width) { this.width = width; }

    public Double getLength() { return length; }
    public void setLength(Double length) { this.length = length; }

    public Double getHeight() { return height; }
    public void setHeight(Double height) { this.height = height; }

    public Double getDiameter() { return diameter; }
    public void setDiameter(Double diameter) { this.diameter = diameter; }

    public Double getWeight() { return weight; }
    public void setWeight(Double weight) { this.weight = weight; }

    public boolean isGlobal() { return isGlobal; }
    public void setGlobal(boolean global) { isGlobal = global; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
}