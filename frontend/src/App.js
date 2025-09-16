import './App.css';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { RTOProvider } from "./Context/RTOContext";
import Header from './components/RTO/Header';
import RTOForm from './components/RTO/RTOForm';
import SubmittedRTOsPage from './components/RTO/SubmittedRTOsPage';

function App() {
  return (
    <RTOProvider>
      <Router>
        <Header />
        <Routes>
          <Route path="/" element={<RTOForm />} />
          <Route path="/submitted-rto" element={<SubmittedRTOsPage />} />
        </Routes>
      </Router>
    </RTOProvider>
  );
}

export default App;
