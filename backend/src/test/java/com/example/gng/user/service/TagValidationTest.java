package com.example.gng.user.service;

import com.example.gng.exceptions.TooManyTagsException;
import com.example.gng.register.company.model.TagModel;
import com.example.gng.register.company.repository.TagModelRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class TagValidationTest {

    @Mock
    private TagModelRepository tagModelRepository;

    @InjectMocks
    private UserService userService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testProcessTags_ValidTags_Success() {
        // Given
        String tagsString = "fast_food,pizza,italian";
        
        // Mock repository responses
        when(tagModelRepository.findByTagName("fast_food")).thenReturn(Optional.empty());
        when(tagModelRepository.findByTagName("pizza")).thenReturn(Optional.empty());
        when(tagModelRepository.findByTagName("italian")).thenReturn(Optional.empty());
        
        TagModel tag1 = new TagModel();
        tag1.setTagName("fast_food");
        TagModel tag2 = new TagModel();
        tag2.setTagName("pizza");
        TagModel tag3 = new TagModel();
        tag3.setTagName("italian");
        
        when(tagModelRepository.save(any(TagModel.class)))
                .thenReturn(tag1)
                .thenReturn(tag2)
                .thenReturn(tag3);

        // When
        Set<TagModel> result = userService.processTags(tagsString);

        // Then
        assertEquals(3, result.size());
        verify(tagModelRepository, times(3)).save(any(TagModel.class));
    }

    @Test
    void testProcessTags_TooManyTags_ThrowsException() {
        // Given
        String tagsString = "tag1,tag2,tag3,tag4,tag5,tag6";

        // When & Then
        TooManyTagsException exception = assertThrows(TooManyTagsException.class, 
            () -> userService.processTags(tagsString));
        
        assertTrue(exception.getMessage().contains("Maksymalna liczba tagów to 5"));
    }

    @Test
    void testProcessTags_TagTooLong_ThrowsException() {
        // Given
        String veryLongTag = "a".repeat(51); // 51 znaków
        String tagsString = veryLongTag;

        // When & Then
        TooManyTagsException exception = assertThrows(TooManyTagsException.class, 
            () -> userService.processTags(tagsString));
        
        assertTrue(exception.getMessage().contains("jest za długi"));
    }

    @Test
    void testProcessTags_EmptyTags_ReturnsEmptySet() {
        // Given
        String tagsString = "";

        // When
        Set<TagModel> result = userService.processTags(tagsString);

        // Then
        assertTrue(result.isEmpty());
        verify(tagModelRepository, never()).save(any(TagModel.class));
    }

    @Test
    void testProcessTags_DuplicateTags_ReturnsUniqueSet() {
        // Given
        String tagsString = "pizza,pizza,italian";
        
        TagModel pizzaTag = new TagModel();
        pizzaTag.setTagName("pizza");
        TagModel italianTag = new TagModel();
        italianTag.setTagName("italian");
        
        when(tagModelRepository.findByTagName("pizza")).thenReturn(Optional.of(pizzaTag));
        when(tagModelRepository.findByTagName("italian")).thenReturn(Optional.of(italianTag));

        // When
        Set<TagModel> result = userService.processTags(tagsString);

        // Then
        assertEquals(2, result.size()); // Duplikaty powinny być usunięte
        verify(tagModelRepository, never()).save(any(TagModel.class)); // Istniejące tagi nie są zapisywane ponownie
    }
} 