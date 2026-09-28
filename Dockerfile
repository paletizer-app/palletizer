# STAGE 1: Build the Spring Boot application using Maven (Java 26)
FROM maven:3.9-eclipse-temurin-26 AS build
WORKDIR /app

# Copy the pom.xml and source code
COPY pom.xml .
COPY src ./src

# Compile the application and skip tests to speed up the build
RUN mvn clean package -DskipTests

# STAGE 2: Run the application using a lightweight Java Runtime (Java 26)
FROM eclipse-temurin:26-jre-alpine
WORKDIR /app

# Copy only the compiled .jar file from the build stage
COPY --from=build /app/target/*.jar app.jar

# Expose the standard Spring Boot port
EXPOSE 8080

# Start the application
ENTRYPOINT ["java", "-jar", "app.jar"]