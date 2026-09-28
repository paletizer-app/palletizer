package com.kalantzisfoods.palletizer.controller;

import com.kalantzisfoods.palletizer.entity.StandardBox;
import com.kalantzisfoods.palletizer.repository.StandardBoxRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/boxes")
public class StandardBoxController {

    @Autowired
    private StandardBoxRepository boxRepository;

    @GetMapping
    public List<StandardBox> getAllBoxes() {
        return boxRepository.findAll();
    }
}