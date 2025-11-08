import { useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import './App.css';
import { RTOProvider, RTOContext } from "./Context/RTOContext";
import RTOForm from './components/RTO/RTOForm';
import SubmittedRTOsPage from './components/RTO/SubmittedRTOsPage';
import Overview from "./components/RTO/Overview";
import SignIn from './components/Authorization/SignIn';
import ProtectedRoute from "./components/ProtectedRoute";
import DeletedRTOsPage from "./components/RTO/DeletedRTOsPage";
import DashboardLayout from "./components/Dashboard/DashboardLayout";
import AllUsers from "./components/AllUsers/AllUsers";
import MarketplacesRTOData from "./components/RTO/UploadRTOData/MarketplacesRTOData";
import Amazon from "./components/RTO/UploadRTOData/Amazon";
import Flipkart from "./components/RTO/UploadRTOData/Flipkart";
import Meesho from "./components/RTO/UploadRTOData/Meesho";

function HomeRoute() {
  const { isAuthenticated } = useContext(RTOContext);
  return isAuthenticated ? <Navigate to="/rto-form" replace /> : <SignIn />;
}

function App() {
  return (
    <RTOProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomeRoute />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/rto-form" element={<RTOForm />} />
              <Route path="/submitted-rto" element={<SubmittedRTOsPage />} />
              <Route path="/deleted-rto" element={<DeletedRTOsPage />} />
              <Route path="/overview" element={<Overview />} />
              <Route path="/all-users" element={<AllUsers />} />
              <Route path="/all-marketplaces" element={<MarketplacesRTOData />} />
              <Route path="/amazon" element={<Amazon />} />
              <Route path="/flipkart" element={<Flipkart />} />
              <Route path="/meesho" element={<Meesho />} />                                          
            </Route>
          </Route>
        </Routes>
      </Router>
    </RTOProvider>
  );
}

export default App;