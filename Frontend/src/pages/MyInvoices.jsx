import { useState, useEffect } from "react";
import api from "../services/api";

export default function MyInvoices() {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/invoices/my")
            .then(r => setInvoices(r.data.invoices || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <p style={{ padding: "24px" }}>Loading...</p>;

    return (
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "24px 16px" }}>
            <h2 style={{ color: "#C1567A", marginBottom: "20px" }}>My Invoices</h2>
            {invoices.length === 0 ? (
                <p style={{ color: "#888" }}>No invoices yet. Complete a payment to receive an invoice.</p>
            ) : (
                invoices.map(inv => (
                    <div key={inv.id} style={{
                        background: "#fff", border: "1px solid #f0d6e0", borderRadius: "12px",
                        padding: "18px", marginBottom: "14px"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                <h3 style={{ fontSize: "15px", marginBottom: "4px" }}>
                                    {inv.invoiceNumber}
                                </h3>
                                <p style={{ fontSize: "13px", color: "#666" }}>
                                    {inv.appointment?.service?.name} — {inv.appointment?.staff?.name}
                                </p>
                                <p style={{ fontSize: "13px", color: "#666" }}>
                                    {inv.appointment?.date} at {inv.appointment?.time}
                                </p>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: "18px", fontWeight: "600", color: "#C1567A" }}>
                                    ₹{inv.amount}
                                </div>
                                <span style={{
                                    background: inv.status === "paid" ? "#27500A22" : "#854F0B22",
                                    color: inv.status === "paid" ? "#27500A" : "#854F0B",
                                    padding: "2px 8px", borderRadius: "999px", fontSize: "11px"
                                }}>
                                    {inv.status}
                                </span>
                                <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
                                    Issued: {new Date(inv.issuedAt).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
