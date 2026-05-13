package com.example.gng;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class GngApplication {

    public static void main(String[] args) {
        System.out.println("Working dir: " + System.getProperty("user.dir"));
        SpringApplication.run(GngApplication.class, args);
    }

}
