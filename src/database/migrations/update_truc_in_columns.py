from sqlalchemy import text

def upgrade(connection):
    # Rename thanh_tien to thanh_tien_goc
    connection.execute(text("""
        ALTER TABLE truc_in_orders 
        RENAME COLUMN thanh_tien TO thanh_tien_goc;
    """))
    
    # Add thanh_tien_ban if it doesn't exist
    connection.execute(text("""
        ALTER TABLE truc_in_orders 
        ADD COLUMN IF NOT EXISTS thanh_tien_ban FLOAT DEFAULT 0;
    """))
    
    # Update thanh_tien_ban with existing values
    connection.execute(text("""
        UPDATE truc_in_orders 
        SET thanh_tien_ban = thanh_tien_goc 
        WHERE thanh_tien_ban = 0;
    """))
    
    connection.commit()

def downgrade(connection):
    # Revert changes
    connection.execute(text("""
        ALTER TABLE truc_in_orders 
        RENAME COLUMN thanh_tien_goc TO thanh_tien;
    """))
    
    connection.execute(text("""
        ALTER TABLE truc_in_orders 
        DROP COLUMN IF EXISTS thanh_tien_ban;
    """))
    
    connection.commit() 