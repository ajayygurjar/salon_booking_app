import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Home() {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        api.get("/services")
            .then(r => setServices(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleBook = (serviceId) => {
        if (!user) { navigate("/login"); return; }
        navigate(`/book?serviceId=${serviceId}`);
    };

    return (
        <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "32px 16px" }}>
            <div style={{ textAlign: "center", marginBottom: "40px" }}>
                <h1 style={{ fontSize: "32px", color: "#C1567A", marginBottom: "10px" }}>
                    Welcome to GlowUp Salon
                </h1>
                <p style={{ color: "#666", fontSize: "15px" }}>
                    Book your appointment online — quick, easy, and hassle-free.
                </p>
            </div>

            <h2 style={{ marginBottom: "20px", fontSize: "20px" }}>Our Services</h2>

            {loading ? (
                <p>Loading services...</p>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "20px" }}>
                    {services.filter(s => s.isActive).map(s => (
                        <div key={s.id} style={cardStyle}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div>
                                    <h3 style={{ fontSize: "16px", marginBottom: "4px" }}>{s.name}</h3>
                                    <span style={{ fontSize: "12px", background: "#FBEAF0", color: "#C1567A", padding: "2px 8px", borderRadius: "999px" }}>
                                        {s.category}
                                    </span>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <div style={{ fontSize: "18px", fontWeight: "600", color: "#C1567A" }}>₹{s.price}</div>
                                    <div style={{ fontSize: "12px", color: "#888" }}>{s.duration} min</div>
                                </div>
                            </div>
                            {s.description && <p style={{ fontSize: "13px", color: "#666", margin: "10px 0" }}>{s.description}</p>}
                            <button onClick={() => handleBook(s.id)} style={bookBtnStyle}>
                                Book Now
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const cardStyle = { background: "#fff", border: "1px solid #f0d6e0", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" };
const bookBtnStyle = { marginTop: "14px", width: "100%", padding: "9px", background: "#C1567A", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "500" };