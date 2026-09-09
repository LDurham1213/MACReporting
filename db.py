import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

load_dotenv()

SYSTEM_EMAIL = "seed@macreporting.local"
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///macreporting.db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def get_db_session():
    return SessionLocal()