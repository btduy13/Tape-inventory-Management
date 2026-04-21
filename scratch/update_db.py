import logging
from sqlalchemy import create_engine, text
from src.utils.config import DATABASE_URL

def migrate():
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    
    logger.info(f"Connecting to database: {DATABASE_URL}")
    engine = create_engine(DATABASE_URL)
    
    tables = ["bang_keo_in_orders", "truc_in_orders", "bang_keo_orders"]
    
    with engine.connect() as conn:
        for table in tables:
            try:
                # Check columns using INFORMATION_SCHEMA for PostgreSQL
                query = text(f"""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = '{table}' AND column_name = 'da_gui_email'
                """)
                result = conn.execute(query).fetchone()
                
                if not result:
                    logger.info(f"Adding da_gui_email column to {table}...")
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN da_gui_email BOOLEAN DEFAULT FALSE"))
                    conn.commit()
                    logger.info(f"Successfully added column to {table}")
                else:
                    logger.info(f"Column da_gui_email already exists in {table}")
            except Exception as e:
                logger.error(f"Error during migration for table {table}: {e}")
                conn.rollback()

    logger.info("Migration finished.")

if __name__ == "__main__":
    migrate()
