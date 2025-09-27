import { useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import './App.css';
import { RTOProvider, RTOContext } from "./Context/RTOContext";
import Header from './components/RTO/Header';
import RTOForm from './components/RTO/RTOForm';
import SubmittedRTOsPage from './components/RTO/SubmittedRTOsPage';
import SignIn from './components/Authorization/SignIn';
import ProtectedRoute from "./components/ProtectedRoute";

function HomeRoute() {
  const { isAuthenticated } = useContext(RTOContext);
  return isAuthenticated ? <Navigate to="/rto-form" replace /> : <SignIn />;
}

function App() {
  return (
    <RTOProvider>
      <Router>
        <Header />
        <Routes>
          <Route path="/" element={<HomeRoute />} /> {/* Redirect to /rto-form if authenticated */}
          <Route element={<ProtectedRoute />}>
            <Route path="/rto-form" element={<RTOForm />} />
            <Route path="/submitted-rto" element={<SubmittedRTOsPage />} />
          </Route>
        </Routes>
      </Router>
    </RTOProvider>
  );
}

export default App;