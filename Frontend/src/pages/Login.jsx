import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export default function Login() {
    const [form, setForm] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError("");
        try {
            const { data } = await api.post("/auth/login", form);
            login(data.user, data.token);
            navigate(data.user.role === "admin" ? "/admin" : "/");
        } catch (err) {
            setError(err.response?.data?.message || "Login failed");
        } finally { setLoading(false); }
    };

    return (
        <div style={pageStyle}>
            <div style={cardStyle}>
                <h2 style={{ color: "#C1567A", marginBottom: "20px" }}>Login</h2>
                {error && <p style={{ color: "red", marginBottom: "12px", fontSize: "13px" }}>{error}</p>}
                <form onSubmit={handleSubmit}>
                    <input style={inputStyle} type="email" placeholder="Email" required
                        value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                    <input style={inputStyle} type="password" placeholder="Password" required
                        value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                    <button type="submit" style={btnStyle} disabled={loading}>
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </form>
                <p style={{ marginTop: "14px", fontSize: "13px" }}>
                    No account? <Link to="/register">Register here</Link>
                </p>
            </div>
        </div>
    );
}

const pageStyle = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "80vh"
};
const cardStyle = {
    background: "#fff",
    padding: "32px",
    borderRadius: "12px",
    width: "360px",
    boxShadow: "0 2px 16px rgba(0,0,0,0.08)"
};
const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    marginBottom: "12px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    fontSize: "14px",
    boxSizing: "border-box"
};
const btnStyle = {
    width: "100%",
    padding: "11px",
    background: "#C1567A",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    cursor: "pointer",
    fontWeight: "500"
};