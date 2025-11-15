import StatsCard from '../components/StatsCard';
import LineChart from '../components/LineChart';
import DonutChart from '../components/DonutChart';
import TicketTable from '../components/TicketTable';

export default function Dashboard() {
  return (
    <div className="space-y-6">

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard title="Open Tickets" value="265" />
        <StatsCard title="First Response Time" value="30m" />
        <StatsCard title="Avg Resolution Time" value="2h" />
        <StatsCard title="SLA Compliance" value="92%" highlight />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LineChart />
        <DonutChart />
      </div>

      {/* Ticket table */}
      <TicketTable />
    </div>
  );
}
