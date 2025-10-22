import React, { useEffect, useState, useContext } from "react";
import { RTOContext } from "../../Context/RTOContext";
import axios from "axios";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

const Overview = () => {
    const API_URL = process.env.REACT_APP_API_URL;
    const [chartData, setChartData] = useState({
        labels: [],
        datasets: [],
    });
    const [totalUsers, setTotalUsers] = useState(0);
    const [totalRTOs, setTotalRTOs] = useState(0);
    const { user } = useContext(RTOContext);

    useEffect(() => {
        const fetchOverview = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await axios.get(`${API_URL}/api/rto/overview`, {
                    headers: { Authorization: `Bearer ${token}`}
                });
                if (response.data.success) {
                    setChartData({
                        labels: response.data.labels,
                        datasets: [
                            {
                                label: 'RTOs',
                                data: response.data.counts,
                                backgroundColor: [
                                    '#36A2EB',
                                    '#FF6384',
                                    '#FFCE56',
                                    '#4BC0C0',
                                    '#9966FF',
                                    '#FF9F40'
                                ],
                                hoverOffset: 10,
                            },
                        ],
                    });
                    setTotalUsers(response.data.totalUsers)
                    setTotalRTOs(response.data.totalRTOs)
                }
            } catch (err) {
                console.error("Error fetching overview", err);
            }
        }; 
        if (user?.role === 'superadmin') fetchOverview();
    }, [user]);

    return (
        <div className="overview-container">
            <div className="overview-headings">
                <h2>Total Users: {totalUsers}</h2>
                <h2>Total RTOs: {totalRTOs}</h2> 
            </div>
            <div className="overview-chart">           
                {chartData.labels.length > 0 ? (
                    <div style={{ width: '400px', margin: "auto"}}>
                        <Doughnut data={chartData} />
                    </div>
                ) : (
                    <p>Loading chart data...</p>
                )}
            </div>
        </div>
    );
};

export default Overview;