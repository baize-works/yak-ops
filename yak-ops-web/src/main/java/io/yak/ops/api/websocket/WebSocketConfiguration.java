package io.yak.ops.api.websocket;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * 工作流 WebSocket 配置。
 *
 * <p>启用 STOMP 消息代理，并注册前端 WebSocket 连接端点。</p>
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfiguration
        implements WebSocketMessageBrokerConfigurer {

    /**
     * 配置消息代理。
     */
    @Override
    public void configureMessageBroker(
            MessageBrokerRegistry registry) {

        // 服务端向客户端推送消息使用此前缀
        registry.enableSimpleBroker("/topic");

        // 客户端向服务端发送消息使用此前缀
        registry.setApplicationDestinationPrefixes("/app");
    }

    /**
     * 注册 WebSocket 连接端点。
     */
    @Override
    public void registerStompEndpoints(
            StompEndpointRegistry registry) {

        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }
}