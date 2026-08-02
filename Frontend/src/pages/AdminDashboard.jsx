import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import api from "../services/api";

const STATUS_COLORS = {
    confirmed: "#27500A", pending_payment: "#854F0B",
    cancelled: "#A32D2D", completed: "#185FA5", rescheduled: "#5F3FA5"
};

const TABS = ["appointments", "services", "staff", "users", "settings", "invoices"];

export default function AdminDashboard() {
    const { user } = useAuth();
    const { socket } = useSocket();
    const [tab, setTab] = useState("appointments");
    const [refreshKey, setRefreshKey] = useState(0);
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        if (!socket) return;

        const EVENT_MAP = {
            "booking:new": { msg: "New booking received!", color: "#C1567A" },
            "booking:cancelled": { msg: "A booking was cancelled", color: "#A32D2D" },
            "booking:confirmed": { msg: "Payment completed — booking confirmed", color: "#27500A" },
            "booking:rescheduled": { msg: "A booking was rescheduled", color: "#5F3FA5" },
        };

        const handlers = {};

        Object.entries(EVENT_MAP).forEach(([evt, info]) => {
            handlers[evt] = () => {
                setNotification(info);
                setRefreshKey(k => k + 1);
                setTimeout(() => setNotification(null), 4000);
            };
            socket.on(evt, handlers[evt]);
        });

        return () => {
            Object.entries(handlers).forEach(([evt, fn]) => socket.off(evt, fn));
        };
    }, [socket]);

    return (
        <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "24px 16px" }}>
            <h2 style={{ color: "#C1567A", marginBottom: "4px" }}>Welcome to Admin, {user?.name}!</h2>
            <p style={{ color: "#888", fontSize: "13px", marginBottom: "20px" }}>Manage salon operations</p>

            <div style={{ display: "flex", gap: "0", marginBottom: "24px", borderBottom: "2px solid #f0d6e0", flexWrap: "wrap" }}>
                {TABS.map(t => (
                    <button key={t} onClick={() => setTab(t)} style={{
                        padding: "10px 20px", background: tab === t ? "#C1567A" : "transparent",
                        color: tab === t ? "#fff" : "#666", border: "none", borderRadius: "8px 8px 0 0",
                        cursor: "pointer", fontWeight: "500", fontSize: "14px", textTransform: "capitalize"
                    }}>
                        {t}
                    </button>
                ))}
            </div>

            {notification && (
                <div style={{
                    padding: "10px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px", fontWeight: "500",
                    background: notification.color + "18", color: notification.color, border: `1px solid ${notification.color}44`,
                }}>
                    🔔 {notification.msg}
                </div>
            )}

            {tab === "appointments" && <AppointmentsTab refreshKey={refreshKey} />}
            {tab === "services" && <ServicesTab />}
            {tab === "staff" && <StaffTab />}
            {tab === "users" && <UsersTab />}
            {tab === "settings" && <SettingsTab />}
            {tab === "invoices" && <InvoicesTab />}
        </div>
    );
}

/* ================================================================
   APPOINTMENTS TAB
   ================================================================ */
