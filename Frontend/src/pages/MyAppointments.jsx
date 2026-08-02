import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useSocket } from "../context/SocketContext";

const STATUS_COLORS = {
    confirmed: "#27500A", pending_payment: "#854F0B",
    cancelled: "#A32D2D", completed: "#185FA5", rescheduled: "#5F3FA5"
};

export default function MyAppointments() {
    const { socket } = useSocket();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rescheduleId, setRescheduleId] = useState(null);
    const [newDate, setNewDate] = useState("");
    const [newTime, setNewTime] = useState("");
    const [availableSlots, setAvailableSlots] = useState([]);
    const [slotsLoading, setSlotsLoading] = useState(false);

    const fetchAppts = () => {
        setLoading(true);
        api.get("/appointments/my")
            .then(r => setAppointments(r.data.appointments || []))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchAppts(); }, []);

    // Live refresh on socket status changes
    useEffect(() => {
        if (!socket) return;
        const handler = () => fetchAppts();
        socket.on("booking:status", handler);
        return () => socket.off("booking:status", handler);
    }, [socket]);

    const handleCancel = async (id) => {
        if (!window.confirm("Cancel this appointment?")) return;
        try {
            await api.delete(`/appointments/${id}`);
            fetchAppts();
        } catch (err) { alert(err.response?.data?.message || "Error"); }
    };

    const openReschedule = (a) => {
        setRescheduleId(a.id);
        setNewDate("");
        setNewTime("");
        setAvailableSlots([]);
    };

    const closeReschedule = () => {
        setRescheduleId(null);
        setNewDate("");
        setNewTime("");
        setAvailableSlots([]);
    };

    const loadSlots = async (date) => {
        setNewDate(date);
        if (!rescheduleId || !date) return;
        setSlotsLoading(true);
        try {
            const appt = appointments.find(a => a.id === rescheduleId);
            const r = await api.get(`/appointments/slots?staffId=${appt.staffId}&serviceId=${appt.serviceId}&date=${date}`);
            setAvailableSlots(r.data.availableSlots || []);
        } catch {
            setAvailableSlots([]);
        } finally {
            setSlotsLoading(false);
        }
    };

    const handleReschedule = async () => {
        if (!newDate || !newTime) return alert("Select a date and time");
        try {
            await api.put(`/appointments/${rescheduleId}/reschedule`, { newDate, newTime });
            closeReschedule();
            fetchAppts();
        } catch (err) { alert(err.response?.data?.message || "Reschedule failed"); }
    };

    if (loading) return <p style={{ padding: "24px" }}>Loading...</p>;

    const inp = { padding: "8px 10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box" };

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

                                {["confirmed", "rescheduled"].includes(a.status) && (
                                    <button onClick={() => openReschedule(a)}
                                        style={{ display: "block", marginTop: "6px", padding: "5px 12px", background: "transparent",
                                            border: "1px solid #5F3FA5", color: "#5F3FA5", borderRadius: "6px", cursor: "pointer", fontSize: "12px", width: "100%" }}>
                                        Reschedule
                                    </button>
                                )}

                                {["confirmed", "rescheduled", "pending_payment"].includes(a.status) && (
                                    <button onClick={() => handleCancel(a.id)}
                                        style={{ display: "block", marginTop: "6px", padding: "5px 12px", background: "transparent",
                                            border: "1px solid #A32D2D", color: "#A32D2D", borderRadius: "6px", cursor: "pointer", fontSize: "12px", width: "100%" }}>
                                        Cancel
                                    </button>
                                )}

                                {a.paymentStatus === "paid" && (
                                    <Link to="/invoices" style={{ display: "block", marginTop: "6px", padding: "5px 12px",
                                        background: "transparent", border: "1px solid #185FA5", color: "#185FA5",
                                        borderRadius: "6px", cursor: "pointer", fontSize: "12px", textDecoration: "none", textAlign: "center" }}>
                                        Invoice
                                    </Link>
                                )}
                            </div>
                        </div>

                        {rescheduleId === a.id && (
                            <div style={{ marginTop: "16px", padding: "16px", background: "#f9f0f4", borderRadius: "10px", border: "1px solid #f0d6e0" }}>
                                <h4 style={{ marginBottom: "12px", fontSize: "14px" }}>Reschedule Appointment</h4>
                                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>New Date</label>
                                        <input type="date" style={inp} value={newDate}
                                            min={new Date().toISOString().split("T")[0]}
                                            onChange={e => loadSlots(e.target.value)} />
                                    </div>
                                    <div>
                                        <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "4px" }}>New Time</label>
                                        <select style={{ ...inp, minWidth: "100px" }} value={newTime} onChange={e => setNewTime(e.target.value)}>
                                            <option value="">
                                                {slotsLoading ? "Loading..." : availableSlots.length === 0 ? "No slots" : "Select time"}
                                            </option>
                                            {availableSlots.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <button onClick={handleReschedule} disabled={!newDate || !newTime}
                                        style={{ padding: "8px 16px", background: newDate && newTime ? "#5F3FA5" : "#ddd", color: "#fff", border: "none", borderRadius: "6px", cursor: newDate && newTime ? "pointer" : "not-allowed", fontSize: "13px" }}>
                                        Confirm Reschedule
                                    </button>
                                    <button onClick={closeReschedule} style={{ padding: "8px 16px", background: "transparent", border: "1px solid #888", color: "#888", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
}
