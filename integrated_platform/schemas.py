from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    displayName: str | None = None


class SocialLoginRequest(BaseModel):
    username: str | None = None
    email: str | None = None
    displayName: str | None = None
    provider: str = "google"


class UserProfile(BaseModel):
    id: str
    username: str
    email: str
    displayName: str
    role: str = "user"
    isAdmin: bool = False
    rank: str = "Apprentice"
    rating: int = 1200


class AuthEnvelope(BaseModel):
    user: UserProfile
    token: str
    users: list[UserProfile]


class CompetitionSummary(BaseModel):
    id: int
    slug: str
    title: str
    description: str
    mode: str
    difficulty: str
    maxScore: float
    isActive: bool


class CodeSubmissionRequest(BaseModel):
    competition_id: int = Field(..., ge=1)
    language: str = "python"
    source_code: str = Field(..., min_length=1)
    problem_id: int | None = Field(default=None, ge=1)


class MLSubmissionRequest(BaseModel):
    competition_id: int = Field(..., ge=1)
    notebook_payload: str | dict[str, Any]
    entrypoint: str | None = None
    problem_id: int | None = Field(default=None, ge=1)


class PacketSubmissionRequest(BaseModel):
    competition_id: int = Field(..., ge=1)
    packet_script: str = Field(..., min_length=1)
    topology: str | None = None
    problem_id: int | None = Field(default=None, ge=1)


class SubmissionAcceptedResponse(BaseModel):
    submissionId: str
    competitionId: int
    submissionType: str
    queue: str
    status: str
    maxAttempts: int


class SubmissionStatusResponse(BaseModel):
    submissionId: str
    competitionId: int
    competitionTitle: str
    userId: str
    submissionType: str
    queue: str
    status: str
    language: str | None = None
    score: float | None = None
    attemptCount: int = 0
    maxAttempts: int = 3
    lastError: str | None = None
    stdout: str = ""
    stderr: str = ""
    metrics: dict[str, Any] = Field(default_factory=dict)
    runtimeMs: int = 0
    memoryKb: int = 0
    worker: str | None = None
    createdAt: datetime
    startedAt: datetime | None = None
    completedAt: datetime | None = None


class LeaderboardEntry(BaseModel):
    rank: int
    userId: str
    username: str
    displayName: str
    score: float
    submissions: int
    accepted: int
    lastStatus: str | None = None


class LeaderboardResponse(BaseModel):
    competitionId: int
    competitionTitle: str
    mode: str
    entries: list[LeaderboardEntry]
    totalParticipants: int


class UpdateProfileRequest(BaseModel):
    displayName: str | None = None


class ProblemExample(BaseModel):
    input: str
    output: str
    explanation: str | None = None


class ProblemTestCase(BaseModel):
    input: str
    expectedOutput: str


class ProblemRecord(BaseModel):
    id: int
    title: str
    domain: str
    submissionType: str
    queueName: str
    workerPool: str
    judgeLabel: str
    difficulty: str
    acceptance: str
    tags: list[str] = Field(default_factory=list)
    companies: list[str] = Field(default_factory=list)
    description: str = ""
    examples: list[ProblemExample] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    starterCode: dict[str, str] = Field(default_factory=dict)
    testCases: list[ProblemTestCase] = Field(default_factory=list)
    status: str | None = None
    starred: bool = False
    lastSubmitted: datetime | None = None


class ProblemCatalogResponse(BaseModel):
    problems: list[ProblemRecord]
    topics: list[str] = Field(default_factory=list)


class ProblemDetailResponse(BaseModel):
    problem: ProblemRecord


class ProblemRunRequest(BaseModel):
    language: str = "python"
    code: str = Field(..., min_length=1)
    input: str | None = None


class ProblemBookmarkRequest(BaseModel):
    starred: bool = True
    username: str | None = None


class SubmissionHistoryEntry(BaseModel):
    id: str
    problemId: int
    problemTitle: str
    domain: str
    status: str
    language: str | None = None
    runtime: str = "N/A"
    memory: str = "N/A"
    stdout: str = ""
    expected: str = ""
    stderr: str = ""
    allPassed: bool = False
    passedCases: int = 0
    totalCases: int = 0
    cases: list[dict[str, Any]] = Field(default_factory=list)
    submittedAt: datetime


class SubmissionHistoryResponse(BaseModel):
    submissions: list[SubmissionHistoryEntry] = Field(default_factory=list)


class UserProfileDetail(BaseModel):
    id: str
    username: str
    email: str
    displayName: str
    role: str = "user"
    isAdmin: bool = False
    rank: str = "Apprentice"
    rating: int = 1200
    globalRanking: int = 0
    solvedProblems: int = 0
    totalProblems: int = 0
    easy: int = 0
    medium: int = 0
    hard: int = 0
    streak: int = 0
    contests: int = 0
    topPercent: str = "0.0"
    views: int = 0
    solutions: int = 0
    discussions: int = 0
    reputation: int = 0
    followers: int = 0
    following: int = 0
    avatar: str | None = None
    location: str = ""
    github: str = ""
    linkedin: str = ""
    x: str = ""
    websites: str = ""
    birthday: str = ""
    work: str = ""
    education: str = ""
    skills: str = ""
    readme: str = ""
    heatmap: bool = True
    recentAC: bool = True
    languages: list[dict[str, Any]] = Field(default_factory=list)


class UserProfileDetailResponse(BaseModel):
    user: UserProfileDetail


class HealthResponse(BaseModel):
    status: str
    service: str
    checks: dict[str, str] = Field(default_factory=dict)
    details: dict[str, Any] = Field(default_factory=dict)
