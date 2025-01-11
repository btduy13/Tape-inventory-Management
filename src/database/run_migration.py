from sqlalchemy import create_engine, text
from src.utils.config import DATABASE_URL
from src.database.migrations.add_shipping_columns import upgrade, downgrade

def run_migration():
    print("Starting migration...")
    # Create engine
    engine = create_engine(DATABASE_URL)
    
    # Create a connection
    with engine.connect() as connection:
        try:
            # Run migration to add columns
            print("Adding new columns...")
            upgrade(connection)
            
            print("Updating existing records...")
            # Update existing records to calculate net profit
            update_queries = [
                """
                UPDATE bang_keo_in_orders 
                SET loi_nhuan_rong = loi_nhuan - COALESCE(tien_ship, 0)
                WHERE loi_nhuan_rong IS NULL OR loi_nhuan_rong = 0
                """,
                """
                UPDATE truc_in_orders 
                SET loi_nhuan_rong = loi_nhuan - COALESCE(tien_ship, 0)
                WHERE loi_nhuan_rong IS NULL OR loi_nhuan_rong = 0
                """,
                """
                UPDATE bang_keo_orders 
                SET loi_nhuan_rong = loi_nhuan - COALESCE(tien_ship, 0)
                WHERE loi_nhuan_rong IS NULL OR loi_nhuan_rong = 0
                """
            ]
            
            # Execute each update query
            for query in update_queries:
                connection.execute(text(query))
                connection.commit()
            
            print("Migration completed successfully!")
            
        except Exception as e:
            print(f"Error during migration: {str(e)}")
            print("Rolling back changes...")
            downgrade(connection)
            raise

if __name__ == "__main__":
    run_migration() 