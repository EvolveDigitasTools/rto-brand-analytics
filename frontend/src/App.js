import { useContext } from "react";
import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { RTOProvider } from "./Context/RTOContext";
import Header from './components/RTO/Header';
import RTOForm from './components/RTO/RTOForm';
import SubmittedRTOsPage from './components/RTO/SubmittedRTOsPage';
import SignIn from './components/Authorization/SignIn';
import ProtectedRoute from "./components/ProtectedRoute"
import { RTOContext } from "./Context/RTOContext";

function App() {
   const { isAuthenticated } = useContext(RTOContext);

  return (
    <RTOProvider>
      <Router>
        <Header />
        <Routes>
          <Route 
            path="/" 
            element={isAuthenticated ? <Navigate to="/rto-form" replace /> : <SignIn />} 
          />
          <Route element={<ProtectedRoute />}>
            <Route path="/rto-form" element={<RTOForm />} /> {/* Protected route */}
            <Route path="/submitted-rto" element={<SubmittedRTOsPage />} /> {/* Protected route */}
          </Route>
        </Routes>
      </Router>
    </RTOProvider>
  );
}

export default App;
