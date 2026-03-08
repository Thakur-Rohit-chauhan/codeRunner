from sqlmodel import SQLModel, Session, create_engine
from fastapi import Depends
from typing import Generator
from .config import settings

engine = create_engine(
    settings.DATABASE_URL,
    echo=True,
    pool_pre_ping=True
)

def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session

def create_tables():
    SQLModel.metadata.create_all(engine)