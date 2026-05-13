-- Create favorite_offers table
CREATE TABLE favorite_offers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    offer_id VARCHAR(12) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (offer_id) REFERENCES offer(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_offer (user_id, offer_id)
);

-- Add index for better performance
CREATE INDEX idx_favorite_offers_user_id ON favorite_offers(user_id);
CREATE INDEX idx_favorite_offers_offer_id ON favorite_offers(offer_id);
CREATE INDEX idx_favorite_offers_created_at ON favorite_offers(created_at);
