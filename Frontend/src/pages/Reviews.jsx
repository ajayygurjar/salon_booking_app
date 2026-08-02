import { useState, useEffect } from "react";
import api from "../services/api";

export default function Reviews() {
    const [reviews, setReviews] = useState([]);
    const [appts, setAppts] = useState([]);
    const [reviewedApptIds, setReviewedApptIds] = useState([]);
    const [form, setForm] = useState({ appointmentId: "", rating: 5, comment: "" });
    const [msg, setMsg] = useState("");
    const [submitted, setSubmitted] = useState(false);

    const fetchData = () => {
        Promise.all([
            api.get("/reviews"),
            api.get("/appointments/my"),
        ]).then(([revRes, apptRes]) => {
            const allReviews = revRes.data.reviews || [];
            const myAppts = apptRes.data.appointments || [];

            setReviews(allReviews);

            const reviewedIds = allReviews.map(r => r.appointmentId);
            setReviewedApptIds(reviewedIds);

            const unreviewed = myAppts.filter(a =>
                a.status === "completed" && !reviewedIds.includes(a.id)
            );
            setAppts(unreviewed);
        });
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post("/reviews", form);
            setSubmitted(true);
            fetchData();
        } catch (err) {
            setMsg(err.response?.data?.message || "Error");
        }
    };

    const inp = { width: "100%", padding: "9px 12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box", marginTop: "4px" };

    return (
        <div style={{ maxWidth: "700px", margin: "0 auto", padding: "24px 16px" }}>
            <h2 style={{ color: "#C1567A", marginBottom: "20px" }}>Reviews</h2>

            {submitted && (
                <div style={{
                    background: "#E3F5E3", color: "#27500A", padding: "14px 18px",
                    borderRadius: "10px", marginBottom: "20px", fontSize: "14px"
                }}>
                    Thank you! Your review has been submitted.
                </div>
            )}

            {!submitted && appts.length > 0 && (
                <div style={{ background: "#fff", border: "1px solid #f0d6e0", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
                    <h3 style={{ marginBottom: "14px" }}>Leave a Review</h3>
                    {msg && <p style={{ color: "red", marginBottom: "10px" }}>{msg}</p>}
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

            {!submitted && appts.length === 0 && (
                <p style={{ color: "#888", marginBottom: "20px" }}>
                    No completed appointments to review yet.
                </p>
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
