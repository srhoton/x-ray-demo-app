package com.example.xray.model;

import java.time.Instant;

/** Response model for the hello endpoint. */
public class HelloResponse {

  private String message;
  private String timestamp;

  /** Default constructor for Jackson serialization. */
  public HelloResponse() {}

  /**
   * Creates a HelloResponse with the specified message.
   *
   * @param message The message to include in the response
   */
  public HelloResponse(String message) {
    this.message = message;
    this.timestamp = Instant.now().toString();
  }

  /**
   * Gets the message.
   *
   * @return The message
   */
  public String getMessage() {
    return message;
  }

  /**
   * Sets the message.
   *
   * @param message The message to set
   */
  public void setMessage(String message) {
    this.message = message;
  }

  /**
   * Gets the timestamp.
   *
   * @return The timestamp in ISO-8601 format
   */
  public String getTimestamp() {
    return timestamp;
  }

  /**
   * Sets the timestamp.
   *
   * @param timestamp The timestamp to set
   */
  public void setTimestamp(String timestamp) {
    this.timestamp = timestamp;
  }
}
