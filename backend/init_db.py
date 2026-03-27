#!/usr/bin/env python3
"""Initialize database with tables."""
import sys
sys.path.insert(0, '.')
from app import app, db

with app.app_context():
    print("Creating database tables...")
    db.create_all()
    print("✓ Database initialized successfully!")
    print("Tables created:")
    from app import User, Transaction
    print("  - user table")
    print("  - transaction table")
