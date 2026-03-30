import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routers import topics, conversations, knowledge

app = FastAPI(
    title="CurioSync API",
    description="CurioSync MVP - AI Learning Partner API",
    version="1.0.0",
)

# CORS 配置
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(topics.router)
app.include_router(conversations.router)
app.include_router(knowledge.router)


@app.get("/")
async def root():
    return {"message": "CurioSync API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
