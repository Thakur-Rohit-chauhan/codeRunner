from fastapi import FastAPI
from contextlib import asynccontextmanager
import logging
from .database import create_tables
from routes import submission

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app : FastAPI):
    logger.info("Starting up: Creating database tables...")
    try:
        create_tables()
        logger.info("Database tables created successfully.")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
    yield
    logger.info("Shutting down...")

app = FastAPI(lifespan=lifespan)

app.include_router(submission.router, prefix="/api")

@app.get("/")
def health():
    return {"status" : "submission service is running..."}