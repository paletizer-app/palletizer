package com.kalantzisfoods.palletizer.config;

import com.kalantzisfoods.palletizer.entity.BoxPreset;
import com.kalantzisfoods.palletizer.repository.BoxPresetRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    private final BoxPresetRepository presetRepository;

    public DataSeeder(BoxPresetRepository presetRepository) {
        this.presetRepository = presetRepository;
    }

    @Override
    public void run(String... args) {
        if (presetRepository.countByIsGlobalTrue() == 0) {
            List<BoxPreset> companyCatalog = List.of(
                    new BoxPreset("Standard Carton A1", "box", 400.0, 300.0, 250.0, 0.0, 12.5, true, null),
                    new BoxPreset("Heavy Duty Carton B2", "box", 600.0, 400.0, 350.0, 0.0, 28.0, true, null),
                    new BoxPreset("Compact Box C1", "box", 300.0, 200.0, 150.0, 0.0, 5.0, true, null),
                    new BoxPreset("200L Industrial Drum", "barrel", 0.0, 0.0, 880.0, 580.0, 210.0, true, null),
                    new BoxPreset("50L Small Barrel", "barrel", 0.0, 0.0, 600.0, 380.0, 52.0, true, null)
            );
            presetRepository.saveAll(companyCatalog);
            System.out.println(">>> Successfully seeded company catalog into Supabase!");
        }
    }
}