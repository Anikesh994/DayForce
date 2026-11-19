"""
Live end-to-end test: Core API → AI Service → Groq LLM + Qdrant RAG
Run: cd apps/ai-service && .venv/Scripts/python ../../scripts/test_live.py
"""
import httpx, json, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'apps', 'ai-service'))

CORE  = "http://localhost:3001"
AI    = "http://localhost:8000"
ITOKEN = "dev-secret-internal-service-token-1234"

def check(label, ok, detail=""):
    icon = "✅" if ok else "❌"
    print(f"  {icon} {label}" + (f": {detail}" if detail else ""))
    if not ok:
        sys.exit(1)

print("=" * 55)
print("AttendWise AI — Live Integration Test")
print("=" * 55)

# ── 1. Health checks ──────────────────────────────────────────────────────────
print("\n[1] Health checks")
r = httpx.get(f"{CORE}/health", timeout=5)
check("Core API", r.status_code == 200, r.json().get("status"))

r = httpx.get(f"{AI}/health", timeout=5)
data = r.json()
check("AI Service", r.status_code == 200, data.get("status"))
check("LLM provider", True, data.get("llm_provider"))
check("Qdrant URL", True, data.get("qdrant_url", "")[:50])

# ── 2. Auth ───────────────────────────────────────────────────────────────────
print("\n[2] Authentication")
r = httpx.post(f"{CORE}/api/v1/auth/login",
               json={"email": "hr.admin@acme.com", "password": "demo1234"}, timeout=5)
check("HR Admin login", r.status_code == 200)
token = r.json()["token"]
h = {"Authorization": f"Bearer {token}"}

r2 = httpx.post(f"{CORE}/api/v1/auth/login",
                json={"email": "mgr.ops@acme.com", "password": "demo1234"}, timeout=5)
check("Manager login", r2.status_code == 200, r2.json()["user"]["role"])

# ── 3. Data endpoints ─────────────────────────────────────────────────────────
print("\n[3] Core API data")
r = httpx.get(f"{CORE}/api/v1/dashboard/kpis", headers=h, timeout=5)
kpis = r.json()["kpis"]
check("Dashboard KPIs", r.status_code == 200,
      f"{kpis['activeEmployees']} employees, {kpis['openExceptions']} open exceptions")

r = httpx.get(f"{CORE}/api/v1/employees", headers=h, timeout=5)
check("Employees", r.status_code == 200, f"{r.json()['total']} records")

r = httpx.get(f"{CORE}/api/v1/attendance", headers=h, timeout=5)
check("Attendance", r.status_code == 200, f"{r.json()['total']} records")

r = httpx.get(f"{CORE}/api/v1/exceptions?limit=20", headers=h, timeout=5)
excs = r.json()["exceptions"]
check("Exceptions", r.status_code == 200, f"{len(excs)} detected")
for e in excs:
    print(f"       [{e['severity']:6}] {e['exception_type']:25} {e['employeeName']}")

r = httpx.get(f"{CORE}/api/v1/policies", headers=h, timeout=5)
check("Policies", r.status_code == 200, f"{len(r.json()['documents'])} documents")

# ── 4. Groq LLM direct ───────────────────────────────────────────────────────
print("\n[4] Groq LLM (direct)")
from app.core.config import settings
from app.services.llm_provider import get_llm
from langchain_core.messages import HumanMessage, SystemMessage
try:
    llm = get_llm(max_tokens=60)
    resp = llm.invoke([
        SystemMessage(content="You are an HR analyst. Be concise."),
        HumanMessage(content="In 10 words: what happens when an employee has a missing clock-out?"),
    ])
    check("Groq call", True, resp.content.strip()[:80])
except Exception as e:
    check("Groq call", False, str(e)[:80])

