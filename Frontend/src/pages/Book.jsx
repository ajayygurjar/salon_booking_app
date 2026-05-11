import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Book() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const serviceId = params.get("serviceId");

    const [step, setStep] = useState(1);
    const [staff, setStaff] = useState([]);
    const [slots, setSlots] = useState([]);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [selectedDate, setSelectedDate] = useState("");
    const [selectedSlot, setSelectedSlot] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Load staff who can do this service
    useEffect(() => {
        api.get("/staff").then(r => {
            const capable = r.data.filter(s =>
                s.services?.some(sv => sv.id === +serviceId) && s.isActive
            );
            setStaff(capable);
        });
    }, [serviceId]);

    // Load slots when staff + date selected
    useEffect(() => {
        if (!selectedStaff || !selectedDate) return;
        setSlots([]); setSelectedSlot("");
        api.get(`/appointments/slots?staffId=${selectedStaff}&serviceId=${serviceId}&date=${selectedDate}`)
            .then(r => setSlots(r.data.availableSlots))
            .catch(() => setSlots([]));
    }, [selectedStaff, selectedDate]);

    const handleBook = async () => {
        setLoading(true); setError("");
        try {
            // Step 1: create appointment
            const { data: apptData } = await api.post("/appointments", {
                serviceId: +serviceId, staffId: +selectedStaff,
                date: selectedDate, time: selectedSlot, notes,
            });

            // Step 2: create Razorpay order
            const { data: orderData } = await api.post("/payments/create-order", {
                appointmentId: apptData.appointment.id,
            });

            // Step 3: open Razorpay checkout
            const options = {
                key: orderData.keyId,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "GlowUp Salon",
                order_id: orderData.orderId,
                handler: async (response) => {
                    // Step 4: verify payment on backend
                    await api.post("/payments/verify", {
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                        appointmentId: apptData.appointment.id,
                    });
                    navigate("/payment-success");
                },
                prefill: { name: "", email: "" },
                theme: { color: "#C1567A" },
            };
            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err) {
            setError(err.response?.data?.message || "Booking failed");
        } finally { setLoading(false); }
    };

    const s = { padding: "24px", maxWidth: "600px", margin: "0 auto" };
    const inp = { width: "100%", padding: "9px 12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box", marginTop: "6px" };

    return (
        <div style={s}>
            <h2 style={{ color: "#C1567A", marginBottom: "24px" }}>Book Appointment</h2>
            {error && <p style={{ color: "red", marginBottom: "12px" }}>{error}</p>}

            <div style={{ marginBottom: "20px" }}>
                <label style={{ fontWeight: "500" }}>Select Stylist</label>
                {staff.map(st => (
                    <div key={st.id} onClick={() => setSelectedStaff(st.id)}
                        style={{
                            padding: "12px", border: `2px solid ${selectedStaff === st.id ? "#C1567A" : "#eee"}`,
                            borderRadius: "10px", marginTop: "8px", cursor: "pointer",
                            background: selectedStaff === st.id ? "#FBEAF0" : "#fff"
                        }}>
                        <strong>{st.name}</strong><span style={{ color: "#888", fontSize: "13px", marginLeft: "8px" }}>{st.phone}</span>
                    </div>
                ))}
            </div>

            <div style={{ marginBottom: "20px" }}>
                <label style={{ fontWeight: "500" }}>Select Date</label>
                <input type="date" style={inp} value={selectedDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={e => setSelectedDate(e.target.value)} />
            </div>

            {slots.length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                    <label style={{ fontWeight: "500" }}>Available Slots</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                        {slots.map(slot => (
                            <button key={slot} onClick={() => setSelectedSlot(slot)}
                                style={{
                                    padding: "7px 14px", border: `2px solid ${selectedSlot === slot ? "#C1567A" : "#ddd"}`,
                                    borderRadius: "8px", background: selectedSlot === slot ? "#C1567A" : "#fff",
                                    color: selectedSlot === slot ? "#fff" : "#333", cursor: "pointer", fontSize: "13px"
                                }}>
                                {slot}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div style={{ marginBottom: "20px" }}>
                <label style={{ fontWeight: "500" }}>Notes (optional)</label>
                <textarea style={{ ...inp, height: "80px" }} value={notes}
                    onChange={e => setNotes(e.target.value)} placeholder="Any special requests..." />
            </div>

            <button onClick={handleBook} disabled={!selectedStaff || !selectedDate || !selectedSlot || loading}
                style={{
                    width: "100%", padding: "12px", background: "#C1567A", color: "#fff", border: "none",
                    borderRadius: "10px", fontSize: "15px", fontWeight: "600", cursor: "pointer",
                    opacity: (!selectedStaff || !selectedDate || !selectedSlot) ? "0.5" : "1"
                }}>
                {loading ? "Processing..." : "Confirm & Pay"}
            </button>
        </div>
    );
}