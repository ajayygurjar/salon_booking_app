import { useState, useEffect } from "react";
import api from "../services/api";

export default function Reviews() {
    const [reviews, setReviews] = useState([]);
    const [appts, setAppts] = useState([]);
    const [form, setForm] = useState({ appointmentId: "", rating: 5, comment: "" });
    const [msg, setMsg] = useState("");

    useEffect(() => {
        api.get("/reviews").then(r => setReviews(r.data.reviews));
        api.get("/appointments/my").then(r =>
            setAppts(r.data.appointments.filter(a => a.status === "completed"))
        );
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post("/reviews", form);
            setMsg("Review submitted!");
            const r = await api.get("/reviews");
            setReviews(r.data.reviews);
            setForm({ appointmentId: "", rating: 5, comment: "" });
        } catch (err) { setMsg(err.response?.data?.message || "Error"); }
    };

    const inp = { width: "100%", padding: "9px 12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box", marginTop: "4px" };

    return (
        <div style={{ maxWidth: "700px", margin: "0 auto", padding: "24px 16px" }}>
            <h2 style={{ color: "#C1567A", marginBottom: "20px" }}>Reviews</h2>

            {appts.length > 0 && (
                <div style={{ background: "#fff", border: "1px solid #f0d6e0", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
                    <h3 style={{ marginBottom: "14px" }}>Leave a Review</h3>
                    {msg && <p style={{ color: msg.includes("submitted") ? "green" : "red", marginBottom: "10px" }}>{msg}</p>}
                    <form onSubmit={handleSubmit}>
                        <label>Appointment</label>
                        <select style={inp} value={form.appointmentId} onChange={e => setForm({ ...form, appointmentId: e.target.value })} required>
                            <option value="">Select appointment</option>
                            {appts.map(a => <option key={a.id} value={a.id}>{a.service?.name} — {a.date}</option>)}
                        </select>
                        <label style={{ marginTop: "12px", display: "block" }}>Rating</label>
                        <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                            {[1, 2, 3, 4, 5].map(n => (
                                <button type="button" key={n} onClick={() => setForm({ ...form, rating: n })}
                                    style={{
                                        fontSize: "22px", background: "none", border: "none", cursor: "pointer",
                                        color: n <= form.rating ? "#BA7517" : "#ddd"
                                    }}>★</button>
                            ))}
                        </div>
                        <label style={{ marginTop: "12px", display: "block" }}>Comment</label>
                        <textarea style={{ ...inp, height: "80px" }} value={form.comment}
                            onChange={e => setForm({ ...form, comment: e.target.value })} placeholder="Tell us about your experience..." />
                        <button type="submit" style={{ marginTop: "14px", padding: "9px 24px", background: "#C1567A", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>
                            Submit Review
                        </button>
                    </form>
                </div>
            )}

            <h3 style={{ marginBottom: "14px" }}>All Reviews</h3>
            {reviews.map(r => (
                <div key={r.id} style={{ background: "#fff", border: "1px solid #eee", borderRadius: "10px", padding: "16px", marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <strong>{r.user?.name}</strong>
                        <span style={{ color: "#BA7517" }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    </div>
                    <p style={{ color: "#444", margin: "6px 0", fontSize: "14px" }}>{r.comment}</p>
                    <p style={{ fontSize: "12px", color: "#888" }}>For: {r.appointment?.service?.name} &middot; Stylist: {r.staff?.name}</p>
                    {r.staffReply && <div style={{ marginTop: "8px", padding: "8px 12px", background: "#f9f0f4", borderLeft: "3px solid #C1567A", borderRadius: "4px", fontSize: "13px" }}>
                        <strong>{r.staff?.name}:</strong> {r.staffReply}
                    </div>}
                </div>
            ))}
        </div>
    );
}