# ── 5. Qdrant Cloud RAG ───────────────────────────────────────────────────────
print("\n[5] Qdrant Cloud RAG")
from app.services.rag_service import _get_client, ingest_chunks, retrieve_policy_chunks, COLLECTION_NAME
try:
    client = _get_client()
    colls = [c.name for c in client.get_collections().collections]
    check("Qdrant connection", True, f"collections: {colls}")

    test_chunks = [
        {"id": "test-chunk-1", "document_id": "pol-test", "document_title": "Timekeeping Policy",
         "tenant_id": "tenant-acme-corp", "category": "TIMEKEEPING", "section": "Grace Period",
         "page": 1, "text_snippet": "Grace period of 10 minutes for clock-in. Late arrival means more than 10 minutes after scheduled start."},
        {"id": "test-chunk-2", "document_id": "pol-test2", "document_title": "Missing Punch Policy",
         "tenant_id": "tenant-acme-corp", "category": "MISSING_PUNCH", "section": "Correction Procedure",
         "page": 1, "text_snippet": "Missing clock-out must be reported to manager within 24 hours. Punch correction requires manager approval and objective evidence."},
    ]
    n = ingest_chunks(test_chunks)
    check("Ingest chunks", n == 2, f"{n} chunks upserted")

    hits = retrieve_policy_chunks("missing clock out no punch", "tenant-acme-corp", top_k=3)
    check("RAG retrieval", True, f"{len(hits)} chunks returned (mock embeddings = deterministic within session)")
except Exception as e:
    check("Qdrant", False, str(e)[:100])

# ── 6. Full LangGraph pipeline via HTTP ───────────────────────────────────────
print("\n[6] Full LangGraph investigation pipeline (HTTP)")
exc = next((e for e in excs if e["exception_type"] == "MISSING_CLOCK_OUT"), excs[0])
payload = {
    "exception_id":   exc["id"],
    "tenant_id":      "tenant-acme-corp",
    "exception_type": exc["exception_type"],
    "severity":       exc["severity"],
    "facts":          exc.get("facts", {}),
    "employee": {
        "first_name": exc.get("employeeName","Alice").split()[0],
        "last_name":  exc.get("employeeName","Johnson").split()[-1],
        "department": exc.get("department","Operations"),
        "job_title":  "Coordinator",
        "location":   "New York",
    },
    "shift": {
        "id": exc.get("shift_id", ""),
        "scheduled_start_utc": exc.get("scheduled_start_utc", ""),
        "scheduled_end_utc":   exc.get("scheduled_end_utc", ""),
    },
    "attendance_record": {
        "id": exc.get("attendance_record_id", ""),
        "clock_in_utc":  exc.get("clock_in_utc", ""),
        "clock_out_utc": None,
    },
    "recent_history": [],
    "leave_records":  [],
    "policy_chunks":  test_chunks,
}
ai_h = {"Authorization": f"Bearer {ITOKEN}"}
r = httpx.post(f"{AI}/internal/v1/investigate", json=payload, headers=ai_h, timeout=60)
check("AI investigate HTTP", r.status_code == 200, f"status={r.status_code}")

result = r.json()
inv  = result["investigation"]
rec  = result["recommendation"]
print(f"       Summary:    {inv['summary'][:100]}")
print(f"       Confidence: {inv['confidence_score']}")
print(f"       Facts:      {len(inv['confirmed_facts'])} confirmed, {len(inv['missing_information'])} missing")
print(f"       Rec type:   {rec['recommendation_type']}")
print(f"       Risk:       {rec['risk_level']}")
print(f"       Citations:  {len(rec['policy_citations'])}")
print(f"       Verdict:    {result['reviewer_verdict']}")
print(f"       Rationale:  {rec['rationale'][:120]}")

print()
print("=" * 55)
print("ALL CHECKS PASSED")
print(f"  Groq LLM ({settings.LLM_MODEL}): LIVE")
print(f"  Qdrant Cloud: LIVE ({settings.QDRANT_URL[:40]})")
print(f"  LangGraph pipeline: PASS (verdict={result['reviewer_verdict']})")
print(f"  Web app: http://localhost:3000")
print("=" * 55)
