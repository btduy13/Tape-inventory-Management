from sqlalchemy import Column, Float, MetaData, Table, text

def upgrade(connection):
    metadata = MetaData()
    
    # Add columns to bang_keo_in_orders
    connection.execute(text("""
        ALTER TABLE bang_keo_in_orders 
        ADD COLUMN IF NOT EXISTS tien_ship FLOAT DEFAULT 0;
    """))
    connection.execute(text("""
        ALTER TABLE bang_keo_in_orders 
        ADD COLUMN IF NOT EXISTS loi_nhuan_rong FLOAT DEFAULT 0;
    """))
    
    # Add columns to truc_in_orders
    connection.execute(text("""
        ALTER TABLE truc_in_orders 
        ADD COLUMN IF NOT EXISTS tien_ship FLOAT DEFAULT 0;
    """))
    connection.execute(text("""
        ALTER TABLE truc_in_orders 
        ADD COLUMN IF NOT EXISTS loi_nhuan_rong FLOAT DEFAULT 0;
    """))
    
    # Add columns to bang_keo_orders
    connection.execute(text("""
        ALTER TABLE bang_keo_orders 
        ADD COLUMN IF NOT EXISTS tien_ship FLOAT DEFAULT 0;
    """))
    connection.execute(text("""
        ALTER TABLE bang_keo_orders 
        ADD COLUMN IF NOT EXISTS loi_nhuan_rong FLOAT DEFAULT 0;
    """))
    
    connection.commit()

def downgrade(connection):
    # Remove columns from bang_keo_in_orders
    connection.execute(text("""
        ALTER TABLE bang_keo_in_orders 
        DROP COLUMN IF EXISTS tien_ship;
    """))
    connection.execute(text("""
        ALTER TABLE bang_keo_in_orders 
        DROP COLUMN IF EXISTS loi_nhuan_rong;
    """))
    
    # Remove columns from truc_in_orders
    connection.execute(text("""
        ALTER TABLE truc_in_orders 
        DROP COLUMN IF EXISTS tien_ship;
    """))
    connection.execute(text("""
        ALTER TABLE truc_in_orders 
        DROP COLUMN IF EXISTS loi_nhuan_rong;
    """))
    
    # Remove columns from bang_keo_orders
    connection.execute(text("""
        ALTER TABLE bang_keo_orders 
        DROP COLUMN IF EXISTS tien_ship;
    """))
    connection.execute(text("""
        ALTER TABLE bang_keo_orders 
        DROP COLUMN IF EXISTS loi_nhuan_rong;
    """))
    
    connection.commit() 