"""Packet engine for cyber challenge generation/validation."""

from typing import List, Dict, Any

from scapy.all import IP, TCP, UDP, DNS, DNSQR


def _packet_info(pkt) -> Dict[str, Any]:
    info = {
        "src": pkt[IP].src if IP in pkt else "",
        "dst": pkt[IP].dst if IP in pkt else "",
        "ttl": int(pkt[IP].ttl) if IP in pkt and hasattr(pkt[IP], "ttl") else None,
        "summary": pkt.summary(),
        "raw": bytes(pkt).hex(),
    }
    if TCP in pkt:
        info["malicious"] = pkt[TCP].dport == 22 and pkt[TCP].flags == "S"
    else:
        info["malicious"] = False

    if DNS in pkt and pkt[DNS].qd:
        qname = pkt[DNS].qd.qname.decode("utf-8").rstrip('.')
        info["spoofed"] = qname == "victim.local"
    else:
        info["spoofed"] = False

    return info


def generate_packets(problem_id: int) -> List[Dict[str, Any]]:
    """Generate a deterministic set of challenge packets for a problem."""
    if problem_id % 3 == 1:
        packets = [
            IP(src="192.168.1.100", dst="10.0.0.1", ttl=10) / TCP(dport=80, sport=12345),
            IP(src="192.168.1.101", dst="10.0.0.2", ttl=20) / UDP(dport=53, sport=33333),
        ]
    elif problem_id % 3 == 2:
        packets = [
            IP(src="10.10.10.10", dst="10.0.0.1", ttl=64) / TCP(dport=22, sport=44444, flags="S"),
            IP(src="172.16.0.5", dst="10.0.0.1", ttl=64) / TCP(dport=8080, sport=55555, flags="PA"),
        ]
    else:
        packets = [
            IP(src="8.8.8.8", dst="10.0.0.1") / UDP(dport=53, sport=53) / DNS(rd=1, qd=DNSQR(qname="victim.local")),
            IP(src="8.8.4.4", dst="10.0.0.1") / UDP(dport=53, sport=53) / DNS(rd=1, qd=DNSQR(qname="example.com")),
        ]

    return [_packet_info(pkt) for pkt in packets]


def capture_packets() -> List[Dict[str, Any]]:
    """Stub capture function; can be adapted to sniff live traffic."""
    return generate_packets(1)
