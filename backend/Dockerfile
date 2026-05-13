# Etap 1: Build JAR (jeśli chcesz buildować wewnątrz kontenera)
# Możesz też budować lokalnie i kopiować tylko JAR do obrazu

FROM maven:3.9.6-eclipse-temurin-21 AS builder

WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests

# Etap 2: Runtime
FROM eclipse-temurin:21-jdk-alpine

WORKDIR /app

# Kopiowanie JAR i plików konfiguracyjnych
COPY --from=builder /app/target/*.jar app.jar
COPY --from=builder /app/src/main/resources/application*.properties ./
COPY --from=builder /app/src/main/resources/db ./db
COPY --from=builder /app/pom.xml ./

# Kopiowanie skryptu startowego
COPY start.sh ./
RUN chmod +x start.sh

EXPOSE 8080

CMD ["./start.sh"]
