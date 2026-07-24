package io.baize.flow.boot.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * WebSocket configuration for enabling STOMP messaging in the application.
 *
 * <p>
 * This configuration enables a simple in-memory message broker for topic subscriptions
 * and registers STOMP endpoints for client connections.
 * </p>
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    /**
     * Configure message broker options.
     *
     * <p>
     * Enables a simple in-memory broker with destination prefix "/topic",
     * and sets application destination prefix "/app" for messages
     * bound for @MessageMapping methods.
     * </p>
     *
     * @param config the message broker registry
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable in-memory topic broker
        config.enableSimpleBroker("/topic");
        // Prefix for messages bound for controller methods
        config.setApplicationDestinationPrefixes("/app");
    }

    /**
     * Register STOMP endpoints for WebSocket connections.
     *
     * <p>
     * Clients will connect to "/ws" endpoint. SockJS is enabled for fallback options.
     * Cross-origin requests are allowed from any origin.
     * </p>
     *
     * @param registry the STOMP endpoint registry
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*")
                .withSockJS();
    }
}
