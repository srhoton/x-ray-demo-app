package com.example.xray;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;

import io.quarkus.test.junit.QuarkusTest;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.example.xray.model.HelloResponse;

/**
 * Unit tests for the HelloResource endpoint. Tests verify the endpoint returns the expected JSON
 * response with proper structure and content.
 */
@QuarkusTest
public class HelloResourceTest {

  @Test
  @DisplayName(
      "hello - GET request to /api/hello - should return 200 with Hello World message and"
          + " timestamp")
  void hello_getRequest_returnsHelloWorldWithTimestamp() {
    HelloResponse response =
        given()
            .when()
            .get("/api/hello")
            .then()
            .statusCode(200)
            .contentType("application/json")
            .body("message", is("Hello World"))
            .body("timestamp", notNullValue())
            .extract()
            .as(HelloResponse.class);

    assertThat(response).isNotNull();
    assertThat(response.getMessage()).isEqualTo("Hello World");
    assertThat(response.getTimestamp()).isNotNull();
    assertThat(response.getTimestamp()).matches("\\d{4}-\\d{2}-\\d{2}T.*");
  }

  @Test
  @DisplayName("hello - multiple requests - should return different timestamps")
  void hello_multipleRequests_returnsDifferentTimestamps() throws InterruptedException {
    String firstTimestamp =
        given().when().get("/api/hello").then().statusCode(200).extract().path("timestamp");

    // Wait a brief moment to ensure timestamp changes
    Thread.sleep(10);

    String secondTimestamp =
        given().when().get("/api/hello").then().statusCode(200).extract().path("timestamp");

    assertThat(firstTimestamp).isNotEqualTo(secondTimestamp);
  }

  @Test
  @DisplayName("hello - response content type - should be application/json")
  void hello_responseContentType_shouldBeApplicationJson() {
    given().when().get("/api/hello").then().statusCode(200).contentType("application/json");
  }

  @Test
  @DisplayName("hello - response structure - should match HelloResponse schema")
  void hello_responseStructure_shouldMatchSchema() {
    given()
        .when()
        .get("/api/hello")
        .then()
        .statusCode(200)
        .body("message", notNullValue())
        .body("timestamp", notNullValue())
        .body("size()", is(2)); // Ensure only expected fields are present
  }
}
