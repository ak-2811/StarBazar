import React from "react";

const EndUserAgreement = () => {
  return (
    <div style={{ padding: "20px", maxWidth: "900px", margin: "auto" }}>
      <h1>End User Agreement</h1>

      <p>
        Welcome to our Grocery Shopping App. By accessing or using this app,
        you agree to be bound by the terms and conditions described below.
      </p>

      <h2>1. Use of the App</h2>
      <p>
        You agree to use the app only for lawful purposes and in accordance
        with these terms. You must not misuse the app or attempt to disrupt
        its functionality.
      </p>

      <h2>2. Account Responsibility</h2>
      <p>
        Users are responsible for maintaining the confidentiality of their
        account information. Any activity under your account is your
        responsibility.
      </p>

      <h2>3. Orders and Payments</h2>
      <p>
        All orders placed through the app are subject to availability and
        confirmation. Prices and availability of items may change without
        prior notice.
      </p>

      <h2>4. Cancellations and Refunds</h2>
      <p>
        Orders can be canceled within the allowed time window. Refunds will
        be processed as per our refund policy.
      </p>

      <h2>5. Limitation of Liability</h2>
      <p>
        We are not liable for any indirect or consequential damages arising
        from the use of the app.
      </p>

      <h2>6. Changes to Terms</h2>
      <p>
        We may update these terms at any time. Continued use of the app
        indicates acceptance of the updated terms.
      </p>

      <h2>7. Contact Us</h2>
      <p>
        If you have any questions, please contact us at support@example.com.
      </p>

      <p style={{ marginTop: "20px", fontSize: "12px", color: "gray" }}>
        Last updated: {new Date().toLocaleDateString()}
      </p>
    </div>
  );
};

export default EndUserAgreement;