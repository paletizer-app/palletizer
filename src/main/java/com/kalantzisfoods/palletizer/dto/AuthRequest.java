package com.kalantzisfoods.palletizer.dto;

public class AuthRequest {
    private String email;
    private String password;

    // 1. MUST have an empty default constructor for JSON parsing
    public AuthRequest() {
    }

    public AuthRequest(String email, String password) {
        this.email = email;
        this.password = password;
    }

    // 2. MUST have standard getters and setters
    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}