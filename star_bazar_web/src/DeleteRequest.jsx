import React from "react";

export default function DeleteRequest() {
  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Account & Data Deletion Request</h1>

      <p style={styles.text}>
        If you would like to request deletion of your account and associated
        data from our application, please follow the instructions below.
      </p>

      <div style={styles.box}>
        <h3>📧 Email Request</h3>
        <p>
          Send an email to:
          <br />
          <a href="mailto:support@yourdomain.com">
           starbazarsc@gmail.com
          </a>
        </p>

        <ul>
          <li>Your registered email ID</li>
          <li>Your username (if applicable)</li>
          <li>Reason for deletion (optional)</li>
        </ul>
      </div>

      <div style={styles.box}>
        <h3>🕒 Processing Time</h3>
        <p>Your request will be processed within 5–7 business days.</p>
      </div>

      <div style={styles.box}>
        <h3>⚠️ Important</h3>
        <ul>
          <li>All associated data will be permanently deleted</li>
          <li>This action cannot be undone</li>
        </ul>
      </div>

      <p style={styles.footer}>
        For any questions, contact us at{" "}
        <a href="mailto:support@yourdomain.com">
          support@yourdomain.com
        </a>
      </p>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "700px",
    margin: "40px auto",
    padding: "20px",
    fontFamily: "Arial, sans-serif",
    lineHeight: "1.6",
    color: "#333",
  },
  heading: {
    color: "#2c3e50",
  },
  text: {
    marginBottom: "20px",
  },
  box: {
    background: "#f5f5f5",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "20px",
  },
  footer: {
    marginTop: "20px",
  },
};