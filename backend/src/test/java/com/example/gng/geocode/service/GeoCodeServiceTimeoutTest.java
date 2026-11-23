package com.example.gng.geocode.service;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.ResourceAccessException;

import java.net.ServerSocket;
import java.net.Socket;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GeoCodeServiceTimeoutTest {

    @Test
    void brakOdpowiedziGeoapifyKonczySieResourceAccessException() throws Exception {
        // Serwer, który przyjmuje połączenie, ale nigdy nie odpowiada — symulacja zawieszonego Geoapify
        try (ServerSocket server = new ServerSocket(0)) {
            Thread acceptor = new Thread(() -> {
                try (Socket ignored = server.accept()) {
                    Thread.sleep(5_000);
                } catch (Exception ignored) {
                    // koniec testu zamyka gniazdo
                }
            });
            acceptor.setDaemon(true);
            acceptor.start();

            GeoCodeService service = new GeoCodeService(200);
            ReflectionTestUtils.setField(service, "baseUrl", "http://localhost:" + server.getLocalPort());
            ReflectionTestUtils.setField(service, "apiKey", "test");

            long start = System.nanoTime();
            assertThatThrownBy(() -> service.searchByCoordinatesSimplified("52.1935", "21.0047"))
                    .isInstanceOf(ResourceAccessException.class)
                    .isInstanceOf(RuntimeException.class);
            long elapsedMs = (System.nanoTime() - start) / 1_000_000;
            org.assertj.core.api.Assertions.assertThat(elapsedMs).isLessThan(2_000);
        }
    }
}
