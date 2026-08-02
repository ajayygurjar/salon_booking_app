import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Book() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const serviceId = params.get("serviceId");

    // Redirect if no serviceId — user must pick a service from Home first
    useEffect(() => {
        if (!serviceId) navigate("/");
    }, [serviceId]);

    const [staff, setStaff] = useState([]);
    const [slots, setSlots] = useState([]);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [selectedDate, setSelectedDate] = useState("");
    const [selectedSlot, setSelectedSlot] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [error, setError] = useState("");

    // Load all active staff — filter to those who have this service assigned
    useEffect(() => {
        if (!serviceId) return;
        api.get("/staff").then(r => {
            const list = r.data.staff || r.data || [];
            const capable = (Array.isArray(list) ? list : []).filter(s => {
                const services = s.services || s.Services || [];
                return s.isActive !== false && services.some(sv => sv.id === +serviceId || sv.id === serviceId);
            });
            setStaff(capable);
        }).catch(err => setError("Failed to load staff: " + err.message));
    }, [serviceId]);

    // Load slots when staff + date are both selected
    useEffect(() => {
        if (!selectedStaff || !selectedDate) return;
        setSlotsLoading(true);
        setSlots([]);
        setSelectedSlot("");
        api.get(`/appointments/slots?staffId=${selectedStaff}&serviceId=${serviceId}&date=${selectedDate}`)
            .then(r => setSlots(r.data.availableSlots || []))
            .catch(() => setSlots([]))
            .finally(() => setSlotsLoading(false));
    }, [selectedStaff, selectedDate]);

    const handleBook = async () => {
        setLoading(true);
        setError("");
        try {
            // 1. Create appointment
            const { data: apptData } = await api.post("/appointments", {
                serviceId: +serviceId,
                staffId: +selectedStaff,
                date: selectedDate,
                time: selectedSlot,
                notes,
            });

            // 2. Create Razorpay order
            const { data: orderData } = await api.post("/payments/create-order", {
                appointmentId: apptData.appointment.id,
            });

            // 3. Check Razorpay is loaded
            if (!window.Razorpay) {
                setError("Payment gateway not loaded. Please refresh the page.");
                setLoading(false);
                return;
            }

            // 4. Open Razorpay checkout
            const options = {
                key: orderData.keyId,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "GlowUp Salon",
                description: "Salon Appointment",
                order_id: orderData.orderId,
                handler: async (response) => {
                    try {
                        await api.post("/payments/verify", {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            appointmentId: apptData.appointment.id,
                        });
                        navigate("/payment-success");
                    } catch (e) {
                        setError("Payment succeeded but verification failed. Contact support.");
                    }
                },
                modal: {
                    ondismiss: () => {
                        setError("Payment cancelled. Your booking is saved but unpaid.");
                        setLoading(false);
                    }
                },
                prefill: { name: "", email: "" },
                theme: { color: "#C1567A" },
            };
            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Booking failed. Try again.");
        } finally {
            setLoading(false);
        }
    };

    const inp = {
        width: "100%", padding: "9px 12px", border: "1px solid #ddd",
        borderRadius: "8px", fontSize: "14px", boxSizing: "border-box", marginTop: "6px"
    };

    const canBook = selectedStaff && selectedDate && selectedSlot && !loading;

    return (
        <div style={{ padding: "24px", maxWidth: "600px", margin: "0 auto", textAlign: "left" }}>
            <h2 style={{ color: "#C1567A", marginBottom: "24px" }}>Book Appointment</h2>

            {error && (
                <div style={{
                    background: "#FCEBEB", color: "#791F1F", padding: "10px 14px",
                    borderRadius: "8px", marginBottom: "16px", fontSize: "13px"
                }}>
                    {error}
                </div>
            )}

            {/* STEP 1: Pick staff */}
            <div style={{ marginBottom: "20px" }}>
                <label style={{ fontWeight: "500", display: "block", marginBottom: "8px" }}>
                    Step 1 — Select Stylist
                </label>
                {staff.length === 0 ? (
                    <div style={{ padding: "12px", border: "1px solid #eee", borderRadius: "10px", color: "#888", fontSize: "13px" }}>
                        No staff available for this service. Ask admin to assign staff.
                    </div>
                ) : (
                    staff.map(st => (
                        <div key={st.id} onClick={() => setSelectedStaff(st.id)}
                            style={{
                                padding: "12px", cursor: "pointer", marginBottom: "8px",
                                border: `2px solid ${selectedStaff === st.id ? "#C1567A" : "#eee"}`,
                                borderRadius: "10px",
                                background: selectedStaff === st.id ? "#FBEAF0" : "#fff"
                            }}>
                            <strong>{st.name}</strong>
                            {st.specialization && <span style={{ color: "#888", fontSize: "12px", marginLeft: "8px" }}>— {st.specialization}</span>}
                            {st.phone && <div style={{ color: "#888", fontSize: "12px", marginTop: "2px" }}>{st.phone}</div>}
                        </div>
                    ))
                )}
            </div>

            {/* STEP 2: Pick date */}
            <div style={{ marginBottom: "20px" }}>
                <label style={{ fontWeight: "500", display: "block", marginBottom: "6px" }}>
                    Step 2 — Select Date
                </label>
                <input type="date" style={inp} value={selectedDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={e => setSelectedDate(e.target.value)} />
            </div>

            {/* STEP 3: Pick slot */}
            {selectedStaff && selectedDate && (
                <div style={{ marginBottom: "20px" }}>
                    <label style={{ fontWeight: "500", display: "block", marginBottom: "8px" }}>
                        Step 3 — Available Slots
                    </label>
                    {slotsLoading ? (
                        <p style={{ color: "#888", fontSize: "13px" }}>Loading slots...</p>
                    ) : slots.length === 0 ? (
                        <p style={{ color: "#888", fontSize: "13px" }}>No slots available for this date. Try another date.</p>
                    ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {slots.map(slot => (
                                <button key={slot} onClick={() => setSelectedSlot(slot)}
                                    style={{
                                        padding: "7px 14px", cursor: "pointer", fontSize: "13px",
                                        border: `2px solid ${selectedSlot === slot ? "#C1567A" : "#ddd"}`,
                                        borderRadius: "8px",
                                        background: selectedSlot === slot ? "#C1567A" : "#fff",
                                        color: selectedSlot === slot ? "#fff" : "#333",
                                    }}>
                                    {slot}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Notes */}
            <div style={{ marginBottom: "20px" }}>
                <label style={{ fontWeight: "500", display: "block", marginBottom: "6px" }}>
                    Notes (optional)
                </label>
                <textarea style={{ ...inp, height: "80px", resize: "vertical" }}
                    value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Any special requests or allergies..." />
            </div>

            <button onClick={handleBook} disabled={!canBook}
                style={{
                    width: "100%", padding: "12px", fontSize: "15px", fontWeight: "600",
                    background: canBook ? "#C1567A" : "#ddd",
                    color: canBook ? "#fff" : "#888",
                    border: "none", borderRadius: "10px",
                    cursor: canBook ? "pointer" : "not-allowed",
                }}>
                {loading ? "Processing..." : "Confirm & Pay"}
            </button>
        </div>
    );
}