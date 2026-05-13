package com.example.gng.staticcontent.controller;

import com.example.gng.staticcontent.StaticContentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestMapping;

@RestController
@RequestMapping("/api/static-content")
public class StaticContentController {

    private final StaticContentService staticContentService;

    @Autowired
    public StaticContentController(StaticContentService staticContentService) {
        this.staticContentService = staticContentService;
    }

    @GetMapping("/{contentName}")
    public String serveStaticContent(@PathVariable String contentName) {
        return  staticContentService.serveStaticContent(contentName);
    }
}
