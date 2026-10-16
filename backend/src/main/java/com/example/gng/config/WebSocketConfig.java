package com.example.gng.config;

import com.example.gng.chat.handler.WebSocketChatHandler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

@Configuration
@EnableWebSocket
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer, WebSocketConfigurer {

    @Autowired
    private WebSocketChatHandler webSocketChatHandler;

    /**
     * Ta sama lista originów co dla HTTP. WebSocket potrzebuje własnej konfiguracji, bo
     * /ws/** jest wyłączone z łańcucha Security przez webSecurityCustomizer.ignoring(),
     * więc filtr CORS-u z SecurityConfig go nie obejmuje — ale źródło musi być jedno.
     */
    @Autowired
    private CorsProperties corsProperties;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Włącz prosty broker wiadomości
        config.enableSimpleBroker("/topic", "/queue");

        // Prefiksy dla aplikacji
        config.setApplicationDestinationPrefixes("/app");

        // Prefiks dla użytkowników
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Zarejestruj endpoint WebSocket z obsługą tokenów JWT w parametrze URL
        registry.addEndpoint("/ws")
                .setAllowedOrigins(corsProperties.resolvedOrigins().toArray(String[]::new));
    }

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        registration.setMessageSizeLimit(64 * 1024) // 64KB
                .setSendBufferSizeLimit(512 * 1024) // 512KB
                .setSendTimeLimit(20000); // 20 seconds
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // Zarejestruj handler dla WebSocket z autoryzacją przez token JWT
        registry.addHandler(webSocketChatHandler, "/ws")
                .setAllowedOrigins(corsProperties.resolvedOrigins().toArray(String[]::new));
    }
}