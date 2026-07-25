package io.yak.ops.api.websocket;

import javax.annotation.Resource;
import io.yak.ops.application.port.WorkflowMetricsPublisher;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * WebSocket service for sending workflow-related messages
 * to subscribed clients.
 *
 * <p>
 * This service uses Spring's {@link SimpMessagingTemplate}
 * to publish messages to STOMP topics.
 * </p>
 */
@Service
public class WorkflowWebSocketService implements WorkflowMetricsPublisher {

    /**
     * Spring messaging template for sending WebSocket messages.
     */
    @Resource
    private SimpMessagingTemplate messagingTemplate;

    /**
     * Send a message to the specified WebSocket channel.
     *
     * <p>
     * Messages are published to the {@code /topic/log/{channel}} destination.
     * </p>
     *
     * @param channel logical channel name
     * @param message message payload
     */
    @Override
    public void publish(String channel, Map<String, Object> message) {
        sendMessage(channel, message);
    }

    public void sendMessage(
            String channel,
            Map<String, Object> message) {

        messagingTemplate.convertAndSend(
                "/topic/log/" + channel,
                message);
    }
}
