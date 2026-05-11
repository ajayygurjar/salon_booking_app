import { useState, useEffect } from "react";
import api from "../services/api";

const STATUS_COLORS = {
    confirmed: "#27500A", pending_payment: "#854F0B",
    cancelled: "#A32D2D", completed: "#185FA5", rescheduled: "#5F3FA5"
};

export default function AdminDashboard() {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        api.get("/appointments/admin/all")
            .then(r => setAppointments(r.data.appointments))
            .finally(() => setLoading(false));
    }, []);

    const updateStatus = async (id, status) => {
        await api.put(`/appointments/admin/${id}`, { status });
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    };

    const statuses = ["all", "pending_payment", "confirmed", "completed", "cancelled"];
    const filtered = filter === "all" ? appointments : appointments.filter(a => a.status === filter);
    const revenue = appointments.filter(a => a.paymentStatus === "paid").reduce((s, a) => s + (a.amountPaid || 0), 0);

    if (loading) return <p style={{ padding: "24px" }}>Loading...</p>;

    return (
        <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "24px 16px" }}>
            <h2 style={{ color: "#C1567A", marginBottom: "20px" }}>Admin Dashboard</h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px", marginBottom: "24px" }}>
                {[
                    ["Total Bookings", appointments.length],
                    ["Confirmed", appointments.filter(a => a.status === "confirmed").length],
                    ["Revenue", `₹${revenue.toLocaleString()}`]
                ].map(([label, val]) => (
                    <div key={label} style={{ background: "#fff", border: "1px solid #f0d6e0", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
                        <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>{label}</div>
                        <div style={{ fontSize: "24px", fontWeight: "600", color: "#C1567A" }}>{val}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
                {statuses.map(s => (
                    <button key={s} onClick={() => setFilter(s)}
                        style={{
                            padding: "6px 14px", borderRadius: "999px", border: "1px solid #ddd", cursor: "pointer", fontSize: "12px",
                            background: filter === s ? "#C1567A" : "#fff", color: filter === s ? "#fff" : "#333"
                        }}>
                        {s.replace("_", " ")}
                    </button>
                ))}
            </div>

            {filtered.map(a => (
                <div key={a.id} style={{ background: "#fff", border: "1px solid #eee", borderRadius: "10px", padding: "16px", marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                    <div>
                        <strong>{a.user?.name}</strong><span style={{ color: "#888", fontSize: "13px", marginLeft: "8px" }}>{a.user?.email}</span>
                        <p style={{ fontSize: "13px", color: "#555", margin: "2px 0" }}>{a.service?.name} · {a.staff?.name} · {a.date} {a.time}</p>
                        <p style={{ fontSize: "13px", fontWeight: "600" }}>₹{a.amountPaid} — {a.paymentStatus}</p>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <span style={{ background: STATUS_COLORS[a.status] + "22", color: STATUS_COLORS[a.status], padding: "3px 10px", borderRadius: "999px", fontSize: "12px" }}>
                            {a.status.replace("_", " ")}
                        </span>
                        {a.status === "confirmed" && (
                            <button onClick={() => updateStatus(a.id, "completed")}
                                style={{ padding: "5px 12px", background: "#185FA5", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>
                                Mark Completed
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}