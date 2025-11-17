import { useState, useEffect, useMemo } from 'react';
import StatsCard from '../components/StatsCard';
import LineChart from '../components/LineChart';
import DonutChart from '../components/DonutChart';
import TicketTable from '../components/TicketTable';
import { getDashboard, getTicketsByStatus, getAgentPerformance, getTicketTrends } from '../api/dashboard.js';
import { getTickets as getTicketsFromAPI } from '../api/tickets.js';
import { getComments } from '../api/comments.js';

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [statusBreakdown, setStatusBreakdown] = useState([]);
  const [agentPerformance, setAgentPerformance] = useState([]);
  const [ticketTrends, setTicketTrends] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboard, statusData, agentData, trendsData, ticketsData, commentsData] = await Promise.all([
          getDashboard(),
          getTicketsByStatus(),
          getAgentPerformance(),
          getTicketTrends(),
          getTicketsFromAPI(),
          getComments()
        ]);
        setDashboardData(dashboard);
        setStatusBreakdown(statusData);
        setAgentPerformance(agentData);
        setTicketTrends(trendsData);
        setTickets(ticketsData);
        setComments(commentsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const commentCount = useMemo(() => {
    const map = {};
    comments.forEach(comment => {
      map[comment.ticket_id] = (map[comment.ticket_id] || 0) + 1;
    });
    return map;
  }, [comments]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  // Stats from dashboard overview
  const stats = dashboardData ? [
    { title: "Total Tickets", value: dashboardData.totalTickets || "0" },
    { title: "Resolved Tickets", value: dashboardData.resolvedTickets || "0" },
    { title: "Avg Response Time", value: dashboardData.avgResponse || "N/A" },
    { title: "SLA Compliance", value: "92%", highlight: true } // Mock for now
  ] : [
    { title: "Total Tickets", value: "0" },
    { title: "Resolved Tickets", value: "0" },
    { title: "Avg Response Time", value: "N/A" },
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
        <LineChart data={ticketTrends} />
        <DonutChart data={statusBreakdown} />
      </div>

      {/* Ticket table */}
      <TicketTable tickets={tickets} commentCount={commentCount} />
    </div>
  );
}
