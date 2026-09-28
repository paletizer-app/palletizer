package com.kalantzisfoods.palletizer.service;

import com.kalantzisfoods.palletizer.entity.BoxPreset;
import com.kalantzisfoods.palletizer.repository.BoxPresetRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.io.BufferedReader;
import java.io.StringReader;
import java.util.ArrayList;
import java.util.List;

@Service
public class GoogleSheetsSyncService {

    private final BoxPresetRepository presetRepository;
    private final RestTemplate restTemplate;

    @Value("${google.sheets.csv.url:https://docs.google.com/spreadsheets/d/e/YOUR_PUBLISHED_SHEET_ID/pub?output=csv}")
    private String csvUrl;

    public GoogleSheetsSyncService(BoxPresetRepository presetRepository) {
        this.presetRepository = presetRepository;
        this.restTemplate = new RestTemplate();
    }

    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void syncCompanyPresetsFromGoogleSheets() {
        try {
            String csvData = restTemplate.getForObject(csvUrl, String.class);
            if (csvData == null || csvData.isBlank()) return;

            List<BoxPreset> fetchedPresets = new ArrayList<>();
            try (BufferedReader reader = new BufferedReader(new StringReader(csvData))) {
                String line;
                boolean isHeader = true;

                while ((line = reader.readLine()) != null) {
                    if (isHeader) { isHeader = false; continue; }

                    String[] cols = line.split(",");
                    if (cols.length < 6) continue;

                    String name = cols[0].trim();
                    String type = cols[1].trim().toLowerCase();
                    Double width = Double.parseDouble(cols[2].trim());
                    Double length = Double.parseDouble(cols[3].trim());
                    Double height = Double.parseDouble(cols[4].trim());
                    Double diameter = Double.parseDouble(cols[5].trim());
                    Double weight = cols.length > 6 ? Double.parseDouble(cols[6].trim()) : 0.0;

                    BoxPreset preset = new BoxPreset(name, type, width, length, height, diameter, weight, true, null);
                    fetchedPresets.add(preset);
                }
            }

            if (!fetchedPresets.isEmpty()) {
                presetRepository.deleteByIsGlobalTrue();
                presetRepository.saveAll(fetchedPresets);
                System.out.println(">>> Successfully synced " + fetchedPresets.size() + " presets from Google Sheets!");
            }

        } catch (Exception e) {
            System.err.println("Failed to sync presets from Google Sheets: " + e.getMessage());
        }
    }
}