from google.protobuf import struct_pb2 as _struct_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from typing import ClassVar as _ClassVar, Iterable as _Iterable, Mapping as _Mapping, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class GetProblemRequest(_message.Message):
    __slots__ = ("problem_id",)
    PROBLEM_ID_FIELD_NUMBER: _ClassVar[int]
    problem_id: int
    def __init__(self, problem_id: _Optional[int] = ...) -> None: ...

class GetTestCasesRequest(_message.Message):
    __slots__ = ("problem_id",)
    PROBLEM_ID_FIELD_NUMBER: _ClassVar[int]
    problem_id: int
    def __init__(self, problem_id: _Optional[int] = ...) -> None: ...

class ListProblemsRequest(_message.Message):
    __slots__ = ("skip", "limit", "problem_type")
    SKIP_FIELD_NUMBER: _ClassVar[int]
    LIMIT_FIELD_NUMBER: _ClassVar[int]
    PROBLEM_TYPE_FIELD_NUMBER: _ClassVar[int]
    skip: int
    limit: int
    problem_type: str
    def __init__(self, skip: _Optional[int] = ..., limit: _Optional[int] = ..., problem_type: _Optional[str] = ...) -> None: ...

class HealthCheckRequest(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class ProblemResponse(_message.Message):
    __slots__ = ("id", "title", "description", "problem_type", "time_limit", "memory_limit", "difficulty", "topics", "metadata", "created_at")
    ID_FIELD_NUMBER: _ClassVar[int]
    TITLE_FIELD_NUMBER: _ClassVar[int]
    DESCRIPTION_FIELD_NUMBER: _ClassVar[int]
    PROBLEM_TYPE_FIELD_NUMBER: _ClassVar[int]
    TIME_LIMIT_FIELD_NUMBER: _ClassVar[int]
    MEMORY_LIMIT_FIELD_NUMBER: _ClassVar[int]
    DIFFICULTY_FIELD_NUMBER: _ClassVar[int]
    TOPICS_FIELD_NUMBER: _ClassVar[int]
    METADATA_FIELD_NUMBER: _ClassVar[int]
    CREATED_AT_FIELD_NUMBER: _ClassVar[int]
    id: int
    title: str
    description: str
    problem_type: str
    time_limit: int
    memory_limit: int
    difficulty: str
    topics: _containers.RepeatedScalarFieldContainer[str]
    metadata: _struct_pb2.Struct
    created_at: str
    def __init__(self, id: _Optional[int] = ..., title: _Optional[str] = ..., description: _Optional[str] = ..., problem_type: _Optional[str] = ..., time_limit: _Optional[int] = ..., memory_limit: _Optional[int] = ..., difficulty: _Optional[str] = ..., topics: _Optional[_Iterable[str]] = ..., metadata: _Optional[_Union[_struct_pb2.Struct, _Mapping]] = ..., created_at: _Optional[str] = ...) -> None: ...

class TestCase(_message.Message):
    __slots__ = ("input", "expected_output", "time_limit", "hidden")
    INPUT_FIELD_NUMBER: _ClassVar[int]
    EXPECTED_OUTPUT_FIELD_NUMBER: _ClassVar[int]
    TIME_LIMIT_FIELD_NUMBER: _ClassVar[int]
    HIDDEN_FIELD_NUMBER: _ClassVar[int]
    input: str
    expected_output: str
    time_limit: int
    hidden: int
    def __init__(self, input: _Optional[str] = ..., expected_output: _Optional[str] = ..., time_limit: _Optional[int] = ..., hidden: _Optional[int] = ...) -> None: ...

class TestCasesResponse(_message.Message):
    __slots__ = ("problem_id", "test_cases", "total_count", "visible_count")
    PROBLEM_ID_FIELD_NUMBER: _ClassVar[int]
    TEST_CASES_FIELD_NUMBER: _ClassVar[int]
    TOTAL_COUNT_FIELD_NUMBER: _ClassVar[int]
    VISIBLE_COUNT_FIELD_NUMBER: _ClassVar[int]
    problem_id: int
    test_cases: _containers.RepeatedCompositeFieldContainer[TestCase]
    total_count: int
    visible_count: int
    def __init__(self, problem_id: _Optional[int] = ..., test_cases: _Optional[_Iterable[_Union[TestCase, _Mapping]]] = ..., total_count: _Optional[int] = ..., visible_count: _Optional[int] = ...) -> None: ...

class ProblemSummary(_message.Message):
    __slots__ = ("id", "title", "problem_type", "difficulty")
    ID_FIELD_NUMBER: _ClassVar[int]
    TITLE_FIELD_NUMBER: _ClassVar[int]
    PROBLEM_TYPE_FIELD_NUMBER: _ClassVar[int]
    DIFFICULTY_FIELD_NUMBER: _ClassVar[int]
    id: int
    title: str
    problem_type: str
    difficulty: str
    def __init__(self, id: _Optional[int] = ..., title: _Optional[str] = ..., problem_type: _Optional[str] = ..., difficulty: _Optional[str] = ...) -> None: ...

class ListProblemsResponse(_message.Message):
    __slots__ = ("problems", "total", "skip", "limit")
    PROBLEMS_FIELD_NUMBER: _ClassVar[int]
    TOTAL_FIELD_NUMBER: _ClassVar[int]
    SKIP_FIELD_NUMBER: _ClassVar[int]
    LIMIT_FIELD_NUMBER: _ClassVar[int]
    problems: _containers.RepeatedCompositeFieldContainer[ProblemSummary]
    total: int
    skip: int
    limit: int
    def __init__(self, problems: _Optional[_Iterable[_Union[ProblemSummary, _Mapping]]] = ..., total: _Optional[int] = ..., skip: _Optional[int] = ..., limit: _Optional[int] = ...) -> None: ...

class HealthCheckResponse(_message.Message):
    __slots__ = ("status", "service", "database")
    STATUS_FIELD_NUMBER: _ClassVar[int]
    SERVICE_FIELD_NUMBER: _ClassVar[int]
    DATABASE_FIELD_NUMBER: _ClassVar[int]
    status: str
    service: str
    database: str
    def __init__(self, status: _Optional[str] = ..., service: _Optional[str] = ..., database: _Optional[str] = ...) -> None: ...
