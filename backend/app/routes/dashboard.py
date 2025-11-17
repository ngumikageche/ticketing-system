from flask import Blueprint, request, jsonify, abort
from app.models.ticket import Ticket
from app.models.comment import Comment
from app.models.user import User
from app.models.base import db
from sqlalchemy import func, extract, case
from datetime import datetime, timedelta

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/', methods=['GET'])
def get_dashboard():
    # Total tickets
    total_tickets = Ticket.active().count()
    
    # Resolved tickets (assuming 'CLOSED' or 'RESOLVED' status)
    resolved_tickets = Ticket.active().filter(Ticket.status.in_(['CLOSED', 'RESOLVED'])).count()
    
    # Average response time (time from ticket creation to first comment)
    # This is complex - for simplicity, we'll calculate average time to first response
    avg_response_query = db.session.query(
        func.avg(
            func.extract('epoch', Comment.created_at - Ticket.created_at)
        )
    ).join(Ticket, Comment.ticket_id == Ticket.id)\
     .filter(Ticket.is_deleted == False)\
     .filter(Comment.is_deleted == False)\
     .group_by(Ticket.id)\
     .subquery()
    
    avg_response_seconds = db.session.query(func.avg(avg_response_query.c.avg)).scalar()
    
    # Convert to minutes/hours format
    if avg_response_seconds:
        if avg_response_seconds < 3600:  # Less than 1 hour
            avg_response = f"{int(avg_response_seconds // 60)}m"
        else:
            hours = int(avg_response_seconds // 3600)
            minutes = int((avg_response_seconds % 3600) // 60)
            avg_response = f"{hours}h {minutes}m"
    else:
        avg_response = "N/A"
    
    # Tickets by status
    status_counts = db.session.query(
        Ticket.status,
        func.count(Ticket.id).label('count')
    ).filter(Ticket.is_deleted == False)\
     .group_by(Ticket.status)\
     .all()
    
    status_data = {status: count for status, count in status_counts}
    
    # Tickets by priority
    priority_counts = db.session.query(
        Ticket.priority,
        func.count(Ticket.id).label('count')
    ).filter(Ticket.is_deleted == False)\
     .group_by(Ticket.priority)\
     .all()
    
    priority_data = {priority: count for priority, count in priority_counts}
    
    # Monthly ticket data for the last 6 months
    six_months_ago = datetime.utcnow() - timedelta(days=180)
    monthly_data = db.session.query(
        extract('year', Ticket.created_at).label('year'),
        extract('month', Ticket.created_at).label('month'),
        func.count(Ticket.id).label('count')
    ).filter(Ticket.created_at >= six_months_ago)\
     .filter(Ticket.is_deleted == False)\
     .group_by(extract('year', Ticket.created_at), extract('month', Ticket.created_at))\
     .order_by(extract('year', Ticket.created_at), extract('month', Ticket.created_at))\
     .all()
    
    # Format monthly data
    month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    monthly_chart_data = []
    for year, month, count in monthly_data:
        month_name = month_names[int(month) - 1]
        monthly_chart_data.append({
            'month': f"{month_name} {int(year)}",
            'tickets': count
        })
    
    # If no data, provide some sample data for the chart
    if not monthly_chart_data:
        monthly_chart_data = [
            {'month': 'Jan 2025', 'tickets': 120},
            {'month': 'Feb 2025', 'tickets': 180},
            {'month': 'Mar 2025', 'tickets': 150},
            {'month': 'Apr 2025', 'tickets': 200},
            {'month': 'May 2025', 'tickets': 165},
        ]
    
    # Recent activity (last 10 tickets updated)
    recent_tickets = Ticket.active().order_by(Ticket.updated_at.desc()).limit(10).all()
    recent_activity = []
    for ticket in recent_tickets:
        recent_activity.append({
            'id': str(ticket.id),
            'ticket_id': ticket.ticket_id,
            'subject': ticket.subject,
            'status': ticket.status,
            'updated_at': ticket.updated_at.isoformat() if ticket.updated_at else None
        })
    
    return jsonify({
        'totalTickets': total_tickets,
        'resolvedTickets': resolved_tickets,
        'avgResponse': avg_response,
        'statusBreakdown': status_data,
        'priorityBreakdown': priority_data,
        'monthlyData': monthly_chart_data,
        'recentActivity': recent_activity
    })


@dashboard_bp.route('/reports/tickets-by-status', methods=['GET'])
def tickets_by_status():
    """Detailed breakdown of tickets by status"""
    status_data = db.session.query(
        Ticket.status,
        func.count(Ticket.id).label('count'),
        func.avg(case((Ticket.status.in_(['CLOSED', 'RESOLVED']), 1), else_=0)).label('resolution_rate')
    ).filter(Ticket.is_deleted == False)\
     .group_by(Ticket.status)\
     .all()
    
    result = []
    for status, count, resolution_rate in status_data:
        result.append({
            'status': status,
            'count': count,
            'resolutionRate': float(resolution_rate) if resolution_rate else 0
        })
    
    return jsonify(result)


@dashboard_bp.route('/reports/agent-performance', methods=['GET'])
def agent_performance():
    """Performance metrics for agents (assignees)"""
    agent_data = db.session.query(
        User.id,
        User.name,
        User.email,
        func.count(Ticket.id).label('assigned_tickets'),
        func.count(case((Ticket.status.in_(['CLOSED', 'RESOLVED']), Ticket.id))).label('resolved_tickets')
    ).join(Ticket, User.id == Ticket.assignee_id)\
     .filter(User.is_deleted == False)\
     .filter(Ticket.is_deleted == False)\
     .group_by(User.id, User.name, User.email)\
     .all()
    
    result = []
    for user_id, name, email, assigned, resolved in agent_data:
        result.append({
            'id': str(user_id),
            'name': name or email,
            'assignedTickets': assigned,
            'resolvedTickets': resolved,
            'resolutionRate': (resolved / assigned * 100) if assigned > 0 else 0
        })
    
    return jsonify(result)


@dashboard_bp.route('/reports/ticket-trends', methods=['GET'])
def ticket_trends():
    """Ticket creation and resolution trends over time"""
    # Get data for last 30 days
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    # Daily ticket creation
    creation_data = db.session.query(
        func.date(Ticket.created_at).label('date'),
        func.count(Ticket.id).label('created')
    ).filter(Ticket.created_at >= thirty_days_ago)\
     .filter(Ticket.is_deleted == False)\
     .group_by(func.date(Ticket.created_at))\
     .all()
    
    # Daily ticket resolution (status changed to closed/resolved)
    resolution_data = db.session.query(
        func.date(Ticket.status_changed_at).label('date'),
        func.count(Ticket.id).label('resolved')
    ).filter(Ticket.status_changed_at >= thirty_days_ago)\
     .filter(Ticket.status.in_(['CLOSED', 'RESOLVED']))\
     .filter(Ticket.is_deleted == False)\
     .group_by(func.date(Ticket.status_changed_at))\
     .all()
    
    # Combine data
    date_dict = {}
    for date, created in creation_data:
        date_str = date.isoformat()
        date_dict[date_str] = {'date': date_str, 'created': created, 'resolved': 0}
    
    for date, resolved in resolution_data:
        date_str = date.isoformat()
        if date_str in date_dict:
            date_dict[date_str]['resolved'] = resolved
        else:
            date_dict[date_str] = {'date': date_str, 'created': 0, 'resolved': resolved}
    
    result = list(date_dict.values())
    result.sort(key=lambda x: x['date'])
    
    return jsonify(result)
