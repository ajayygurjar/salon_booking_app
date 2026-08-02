import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Book from "./pages/Book";
import MyAppointments from "./pages/MyAppointments";
import MyInvoices from "./pages/MyInvoices";
import PaymentSuccess from "./pages/PaymentSuccess";
import Reviews from "./pages/Reviews";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/book" element={<ProtectedRoute userOnly><Book /></ProtectedRoute>} />
        <Route path="/appointments" element={<ProtectedRoute userOnly><MyAppointments /></ProtectedRoute>} />
        <Route path="/invoices" element={<ProtectedRoute userOnly><MyInvoices /></ProtectedRoute>} />
        <Route path="/payment-success" element={<ProtectedRoute userOnly><PaymentSuccess /></ProtectedRoute>} />
        <Route path="/reviews" element={<ProtectedRoute><Reviews /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;