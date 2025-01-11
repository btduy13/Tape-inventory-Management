"""Update net profit for all orders

This migration updates the loi_nhuan_rong (net profit) field for all orders
by recalculating it based on the correct formula:
loi_nhuan_rong = loi_nhuan - tien_hoa_hong - tien_ship
"""

from datetime import datetime
from sqlalchemy import text
import logging

# revision identifiers, used by Alembic
revision = 'update_net_profit_' + datetime.now().strftime('%Y%m%d_%H%M%S')
down_revision = None
branch_labels = None
depends_on = None

def update_table(engine, table_name):
    """Update a single table with proper error handling"""
    try:
        with engine.begin() as connection:
            connection.execute(text(f"""
                UPDATE {table_name} 
                SET loi_nhuan_rong = loi_nhuan - tien_hoa_hong - tien_ship
                WHERE TRUE
            """))
            print(f"Successfully updated {table_name}")
    except Exception as e:
        print(f"Error updating {table_name}: {str(e)}")
        raise

def upgrade(engine):
    """Update net profit for all tables with proper error handling"""
    tables = ['bang_keo_in_orders', 'truc_in_orders', 'bang_keo_orders']
    
    for table in tables:
        try:
            print(f"\nUpdating {table}...")
            update_table(engine, table)
        except Exception as e:
            print(f"Failed to update {table}: {str(e)}")
            # Continue with other tables even if one fails
            continue

def downgrade(engine):
    pass  # Cannot restore previous values as they were incorrect 