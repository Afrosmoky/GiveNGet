package com.example.gng.offer.repository;

import com.example.gng.image.model.ImageEntity;
import com.example.gng.offer.entity.OfferEntity;
import com.example.gng.offer.entity.OfferImagesEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OfferImagesRepository extends JpaRepository<OfferImagesEntity, Long> {
    void deleteByOfferAndImage(OfferEntity offer, ImageEntity image);
    List<OfferImagesEntity> findByOffer(OfferEntity offer);
}