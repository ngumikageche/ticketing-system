import { useState, useEffect, useMemo } from 'react';
import StatsCard from '../components/StatsCard';
import LineChart from '../components/LineChart';
import DonutChart from '../components/DonutChart';
import TicketTable from '../components/TicketTable';
import { getDashboard, getTicketsByStatus, getAgentPerformance, getTicketTrends } from '../api/dashboard.js';
import { getTickets as getTicketsFromAPI } from '../api/tickets.js';
import { getComments } from '../api/comments.js';
import { useSettings } from '../contexts/SettingsContext.jsx';

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [statusBreakdown, setStatusBreakdown] = useState([]);
  const [agentPerformance, setAgentPerformance] = useState([]);
  const [ticketTrends, setTicketTrends] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState('overview');

  const { settings } = useSettings();

  useEffect(() => {
    setCurrentView(settings.default_dashboard_view || 'overview');
  }, [settings.default_dashboard_view]);

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
      {/* View Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setCurrentView('overview')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${currentView === 'overview' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
        >
          Overview
        </button>
        <button
          onClick={() => setCurrentView('tickets')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${currentView === 'tickets' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
        >
          Tickets
        </button>
        <button
          onClick={() => setCurrentView('analytics')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${currentView === 'analytics' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
        >
          Analytics
        </button>
      </div>

      {currentView === 'overview' && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <StatsCard key={i} title={stat.title} value={stat.value} highlight={stat.highlight} />
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <LineChart data={ticketTrends} animate={settings.show_chart_animations} />
            <DonutChart data={statusBreakdown} animate={settings.show_chart_animations} />
          </div>

          {/* Recent tickets */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Recent Tickets</h3>
            <TicketTable tickets={tickets.slice(0, 5)} commentCount={commentCount} />
          </div>
        </>
      )}

      {currentView === 'tickets' && (
        <TicketTable tickets={tickets} commentCount={commentCount} />
      )}

      {currentView === 'analytics' && (
        <div className="space-y-6">
          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <LineChart data={ticketTrends} animate={settings.show_chart_animations} />
            <DonutChart data={statusBreakdown} animate={settings.show_chart_animations} />
          </div>

          {/* Agent Performance */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Agent Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Agent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tickets Resolved</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Avg Response Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {agentPerformance.map((agent, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{agent.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{agent.resolved}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{agent.avgResponse}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
