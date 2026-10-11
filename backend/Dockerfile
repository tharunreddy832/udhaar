FROM eclipse-temurin:21-jdk

WORKDIR /app

COPY . .

RUN chmod +x mvnw
RUN ./mvnw -DskipTests package

EXPOSE 8080

CMD ["sh", "-c", "java -Xms128m -Xmx350m -jar target/backend-0.0.1-SNAPSHOT.jar"]