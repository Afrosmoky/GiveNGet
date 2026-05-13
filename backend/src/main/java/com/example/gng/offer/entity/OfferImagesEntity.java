package com.example.gng.offer.entity;

import com.example.gng.image.model.ImageEntity;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "offer_images")
@Data
public class OfferImagesEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "offer_id", nullable = false)
    private OfferEntity offer;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "image_id", nullable = false)
    private ImageEntity image;
}