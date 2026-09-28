package com.kalantzisfoods.palletizer.controller;

import com.kalantzisfoods.palletizer.entity.Product;
import com.kalantzisfoods.palletizer.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/products")
public class ProductController {

    @Autowired
    private ProductRepository productRepository;

    @GetMapping
    public List<Product> getAllProducts() {
        // This will automatically fetch active products and their linked packaging profiles
        return productRepository.findAll();
    }
}