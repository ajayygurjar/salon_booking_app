import { Link } from "react-router-dom";

export default function PaymentSuccess() {
    return (
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ fontSize: "60px", marginBottom: "16px" }}>✅</div>
            <h2 style={{ color: "#27500A", fontSize: "24px", marginBottom: "10px" }}>Payment Successful!</h2>
            <p style={{ color: "#666", marginBottom: "24px" }}>
                Your appointment is confirmed. A confirmation email has been sent to you.
            </p>
            <Link to="/appointments" style={{
                padding: "10px 24px", background: "#C1567A", color: "#fff",
                borderRadius: "8px", textDecoration: "none", fontWeight: "500"
            }}>
                View My Appointments
            </Link>
        </div>
    );
}