import { useState, useEffect } from 'react';
import StatsCard from '../components/StatsCard';
import LineChart from '../components/LineChart';
import DonutChart from '../components/DonutChart';
import TicketTable from '../components/TicketTable';
import { getDashboard} from '../api/dashboard.js';
import { getTickets as getTicketsFromAPI } from '../api/tickets.js';

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboard, ticketsData] = await Promise.all([
          getDashboard(),
          getTicketsFromAPI()
        ]);
        setDashboardData(dashboard);
        setTickets(ticketsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  // Assuming dashboardData has openTickets, responseTime, resolutionTime, slaCompliance
  // If not, keep mock
  const stats = dashboardData ? [
    { title: "Open Tickets", value: dashboardData.openTickets || "265" },
    { title: "First Response Time", value: dashboardData.responseTime || "30m" },
    { title: "Avg Resolution Time", value: dashboardData.resolutionTime || "2h" },
    { title: "SLA Compliance", value: dashboardData.slaCompliance || "92%", highlight: true }
  ] : [
    { title: "Open Tickets", value: "265" },
    { title: "First Response Time", value: "30m" },
    { title: "Avg Resolution Time", value: "2h" },
    { title: "SLA Compliance", value: "92%", highlight: true }
  ];

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <StatsCard key={i} title={stat.title} value={stat.value} highlight={stat.highlight} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LineChart />
        <DonutChart />
      </div>

      {/* Ticket table */}
      <TicketTable tickets={tickets} />
    </div>
  );
}
