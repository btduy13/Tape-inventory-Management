from sqlalchemy import create_engine
from src.utils.config import DATABASE_URL
from src.database.migrations.update_truc_in_columns import upgrade, downgrade

def run_migration():
    print("Starting truc_in_orders table migration...")
    # Create engine
    engine = create_engine(DATABASE_URL)
    
    # Create a connection
    with engine.connect() as connection:
        try:
            # Run migration to update columns
            print("Updating columns...")
            upgrade(connection)
            print("Migration completed successfully!")
            
        except Exception as e:
            print(f"Error during migration: {str(e)}")
            print("Rolling back changes...")
            downgrade(connection)
            raise

if __name__ == "__main__":
    run_migration() 