function AppointmentsTab({ refreshKey }) {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");

    const fetch = () => {
        setLoading(true);
        api.get("/appointments/admin/all")
            .then(r => setAppointments(r.data.appointments || []))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetch(); }, [refreshKey]);

    const updateStatus = async (id, data) => {
        await api.put(`/appointments/admin/${id}`, data);
        fetch();
    };

    const statuses = ["all", "pending_payment", "confirmed", "completed", "cancelled", "rescheduled"];
    const filtered = filter === "all" ? appointments : appointments.filter(a => a.status === filter);
    const revenue = appointments.filter(a => a.paymentStatus === "paid").reduce((s, a) => s + (a.amountPaid || 0), 0);

    if (loading) return <p>Loading appointments...</p>;

    return (
        <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px", marginBottom: "24px" }}>
                {[
                    ["Total Bookings", appointments.length],
                    ["Confirmed", appointments.filter(a => a.status === "confirmed").length],
                    ["Revenue", `₹${revenue.toLocaleString()}`]
                ].map(([label, val]) => (
                    <div key={label} style={statCardStyle}>
                        <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>{label}</div>
                        <div style={{ fontSize: "24px", fontWeight: "600", color: "#C1567A" }}>{val}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
                {statuses.map(s => (
                    <button key={s} onClick={() => setFilter(s)} style={filterBtn(filter === s)}>
                        {s.replace("_", " ")}
                    </button>
                ))}
                <button onClick={fetch} style={{ ...filterBtn(false), marginLeft: "auto", background: "#eee" }}>↻ Refresh</button>
            </div>

            {filtered.map(a => (
                <div key={a.id} style={{ background: "#fff", border: "1px solid #eee", borderRadius: "10px", padding: "16px", marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                    <div>
                        <strong>{a.user?.name}</strong><span style={{ color: "#888", fontSize: "13px", marginLeft: "8px" }}>{a.user?.email}</span>
                        <p style={{ fontSize: "13px", color: "#555", margin: "2px 0" }}>{a.service?.name} · {a.staff?.name} · {a.date} {a.time}</p>
                        <p style={{ fontSize: "13px", fontWeight: "600" }}>₹{a.amountPaid} — {a.paymentStatus}</p>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ background: STATUS_COLORS[a.status] + "22", color: STATUS_COLORS[a.status], padding: "3px 10px", borderRadius: "999px", fontSize: "12px" }}>
                            {a.status.replace("_", " ")}
                        </span>
                        {a.status === "confirmed" && (
                            <button onClick={() => updateStatus(a.id, { status: "completed" })} style={smBtn("#185FA5")}>Complete</button>
                        )}
                        {a.status === "pending_payment" && (
                            <button onClick={() => updateStatus(a.id, { status: "cancelled" })} style={smBtn("#A32D2D")}>Cancel</button>
                        )}
                    </div>
                </div>
            ))}
        </>
    );
}

/* ================================================================
   SERVICES TAB (Full CRUD, dynamic)
   ================================================================ */
function ServicesTab() {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: "", description: "", duration: "", price: "", category: "" });
    const [search, setSearch] = useState("");

    const fetch = () => {
        setLoading(true);
        api.get("/services").then(r => {
            const data = r.data.services || r.data || [];
            setServices(Array.isArray(data) ? data : []);
        }).finally(() => setLoading(false));
    };

    useEffect(() => { fetch(); }, []);

    const resetForm = () => setForm({ name: "", description: "", duration: "", price: "", category: "" });

    const handleSave = async () => {
        if (!form.name || !form.duration || !form.price) return alert("Name, duration & price required");
        try {
            if (editing) {
                await api.put(`/services/${editing}`, { ...form, duration: +form.duration, price: +form.price });
            } else {
                await api.post("/services", { ...form, duration: +form.duration, price: +form.price });
            }
            resetForm();
            setEditing(null);
            fetch();
        } catch (err) { alert(err.response?.data?.message || "Error saving service"); }
    };

    const handleEdit = (s) => {
        setEditing(s.id);
        setForm({ name: s.name, description: s.description || "", duration: String(s.duration), price: String(s.price), category: s.category || "" });
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this service?")) return;
        await api.delete(`/services/${id}`);
        fetch();
    };

    const handleToggleActive = async (s) => {
        await api.put(`/services/${s.id}`, { isActive: !s.isActive });
        fetch();
    };

    const filtered = services.filter(s =>
        !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.category?.toLowerCase().includes(search.toLowerCase())
    );

    const inp = { width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box" };

    if (loading) return <p>Loading services...</p>;

    return (
        <div>
            <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
                <h3 style={{ marginBottom: "12px" }}>{editing ? "Edit Service" : "Add New Service"}</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <input placeholder="Name *" style={inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    <input placeholder="Category" style={inp} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
                    <input placeholder="Duration (min) *" type="number" style={inp} value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} />
                    <input placeholder="Price (₹) *" type="number" style={inp} value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                    <textarea placeholder="Description" style={{ ...inp, gridColumn: "1/3", height: "60px", resize: "vertical" }}
                        value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                    <button onClick={handleSave} style={smBtn("#C1567A")}>{editing ? "Update" : "Create"}</button>
                    {editing && <button onClick={() => { resetForm(); setEditing(null); }} style={smBtn("#888")}>Cancel</button>}
                </div>
            </div>

            <input placeholder="Search services..." style={{ ...inp, marginBottom: "12px" }}
                value={search} onChange={e => setSearch(e.target.value)} />

            {filtered.map(s => (
                <div key={s.id} style={{ background: "#fff", border: "1px solid #eee", borderRadius: "10px", padding: "14px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ opacity: s.isActive ? 1 : 0.5 }}>
                        <strong>{s.name}</strong>
                        <span style={{ color: "#888", fontSize: "12px", marginLeft: "8px" }}>{s.category}</span>
                        <p style={{ fontSize: "13px", color: "#555", margin: "2px 0" }}>₹{s.price} · {s.duration} min</p>
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <button onClick={() => handleToggleActive(s)} style={smBtn(s.isActive ? "#854F0B" : "#27500A")}>
                            {s.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button onClick={() => handleEdit(s)} style={smBtn("#185FA5")}>Edit</button>
                        <button onClick={() => handleDelete(s.id)} style={smBtn("#A32D2D")}>Delete</button>
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ================================================================
   STAFF TAB (Full CRUD + assign services)
   ================================================================ */
function StaffTab() {
    const [staff, setStaff] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);
    const [assignStaffId, setAssignStaffId] = useState(null);
    const [selectedServiceIds, setSelectedServiceIds] = useState([]);
    const [form, setForm] = useState({ name: "", email: "", phone: "", specialization: "", workingDays: "Mon,Tue,Wed,Thu,Fri,Sat" });

    const fetch = () => {
        setLoading(true);
        Promise.all([
            api.get("/staff"),
            api.get("/services")
        ]).then(([staffRes, svcRes]) => {
            const sList = staffRes.data.staff || staffRes.data || [];
            const svcList = svcRes.data.services || svcRes.data || [];
            setStaff(Array.isArray(sList) ? sList : []);
            setServices(Array.isArray(svcList) ? svcList : []);
        }).finally(() => setLoading(false));
    };

    useEffect(() => { fetch(); }, []);

    const resetForm = () => setForm({ name: "", email: "", phone: "", specialization: "", workingDays: "Mon,Tue,Wed,Thu,Fri,Sat" });

    const handleSave = async () => {
        if (!form.name) return alert("Name is required");
        try {
            if (editing) {
                await api.put(`/staff/${editing}`, form);
            } else {
                await api.post("/staff", form);
            }
            resetForm();
            setEditing(null);
            fetch();
        } catch (err) { alert(err.response?.data?.message || "Error saving staff"); }
    };

    const handleEdit = (s) => {
        setEditing(s.id);
        setForm({ name: s.name, email: s.email || "", phone: s.phone || "", specialization: s.specialization || "", workingDays: s.workingDays || "Mon,Tue,Wed,Thu,Fri,Sat" });
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this staff member?")) return;
        await api.delete(`/staff/${id}`);
        if (assignStaffId === id) setAssignStaffId(null);
        fetch();
    };

    const handleAssign = async () => {
        if (!assignStaffId) return;
        await api.put(`/staff/${assignStaffId}/services`, { serviceIds: selectedServiceIds });
        setAssignStaffId(null);
        setSelectedServiceIds([]);
        fetch();
    };

    const openAssign = (s) => {
        setAssignStaffId(s.id);
        setSelectedServiceIds((s.services || []).map(sv => sv.id));
    };

    const inp = { width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box" };

    if (loading) return <p>Loading staff...</p>;

    return (
        <div>
            <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
                <h3 style={{ marginBottom: "12px" }}>{editing ? "Edit Staff" : "Add New Staff"}</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <input placeholder="Name *" style={inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    <input placeholder="Email" style={inp} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                    <input placeholder="Phone" style={inp} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                    <input placeholder="Specialization" style={inp} value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} />
                    <input placeholder="Working Days (e.g. Mon,Tue,Wed)" style={{ ...inp, gridColumn: "1/3" }}
                        value={form.workingDays} onChange={e => setForm({ ...form, workingDays: e.target.value })} />
                </div>
                <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                    <button onClick={handleSave} style={smBtn("#C1567A")}>{editing ? "Update" : "Create"}</button>
                    {editing && <button onClick={() => { resetForm(); setEditing(null); }} style={smBtn("#888")}>Cancel</button>}
                </div>
            </div>

            {assignStaffId && (
                <div style={{ background: "#fff", border: "2px solid #C1567A", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
                    <h3 style={{ marginBottom: "12px" }}>Assign Services to #{assignStaffId}</h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                        {services.filter(s => s.isActive !== false).map(s => (
                            <label key={s.id} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", cursor: "pointer" }}>
                                <input type="checkbox" checked={selectedServiceIds.includes(s.id)}
                                    onChange={() => setSelectedServiceIds(prev =>
                                        prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                                    )} />
                                {s.name}
                            </label>
                        ))}
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                        <button onClick={handleAssign} style={smBtn("#C1567A")}>Save Assignments</button>
                        <button onClick={() => setAssignStaffId(null)} style={smBtn("#888")}>Cancel</button>
                    </div>
                </div>
            )}

            {staff.map(s => (
                <div key={s.id} style={{ background: "#fff", border: "1px solid #eee", borderRadius: "10px", padding: "14px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                        <strong>{s.name}</strong>
                        {s.specialization && <span style={{ color: "#C1567A", fontSize: "12px", marginLeft: "8px" }}>{s.specialization}</span>}
                        <p style={{ fontSize: "12px", color: "#888", margin: "2px 0" }}>
                            {s.email} · {s.phone} · Days: {s.workingDays || "N/A"}
                        </p>
                        <p style={{ fontSize: "12px", color: "#555" }}>
                            Services: {(s.services || []).map(sv => sv.name).join(", ") || "None assigned"}
                        </p>
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <button onClick={() => openAssign(s)} style={smBtn("#5F3FA5")}>Assign Services</button>
                        <button onClick={() => handleEdit(s)} style={smBtn("#185FA5")}>Edit</button>
                        <button onClick={() => handleDelete(s.id)} style={smBtn("#A32D2D")}>Delete</button>
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ================================================================
   USERS TAB (List all customers)
   ================================================================ */
function UsersTab() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");

    const fetch = () => {
        setLoading(true);
        setError("");
        api.get("/auth/users")
            .then(r => setUsers(r.data.users || []))
            .catch(err => setError(err.response?.data?.message || err.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetch(); }, []);

    const filtered = users.filter(u =>
        !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <p>Loading users...</p>;

    return (
        <div>
            <button onClick={fetch} style={{ marginBottom: "12px", padding: "6px 14px", background: "#eee", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>↻ Refresh</button>

            <input placeholder="Search users by name or email..." style={{
                width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: "6px",
                fontSize: "13px", boxSizing: "border-box", marginBottom: "12px"
            }} value={search} onChange={e => setSearch(e.target.value)} />

            {error && (
                <div style={{ background: "#FCEBEB", color: "#791F1F", padding: "10px 14px", borderRadius: "8px", marginBottom: "12px", fontSize: "13px" }}>
                    {error}
                </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "12px" }}>
                {filtered.map(u => (
                    <div key={u.id} style={{ background: "#fff", border: "1px solid #eee", borderRadius: "10px", padding: "14px" }}>
                        <strong>{u.name}</strong>
                        {u.role === "admin" && <span style={{ background: "#FBEAF0", color: "#C1567A", fontSize: "10px", padding: "1px 6px", borderRadius: "999px", marginLeft: "6px" }}>Admin</span>}
                        <p style={{ fontSize: "12px", color: "#888", margin: "2px 0" }}>{u.email}</p>
                        <p style={{ fontSize: "12px", color: "#888" }}>Phone: {u.phone || "N/A"}</p>
                    </div>
                ))}
            </div>
            {filtered.length === 0 && !error && <p style={{ color: "#888" }}>No users found.</p>}
        </div>
    );
}

/* ================================================================
   SETTINGS TAB
   ================================================================ */
function SettingsTab() {
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");

    useEffect(() => {
        api.get("/settings").then(r => setSettings(r.data.settings || {})).finally(() => setLoading(false));
    }, []);

    const update = async (key, value) => {
        setSaving(true); setMsg("");
        try {
            await api.put("/settings", { key, value });
            setSettings(prev => ({ ...prev, [key]: value }));
            setMsg(`"${key}" updated successfully`);
        } catch (err) {
            setMsg("Failed: " + (err.response?.data?.message || err.message));
        } finally { setSaving(false); }
    };

    const fieldStyle = { width: "100%", padding: "9px 12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box", marginTop: "4px" };

    if (loading) return <p>Loading settings...</p>;

    return (
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: "12px", padding: "24px" }}>
            <h3 style={{ marginBottom: "16px" }}>Salon Settings</h3>
            {msg && (
                <div style={{ padding: "8px 14px", borderRadius: "8px", marginBottom: "14px", fontSize: "13px",
                    background: msg.includes("updated") ? "#E3F5E3" : "#FCEBEB",
                    color: msg.includes("updated") ? "#27500A" : "#791F1F" }}>
                    {msg}
                </div>
            )}
            {Object.entries(settings).map(([key, value]) => (
                <div key={key} style={{ marginBottom: "16px" }}>
                    <label style={{ fontWeight: "500", fontSize: "14px", textTransform: "capitalize" }}>
                        {key.replace(/([A-Z])/g, " $1").trim()}
                    </label>
                    {key === "cancellationPolicy" ? (
                        <textarea style={{ ...fieldStyle, height: "80px", resize: "vertical" }}
                            value={value} onChange={e => setSettings(prev => ({ ...prev, [key]: e.target.value }))} />
                    ) : (
                        <input type="text" style={fieldStyle} value={value}
                            onChange={e => setSettings(prev => ({ ...prev, [key]: e.target.value }))} />
                    )}
                    <button onClick={() => update(key, settings[key])} disabled={saving}
                        style={{ marginTop: "6px", padding: "6px 16px", background: "#C1567A", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>
                        Save
                    </button>
                </div>
            ))}
        </div>
    );
}

/* ================================================================
   INVOICES TAB
   ================================================================ */
function InvoicesTab() {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetch = () => {
        setLoading(true);
        api.get("/invoices").then(r => setInvoices(r.data.invoices || [])).finally(() => setLoading(false));
    };

    useEffect(() => { fetch(); }, []);

    if (loading) return <p>Loading invoices...</p>;

    return (
        <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px", marginBottom: "24px" }}>
                {[
                    ["Total Invoices", invoices.length],
                    ["Generated", invoices.filter(i => i.status === "generated").length],
                    ["Total Amount", `₹${invoices.reduce((s, i) => s + (i.amount || 0), 0).toLocaleString()}`]
                ].map(([label, val]) => (
                    <div key={label} style={statCardStyle}>
                        <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>{label}</div>
                        <div style={{ fontSize: "24px", fontWeight: "600", color: "#C1567A" }}>{val}</div>
                    </div>
                ))}
                <button onClick={fetch} style={{ ...statCardStyle, border: "1px dashed #ccc", cursor: "pointer", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
                    ↻ Refresh
                </button>
            </div>

            {invoices.length === 0 ? <p style={{ color: "#888" }}>No invoices generated yet.</p> : (
                invoices.map(inv => (
                    <div key={inv.id} style={{ background: "#fff", border: "1px solid #eee", borderRadius: "10px", padding: "16px", marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                        <div>
                            <strong>{inv.invoiceNumber}</strong>
                            <p style={{ fontSize: "13px", color: "#555", margin: "2px 0" }}>
                                {inv.appointment?.user?.name} · {inv.appointment?.service?.name} · {inv.appointment?.staff?.name}
                            </p>
                            <p style={{ fontSize: "13px", color: "#555" }}>{inv.appointment?.date} at {inv.appointment?.time}</p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "16px", fontWeight: "600", color: "#C1567A" }}>₹{inv.amount}</div>
                            <span style={{ background: inv.status === "paid" ? "#27500A22" : "#854F0B22", color: inv.status === "paid" ? "#27500A" : "#854F0B", padding: "2px 8px", borderRadius: "999px", fontSize: "11px" }}>
                                {inv.status}
                            </span>
                            <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>{new Date(inv.issuedAt).toLocaleDateString()}</div>
                        </div>
                    </div>
                ))
            )}
        </>
    );
}

/* ================================================================
   SHARED STYLES
   ================================================================ */
const statCardStyle = { background: "#fff", border: "1px solid #f0d6e0", borderRadius: "12px", padding: "16px", textAlign: "center" };
const filterBtn = (active) => ({ padding: "6px 14px", borderRadius: "999px", border: "1px solid #ddd", cursor: "pointer", fontSize: "12px", background: active ? "#C1567A" : "#fff", color: active ? "#fff" : "#333" });
const smBtn = (color) => ({ padding: "5px 12px", background: color, color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap" });
