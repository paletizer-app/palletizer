package com.kalantzisfoods.palletizer.controller;

import com.kalantzisfoods.palletizer.dto.AuthRequest;
import com.kalantzisfoods.palletizer.dto.AuthResponse;
import com.kalantzisfoods.palletizer.entity.User;
import com.kalantzisfoods.palletizer.repository.UserRepository;
import com.kalantzisfoods.palletizer.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder encoder;
    @Autowired private JwtUtil jwtUtil;

    @PostMapping("/signup")
    public ResponseEntity<?> register(@RequestBody AuthRequest req) {
        try {
            if (req == null || req.getEmail() == null || req.getPassword() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Email and password are required."));
            }

            String normalizedEmail = req.getEmail().trim().toLowerCase();

            if (userRepository.existsByEmail(normalizedEmail)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Email already registered."));
            }

            User user = new User();
            user.setEmail(normalizedEmail);
            user.setPassword(encoder.encode(req.getPassword()));
            userRepository.saveAndFlush(user);

            return ResponseEntity.ok(Map.of("message", "Registration successful."));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Registration error: " + (e.getMessage() != null ? e.getMessage() : e.toString())));
        }
    }

    @PostMapping("/signin")
    public ResponseEntity<?> login(@RequestBody AuthRequest req) {
        try {
            if (req == null || req.getEmail() == null || req.getPassword() == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Email and password are required."));
            }

            String normalizedEmail = req.getEmail().trim().toLowerCase();
            User user = userRepository.findByEmail(normalizedEmail).orElse(null);

            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Account not found for this email."));
            }

            if (!encoder.matches(req.getPassword(), user.getPassword())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Incorrect password."));
            }

            String token = jwtUtil.generateToken(user.getEmail());
            return ResponseEntity.ok(new AuthResponse(token, user.getEmail()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Sign in error: " + (e.getMessage() != null ? e.getMessage() : e.toString())));
        }
    }
}