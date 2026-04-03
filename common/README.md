# Common

Updated: `2026-04-03`

This directory is not part of the active runtime path today.

## Current Role

The running platform shares most cross-service logic through [integrated_platform](/d:/codeRunner-main/integrated_platform), including:

- SQLAlchemy models
- Pydantic schemas
- auth helpers
- routing rules
- judge implementations
- queue helpers

## Why `common/` Still Exists

`common/` is reserved for future extracted contracts if the services are split more aggressively, for example:

- protobuf or event definitions
- shared OpenAPI fragments
- DTO-only packages
- cross-service SDK contracts

## Current Status

- Required by the running stack: `No`
- Safe to keep as documentation placeholder: `Yes`
- Primary shared runtime location: [integrated_platform](/d:/codeRunner-main/integrated_platform)
