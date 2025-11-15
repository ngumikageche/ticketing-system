#!/usr/bin/env python3
"""Create the first user for the support ticketing system.

Usage (from project root, with venv activated):

  source app/venv/bin/activate
  python scripts/create_first_user.py --email admin@ke.com --password admin123 --name "Admin KE" --role ADMIN

The script will create the user if it doesn't already exist and print the new user's id.
"""
import argparse
import sys
import os

# Ensure project root is on sys.path so `from app import create_app` works even
# when this script is executed as `python scripts/create_first_user.py` (the
# interpreter sets sys.path[0] to the script's directory, not the project root).
THIS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(THIS_DIR, '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app import create_app
from app.models.base import db
from app.models.user import User
from dotenv import load_dotenv

# Load .env from project root so environment variables (DATABASE_URL, etc.) are
# available when this script runs outside of the Flask CLI.
load_dotenv(os.path.join(PROJECT_ROOT, '.env'))


def parse_args():
    p = argparse.ArgumentParser(description="Create first user for the ticketing system")
    p.add_argument('--email', required=True, help='Email address for the user')
    p.add_argument('--password', required=True, help='Plain-text password (will be hashed)')
    p.add_argument('--name', default='', help='Full name')
    p.add_argument('--role', default='ADMIN', help='User role (default: ADMIN)')
    p.add_argument('--commit/--no-commit', dest='commit', default=True, help='Actually commit to DB')
    return p.parse_args()


def main():
    args = parse_args()

    app = create_app()

    with app.app_context():
        # Check existing user
        existing = User.with_deleted().filter_by(email=args.email).first()
        if existing:
            print(f"User with email {args.email} already exists (id={existing.id}).")
            sys.exit(0)

        user = User(email=args.email, name=args.name, role=args.role)
        user.set_password(args.password)
        db.session.add(user)
        if args.commit:
            db.session.commit()
        print('Created user:')
        print(f'  id: {user.id}')
        print(f'  email: {user.email}')


if __name__ == '__main__':
    main()
