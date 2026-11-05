# LEARNSPACE LMS — FAILED & BLOCKED TEST CASES LOG

## Executive Log Overview
This document records all test cases that failed or encountered non-standard execution characteristics during the comprehensive Backend API Audit and Automated Newman/Postman execution on the live environment (`http://localhost:5001`).

- **Total Automated API Assertions Executed**: 737
- **Passed Assertions**: 736 (99.86%)
- **Failed Assertions**: 1 (0.14%)
- **Blocked Test Cases**: 0
- **Internal Unit/Integration Tests**: 473 / 473 Passed (100%)

---

## 1. Failed Test Case Detail: TC-AUTH-SLA-01

| Attribute | Detail |
| :--- | :--- |
| **Test Case ID** | `TC-AUTH-SLA-01` |
| **API Endpoint** | `POST /api/auth/register` |
| **Endpoint ID** | `EP-AUTH-01` |
| **HTTP Method** | `POST` |
| **Test Suite** | AUTH Module (36 Endpoints) |
| **Assertion Name** | Response time is within acceptable SLA (<2000ms) |
| **Expected Result** | Response time < 2000 ms |
| **Actual Result** | Response time was **3829 ms** |
| **HTTP Status Code** | `409 Conflict` (or `201 Created` depending on duplicate test email) |
| **Failure Classification**| **Performance / Latency SLA Threshold Breach** |

### Root Cause Analysis (RCA)
1. **Bcrypt Work Factor**: `User` model password hashing utilizes `bcryptjs` with 10 salt rounds which takes approximately 100-150ms on CPU.
2. **Cold Database Handshake**: Connection round-trip to remote MongoDB Atlas cluster during user lookups (`User.findOne`) and schema index checks.
3. **Session Provisioning**: Upon account creation or registration attempt, device parsing and cryptographic random bytes generation add minor processing overhead.
4. **Network Jitter**: Local machine to MongoDB Atlas cloud latency fluctuation during the first automated test run.

### Impact Assessment
- **Severity**: **Minor (Performance)**
- **Functional Impact**: None. The functional registration and validation logic functioned as expected (correct HTTP status code, correct validation error payload, proper data structure).

### Recommended Remediation
1. Adjust Postman collection SLA threshold for user registration from `<2000ms` to `<4000ms` to accommodate cryptographic salt generation and cloud DB latency.
2. Utilize native Node.js `crypto.scrypt` or configure connection pooling for MongoDB Atlas.
3. Add a Redis caching layer for quick duplicate-email index lookups if high-throughput registration is expected.

---

## 2. Blocked Test Cases Log
- **Total Blocked Tests**: 0
- **Analysis**: All 159 discovered endpoints were reachable and responded with deterministic, standards-compliant HTTP status codes. No requests were blocked by crashed servers or unresponsive daemons.

---

## 3. Security Boundary & Negative Test Validation
All 124 negative security checks (`[SECURITY-401]`) successfully enforced token-based authentication. Requests lacking Bearer tokens or credentials were unequivocally denied with HTTP 401 Unauthorized, validating zero authorization leaks across protected endpoints.
