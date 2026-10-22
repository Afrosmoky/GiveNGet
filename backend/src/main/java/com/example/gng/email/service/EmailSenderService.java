package com.example.gng.email.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.mail.MailPreparationException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.UnsupportedEncodingException;

@Service
public class EmailSenderService {

    private final JavaMailSender mailSender;
    // Adres nadawcy = konto SMTP (Gmail i tak nie wyśle z cudzego adresu); zmieniamy tylko nazwę wyświetlaną
    private final String fromAddress;
    private final String fromName;

    @Autowired
    public EmailSenderService(JavaMailSender mailSender,
                              @Value("${spring.mail.username}") String fromAddress,
                              @Value("${mail.from-name:Biovlo}") String fromName) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        this.fromName = fromName;
    }

    public void sendEmail(String to, String subject, String htmlContent, File attachment) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true); // 'true' = multipart

            helper.setFrom(fromAddress, fromName); // w skrzynce: „Biovlo”, nie login konta SMTP
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true); // 'true' = HTML

            if (attachment != null && attachment.exists()) {
                FileSystemResource file = new FileSystemResource(attachment);
                helper.addAttachment(file.getFilename(), file);
            }

            mailSender.send(message);
        } catch (MessagingException | UnsupportedEncodingException e) {
            // MailException, jak błędy samej wysyłki — wywołujący łapią jeden typ
            throw new MailPreparationException("Błąd podczas przygotowania e-maila: " + e.getMessage(), e);
        }
    }
}

