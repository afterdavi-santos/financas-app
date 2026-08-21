# Imagem da API (Spring Boot) para o Render.
#
# Duas etapas: a primeira compila com o JDK e o Maven, a segunda leva só o .jar
# para uma imagem com JRE. Sem isso, a imagem final carregaria o Maven, o
# repositório .m2 e o código-fonte — centenas de MB que não servem para nada em
# execução, e que só aumentam a superfície da imagem.

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# pom.xml sozinho primeiro, e só depois o código: assim a camada de dependências
# (a demorada) fica em cache e só é refeita quando o pom muda. Copiar tudo de uma
# vez faria cada commit em src/ rebaixar o Maven Central inteiro de novo.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src

# -DskipTests é OBRIGATÓRIO aqui, não preguiça: a suíte usa Testcontainers, que
# precisa de um Docker rodando, e não há Docker dentro do build de uma imagem
# Docker. Os testes são a barreira ANTES do deploy (na sua máquina ou no CI),
# não durante ele.
RUN mvn -B -q clean package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app

# Usuário sem privilégio: se um dia a aplicação for comprometida, o atacante não
# cai como root dentro do container.
RUN useradd --system --create-home --shell /usr/sbin/nologin financas
USER financas

COPY --from=build /app/target/*.jar app.jar

# MaxRAMPercentage em vez de -Xmx fixo: a JVM enxerga o limite de memória do
# container e calcula o heap a partir dele, então o mesmo Dockerfile serve tanto
# ao plano gratuito (512 MB) quanto a um maior, sem editar número nenhum.
#
# A porta não é fixada aqui: quem manda é a variável PORT que o Render injeta, e
# o application.properties já a lê (server.port=${PORT:8080}).
ENTRYPOINT ["sh", "-c", "java -XX:MaxRAMPercentage=75 -jar app.jar"]
