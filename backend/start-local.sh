#!/bin/sh
# Uruchamia backend lokalnie z profilem 'local' (application-local.properties)
# Wymaga uruchomionego MySQL - np. via: docker compose -f ../backend/docker-compose.yml up -d
java -Xmx512m -Xms256m -jar app.jar --spring.profiles.active=local
