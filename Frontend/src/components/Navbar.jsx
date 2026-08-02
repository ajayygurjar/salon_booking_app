import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

export default function Navbar() {
    const { user, logout, isAdmin } = useAuth();
    const { connected } = useSocket();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    return (
        <nav style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 24px", background: "#C1567A", color: "#fff"
        }}>
            <Link to="/" style={{ color: "#fff", textDecoration: "none", fontWeight: "600", fontSize: "18px" }}>
                ✂ GlowUp Salon
            </Link>
            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                {user ? (
                    <>
                        <Link to="/reviews" style={navLink}>Reviews</Link>
                        {isAdmin ? (
                            <Link to="/admin" style={navLink}>Admin</Link>
                        ) : (
                            <>
                                <Link to="/book" style={navLink}>Book</Link>
                                <Link to="/appointments" style={navLink}>My Appointments</Link>
                                <Link to="/invoices" style={navLink}>Invoices</Link>
                            </>
                        )}
                        <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", opacity: "0.85" }}>
                            <span style={{
                                width: "8px", height: "8px", borderRadius: "50%", display: "inline-block",
                                background: connected ? "#4CAF50" : "#f44336",
                                transition: "background 0.3s"
                            }} />
                            Hi, {user.name}
                        </span>
                        <button onClick={handleLogout} style={btnStyle}>Logout</button>
                    </>
                ) : (
                    <>
                        <Link to="/login" style={navLink}>Login</Link>
                        <Link to="/register" style={navLink}>Register</Link>
                    </>
                )}
            </div>
        </nav>
    );
}

const navLink = { color: "#fff", textDecoration: "none", fontSize: "14px" };
const btnStyle = {
    padding: "6px 14px", background: "transparent", color: "#fff",
    border: "1px solid #fff", borderRadius: "6px", cursor: "pointer", fontSize: "13px"
};