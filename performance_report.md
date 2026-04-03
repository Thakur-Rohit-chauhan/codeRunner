# Performance Report

Generated at: 2026-04-02T08:08:49.272356+00:00

## End-to-End Timing

- Concurrent submission enqueue time: 1.82s
- Queue drain time: 9.20s
- Effective code throughput: 2.17 jobs/s
- Effective ML throughput: 2.17 jobs/s
- Effective packet throughput: 2.17 jobs/s

## API Latency Summary

| Operation | Mean ms | P95 ms | Max ms |
| --- | ---: | ---: | ---: |
| `login` | 72.53 | 191.17 | 227.63 |
| `register` | 602.44 | 1310.30 | 1367.91 |
| `submit_code` | 238.05 | 745.87 | 1038.51 |
| `submit_ml` | 267.90 | 948.41 | 1227.71 |
| `submit_packet` | 166.96 | 682.49 | 765.63 |