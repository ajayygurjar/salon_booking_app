import { useState, useEffect } from "react";
import api from "../services/api";

const STATUS_COLORS = {
    confirmed: "#27500A", pending_payment: "#854F0B",
    cancelled: "#A32D2D", completed: "#185FA5", rescheduled: "#5F3FA5"
};

export default function MyAppointments() {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAppts = () =>
        api.get("/appointments/my")
            .then(r => setAppointments(r.data.appointments))
            .finally(() => setLoading(false));

    useEffect(() => { fetchAppts(); }, []);

    const handleCancel = async (id) => {
        if (!window.confirm("Cancel this appointment?")) return;
        try {
            await api.delete(`/appointments/${id}`);
            fetchAppts();
        } catch (err) { alert(err.response?.data?.message || "Error"); }
    };

    if (loading) return <p style={{ padding: "24px" }}>Loading...</p>;

    return (
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "24px 16px" }}>
            <h2 style={{ color: "#C1567A", marginBottom: "20px" }}>My Appointments</h2>
            {appointments.length === 0 ? (
                <p style={{ color: "#888" }}>No appointments yet. <a href="/">Book one now</a></p>
            ) : (
                appointments.map(a => (
                    <div key={a.id} style={{ background: "#fff", border: "1px solid #f0d6e0", borderRadius: "12px", padding: "18px", marginBottom: "14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                <h3 style={{ fontSize: "16px", marginBottom: "4px" }}>{a.service?.name}</h3>
                                <p style={{ fontSize: "13px", color: "#666" }}>Stylist: {a.staff?.name}</p>
                                <p style={{ fontSize: "13px", color: "#666" }}>{a.date} at {a.time}</p>
                                <p style={{ fontSize: "13px", fontWeight: "500", color: "#C1567A" }}>₹{a.service?.price}</p>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <span style={{
                                    background: STATUS_COLORS[a.status] + "22", color: STATUS_COLORS[a.status],
                                    padding: "3px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "500"
                                }}>
                                    {a.status.replace("_", " ")}
                                </span>
                                {["confirmed", "rescheduled", "pending_payment"].includes(a.status) && (
                                    <button onClick={() => handleCancel(a.id)}
                                        style={{
                                            display: "block", marginTop: "8px", padding: "5px 12px", background: "transparent",
                                            border: "1px solid #A32D2D", color: "#A32D2D", borderRadius: "6px", cursor: "pointer", fontSize: "12px"
                                        }}>
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}