package com.example.gng.staticcontent;

import com.example.gng.staticcontent.model.StaticContentModel;
import com.example.gng.staticcontent.repository.StaticContentModelRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class StaticContentService {
    private final StaticContentModelRepository staticContentModelRepository;

    @Autowired
    public StaticContentService(StaticContentModelRepository staticContentModelRepository) {
        this.staticContentModelRepository = staticContentModelRepository;
    }

    public String serveStaticContent(String contentName) {
        Optional<StaticContentModel> optModel = staticContentModelRepository.findFirstByNameAndLangOrderByVersionDesc(contentName, "en");
        if (optModel.isPresent()) {
            return optModel.get().getContent();
        }
        return "<h1>404 - NOT FOUND</h1>";
    }
}
