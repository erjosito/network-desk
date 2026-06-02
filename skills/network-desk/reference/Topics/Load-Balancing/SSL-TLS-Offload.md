---
type: topic
name: SSL/TLS Offload and Certificate Management
specialists: [cn_lb]
tags: [load-balancer, tls, ssl, offload, certificates]
status: stable
updated: 2026-06-01
---
# SSL/TLS Offload and Certificate Management

Design TLS termination strategies and encryption-in-transit architectures for load-balanced workloads across Azure, AWS, and GCP. **Certificate lifecycle management** (sources, storage, rotation, monitoring) lives in **[[TLS-Certificate-Management]]** — this page covers the termination side only.

---

## TLS Termination Models

| Model | TLS Terminates At | Backend Traffic | Use Case |
|---|---|---|---|
| **TLS offload** | Load balancer | HTTP (unencrypted) to backend | Simplest; backend doesn't need certs. Only acceptable if LB → backend is within a trusted network (same VNet/VPC). |
| **TLS re-encryption** | Load balancer + backend | HTTPS (re-encrypted) to backend | LB terminates and inspects, then opens new TLS session to backend. Common for WAF + L7 routing. |
| **TLS pass-through** | Backend server | Encrypted end-to-end | LB forwards TCP without decryption. Required for mTLS or when LB must not see plaintext. L4 only — no L7 routing. |

**Recommendation**: Use **TLS re-encryption** for most production L7 workloads. It enables WAF inspection and content-based routing while maintaining encryption to backends.

---

## Certificate Management

> Certificate lifecycle (sources, storage, rotation, monitoring, revocation) lives in **[[TLS-Certificate-Management]]** — the canonical cert lifecycle page for load balancers. Use it for: Azure Key Vault / AWS ACM / GCP Certificate Manager integration, ACME automation, private CA usage, rotation strategies, and renewal alerting. This page covers the **termination side** below.

---

## TLS Version & Cipher Suite Policy

### Minimum TLS Version

**Always enforce TLS 1.2 as minimum.** TLS 1.0 and 1.1 are deprecated (RFC 8996).

```bash
# Azure Application Gateway — set minimum TLS version
az network application-gateway ssl-policy set \
  --resource-group myRG \
  --gateway-name myAppGW \
  --policy-type Predefined \
  --policy-name AppGwSslPolicy20220101S

# AWS ALB — security policy selection
aws elbv2 create-listener ... \
  --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06

# GCP — SSL policy
gcloud compute ssl-policies create my-ssl-policy \
  --profile RESTRICTED \
  --min-tls-version 1.2
gcloud compute target-https-proxies update my-proxy \
  --ssl-policy my-ssl-policy
```

### Cipher Suite Recommendations

| Level | Profile | Ciphers Included |
|---|---|---|
| **Restricted** | TLS 1.2+ only, AEAD ciphers | AES-256-GCM, AES-128-GCM, CHACHA20-POLY1305 |
| **Modern** | TLS 1.2+, strong ciphers | Above + AES-CBC (for older clients) |
| **Compatible** | TLS 1.0+ (not recommended) | All ciphers including legacy RC4, 3DES |

Use **Restricted** profile unless you must support legacy clients (e.g., legacy IoT devices, Windows Server 2012).

---

## Common TLS Mistakes

1. **Certificate hostname mismatch** — SAN/CN must match the FQDN clients use to connect. Wildcard certs (`*.contoso.com`) don't cover the apex (`contoso.com`).
2. **Expired certificates** — automate renewal. Set alerts at 30, 14, and 7 days before expiry.
3. **Incomplete certificate chain** — always include intermediate CA certificates. Use `openssl s_client -connect host:443 -showcerts` to verify.
4. **Backend certs ignored** — when using TLS re-encryption, the LB must trust the backend certificate. Configure the trusted root CA on the LB.
5. **Mixed content** — after enabling HTTPS on the LB, ensure all backend responses use HTTPS URLs. Use `Strict-Transport-Security` (HSTS) headers.

**Analysis only — verify against vendor documentation before applying.**
