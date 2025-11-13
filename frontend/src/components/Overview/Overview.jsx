import React, { useEffect, useState, useContext, useRef } from "react";
import { RTOContext } from "../../Context/RTOContext";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { Chart, Doughnut } from "react-chartjs-2";
import "./overview.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
  zoomPlugin
);

const Overview = () => {
  const API_URL = process.env.REACT_APP_API_URL;
  const [data, setData] = useState(null);
  const [doughnutData, setDoughnutData] = useState({ labels: [], datasets: [] });
  const { user } = useContext(RTOContext);
  const chartRef = useRef(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalRTOs, setTotalRTOs] = useState(0);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_URL}/api/rto/overview`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data.success) {
          setData(response.data);

          if (response.data.doughnut) {
            setDoughnutData({
              labels: response.data.doughnut.labels,
              datasets: [
                {
                  label: "RTOs by Created By",
                  data: response.data.doughnut.counts,
                  backgroundColor: [
                    "#36A2EB",
                    "#FF6384",
                    "#FFCE56",
                    "#4BC0C0",
                    "#9966FF",
                    "#FF9F40",
                    "#6C5CE7",
                    "#00B894",
                    "#E17055",
                    "#0984E3",
                  ],
                  hoverOffset: 10,
                },
              ],
            });
          }

          setTotalUsers(response.data.doughnut?.labels?.length || 0);
          setTotalRTOs(
            response.data.doughnut?.counts?.reduce((a, b) => a + b, 0) || 0
          );
        }
      } catch (err) {
        console.error("Error fetching overview:", err);
      }
    };

    if (user?.role === "superadmin") fetchOverview();
  }, [user]);

  if (!data) return <h4 className="over-loading">Loading...</h4>;

  const { cards, bar, meeshoRTOs, amazonRTOs, flipkartRTOs } = data;
  const totalCost = Number(cards?.totalCost) || 0;

  const cardList = [
    { title: "Total RTOs", value: cards?.totalRTOs ?? 0 },
    { title: "RTOs This Month", value: cards?.thisMonthRTO ?? 0 },
    { title: "Good RTOs", value: cards?.goodRTOs ?? 0 },
    { title: "Wrong Return RTOs", value: cards?.wrongReturnRTOs ?? 0 },
    { title: "Damaged RTOs", value: cards?.damagedRTOs ?? 0 },
    { title: "Total Claim Raised", value: cards?.totalClaims ?? 0 },
    { title: "Total RTO Cost", value: `₹${totalCost.toFixed(2)}` },
  ];

  const hasData = bar.labels && bar.labels.length > 0;

  // === Bar + Line Chart ===
  const chartData = {
    labels: bar.labels,
    datasets: [
      {
        type: "bar",
        label: "Total RTOs",
        data: bar.counts,
        backgroundColor: "rgba(30, 144, 255, 0.3)",
        borderColor: "#1E90FF",
        borderWidth: 1,
        borderRadius: 8,
      },
      {
        type: "line",
        label: "Total RTOs (Line)",
        data: bar.counts,
        borderColor: "#1E90FF",
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.4,
        fill: false,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "nearest", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#fff",
        titleColor: "#000",
        bodyColor: "#000",
        borderColor: "#ccc",
        borderWidth: 1,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}`,
        },
      },
      zoom: {
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: "x",
        },
        pan: { enabled: true, mode: "x" },
        limits: {
          x: { min: 0, max: bar.labels.length - 1 },
          y: { min: 0 },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#555" },
      },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(0,0,0,0.05)" },
        ticks: { color: "#555" },
      },
    },
  };

  return (
    <div className="rto-overview">
      {/* === Cards Section === */}
      <div className="overview-cards">
        {cardList.map((card, i) => (
          <div key={i} className="overview-card">
            <h4>{card.title}</h4>
            <h2>{card.value}</h2>
          </div>
        ))}
      </div>

      {/* === Chart Section === */}
      <div className="overview-main">
        <div className="chart-section">
          <div className="chart-header">
            <h3>Total RTOs by Pickup Partners</h3>
            <h2 className="total-rto-text">
              <strong>{bar.counts?.reduce((a, b) => a + b, 0) || 0}</strong>
            </h2>
          </div>

          {hasData ? (
            <div style={{ height: "380px" }}>
              <Chart ref={chartRef} type="bar" data={chartData} options={chartOptions} />
            </div>
          ) : (
            <div className="no-data">No RTO data available</div>
          )}
        </div>

        {/* === Doughnut Section === */}
        <div className="doughnut-section">
          <h3>RTOs by Created By</h3>
          <h4>Total Users: {totalUsers}</h4>
          <h4>Total RTOs: {totalRTOs}</h4>
          <div className="overview-chart">
            {doughnutData && doughnutData.labels.length > 0 ? (
              <div style={{ width: "400px", margin: "auto" }}>
                <Doughnut data={doughnutData} />
              </div>
            ) : (
              <p>Loading chart data...</p>
            )}
          </div>
        </div>
      </div>

      {/* === Meesho Table Section === */}
      <div className="top-rto-section">
        <h3>Highest Return Products - Meesho</h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>S.N.</th>
                <th>Marketplaces</th>
                <th>SKU</th>
                <th>Product Title</th>
                <th>Total Return Qty</th>
              </tr>
            </thead>
            <tbody>
              {meeshoRTOs.map((item, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{item.marketplaces}</td>
                  <td>{item.sku_code}</td>
                  <td>{item.product_title}</td>
                  <td>{item.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* === Amazon Table Section === */}
      <div className="top-rto-section">
        <h3>Highest Return Products - Amazon</h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>S.N.</th>
                <th>Marketplaces</th>
                <th>SKU</th>
                <th>Product Title</th>
                <th>Total Return Qty</th>
              </tr>
            </thead>
            <tbody>
              {amazonRTOs.map((item, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{item.marketplaces}</td>
                  <td>{item.sku_code}</td>
                  <td>{item.product_title}</td>
                  <td>{item.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


      {/* === Flipkart Table Section === */}
      <div className="top-rto-section">
        <h3>Highest Return Products - Flipkart</h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>S.N.</th>
                <th>Marketplaces</th>
                <th>SKU</th>
                <th>Product Title</th>
                <th>Total Return Qty</th>
              </tr>
            </thead>
            <tbody>
              {flipkartRTOs.map((item, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{item.marketplaces}</td>
                  <td>{item.sku_code}</td>
                  <td>{item.product_title}</td>
                  <td>{item.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>




    </div>
  );
};

export default Overview;
