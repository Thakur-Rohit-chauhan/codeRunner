# Performance Report

Generated at: 2026-04-03T10:23:48.163720+00:00

## End-to-End Metrics

- Users simulated: `100`
- Submissions processed: `300`
- Readiness wait: `1.04s`
- Enqueue duration: `68.97s`
- Completion duration: `184.92s`
- Total runtime: `254.93s`
- Throughput: `1.62` submissions/s
- Failure rate: `0.0%`

## Latency Summary

| Operation | Mean ms | P95 ms | Max ms |
| --- | ---: | ---: | ---: |
| `admin_login` | 127.05 | 127.05 | 127.05 |
| `login` | 2439.09 | 3111.71 | 3382.18 |
| `register` | 31715.53 | 56527.12 | 60017.20 |
| `submit_code` | 1296.35 | 2656.76 | 2740.90 |
| `submit_ml` | 1722.48 | 2720.84 | 2761.92 |
| `submit_packet` | 1815.50 | 2710.30 | 2763.86 |
