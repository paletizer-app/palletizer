package com.kalantzisfoods.palletizer.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;

@Entity
@Table(name = "products")
public class Product {

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "standard_box_id")
    private StandardBox standardBox;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String code;

    private String category;

    @Column(name = "sub_category")
    private String subCategory;

    private String style;

    private String flavor;

    private String packaging;

    @Column(name = "drained_weight")
    private String drainedWeight;

    @Column(name = "net_weight")
    private String netWeight;

    @Column(name = "box_qty")
    private Integer boxQty;

    @Column(name = "price_eur")
    private Double priceEur;

    @Column(name = "is_organic")
    private Boolean isOrganic;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "data_flag")
    private String dataFlag;

    @Column(name = "sort_order")
    private Integer sortOrder;

    @Column(name = "box_weight")
    private BigDecimal boxWeight;

    private Boolean active;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "packaging_profile_id")
    private PackagingProfile packagingProfile;


    // --- GETTERS AND SETTERS ---

    public StandardBox getStandardBox() { return standardBox; }
    public void setStandardBox(StandardBox standardBox) { this.standardBox = standardBox; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getSubCategory() { return subCategory; }
    public void setSubCategory(String subCategory) { this.subCategory = subCategory; }

    public String getStyle() { return style; }
    public void setStyle(String style) { this.style = style; }

    public String getFlavor() { return flavor; }
    public void setFlavor(String flavor) { this.flavor = flavor; }

    public String getPackaging() { return packaging; }
    public void setPackaging(String packaging) { this.packaging = packaging; }

    public String getDrainedWeight() { return drainedWeight; }
    public void setDrainedWeight(String drainedWeight) { this.drainedWeight = drainedWeight; }

    public String getNetWeight() { return netWeight; }
    public void setNetWeight(String netWeight) { this.netWeight = netWeight; }

    public Integer getBoxQty() { return boxQty; }
    public void setBoxQty(Integer boxQty) { this.boxQty = boxQty; }

    public Double getPriceEur() { return priceEur; }
    public void setPriceEur(Double priceEur) { this.priceEur = priceEur; }

    public Boolean getIsOrganic() { return isOrganic; }
    public void setIsOrganic(Boolean isOrganic) { this.isOrganic = isOrganic; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getDataFlag() { return dataFlag; }
    public void setDataFlag(String dataFlag) { this.dataFlag = dataFlag; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }

    public BigDecimal getBoxWeight() {
        return boxWeight;
    }

    public void setBoxWeight(BigDecimal boxWeight) {
        this.boxWeight = boxWeight;
    }

    public PackagingProfile getPackagingProfile() { return packagingProfile; }
    public void setPackagingProfile(PackagingProfile packagingProfile) { this.packagingProfile = packagingProfile; }
}