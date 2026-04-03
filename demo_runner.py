from __future__ import annotations

import asyncio
import os

import httpx


BASE_URL = os.getenv("BACKEND_URL", "http://localhost:8000/api")
ADMIN_EMAIL = os.getenv("DEMO_EMAIL", "admin@gmail.com")
ADMIN_PASSWORD = os.getenv("DEMO_PASSWORD", "Admin123")


async def poll_submission(client: httpx.AsyncClient, token: str, submission_id: str) -> dict:
    headers = {"Authorization": f"Bearer {token}"}
    for _ in range(20):
        response = await client.get(f"/submission-status/{submission_id}", headers=headers)
        response.raise_for_status()
        payload = response.json()
        if payload["status"] in {"accepted", "failed"}:
            return payload
        await asyncio.sleep(1.0)
    raise RuntimeError(f"Timed out waiting for submission {submission_id}")


async def main() -> None:
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=20.0) as client:
        login = await client.post("/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        login.raise_for_status()
        auth_payload = login.json()
        token = auth_payload["token"]
        headers = {"Authorization": f"Bearer {token}"}

        competitions_response = await client.get("/competitions", headers=headers)
        competitions_response.raise_for_status()
        competitions = competitions_response.json()

        code_comp = next(item for item in competitions if item["mode"] == "code")
        ml_comp = next(item for item in competitions if item["mode"] == "ml")
        packet_comp = next(item for item in competitions if item["mode"] == "packet")

        code_submission = await client.post(
            "/submit/code",
            headers=headers,
            json={
                "competition_id": code_comp["id"],
                "language": "python",
                "source_code": "def solve(data):\n    nums = list(map(int, data.split())) if data else []\n    return str(sum(nums))\n",
            },
        )
        code_submission.raise_for_status()

        ml_submission = await client.post(
            "/submit/ml",
            headers=headers,
            json={
                "competition_id": ml_comp["id"],
                "notebook_payload": "def train(dataset):\n    accuracy = 0.88\n    hidden_test_accuracy=0.88\n    return accuracy\n",
                "entrypoint": "train",
            },
        )
        ml_submission.raise_for_status()

        packet_submission = await client.post(
            "/submit/packet",
            headers=headers,
            json={
                "competition_id": packet_comp["id"],
                "packet_script": "from scapy.all import IP, TCP\npacket = IP(dst='10.0.0.5')/TCP(flags='S')\n",
                "topology": "namespace-demo",
            },
        )
        packet_submission.raise_for_status()

        code_result = await poll_submission(client, token, code_submission.json()["submissionId"])
        ml_result = await poll_submission(client, token, ml_submission.json()["submissionId"])
        packet_result = await poll_submission(client, token, packet_submission.json()["submissionId"])

        leaderboard_response = await client.get(
            "/leaderboard",
            params={"competition_id": code_comp["id"], "limit": 5},
            headers=headers,
        )
        leaderboard_response.raise_for_status()
        leaderboard = leaderboard_response.json()

        print("Integrated demo completed successfully.")
        print(f"Code submission: {code_result['submissionId']} -> {code_result['status']} ({code_result['score']})")
        print(f"ML submission: {ml_result['submissionId']} -> {ml_result['status']} ({ml_result['score']})")
        print(f"Packet submission: {packet_result['submissionId']} -> {packet_result['status']} ({packet_result['score']})")
        print(f"Top leaderboard entries for {leaderboard['competitionTitle']}:")
        for entry in leaderboard["entries"]:
            print(f"  rank={entry['rank']} user={entry['username']} score={entry['score']}")


if __name__ == "__main__":
    asyncio.run(main())
