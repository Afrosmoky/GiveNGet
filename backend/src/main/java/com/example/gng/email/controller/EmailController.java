package com.example.gng.email.controller;

import com.example.gng.email.service.EmailSenderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/mail")
@Deprecated
public class EmailController {

    @Autowired
    private EmailSenderService emailService;

    @PostMapping("/send")
    public String sendMail(@RequestParam String to) {
        emailService.sendEmail(to, "Test mail", "To jest testowy e-mail z aplikacji Spring Boot", null);
        return "Email wysłany!";
    }
}
