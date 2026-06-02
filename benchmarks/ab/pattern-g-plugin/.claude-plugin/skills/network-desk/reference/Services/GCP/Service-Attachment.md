---
type: service
name: GCP Service Attachment
cloud: gcp
category: networking
specialists: [cn_pl]
aliases: [Service Attachment, PSC Producer, Private Service Connect Producer]
tags: [psc, service-attachment, private-service-connect, service-exposure]
status: stable
updated: 2026-06-01
---
# GCP Service Attachment (PSC Producer)

Publish an Internal Load Balancer-backed service via [[Private-Service-Connect|Private Service Connect]] so consumers in other VPCs / projects / orgs can create endpoints that reach it privately. This is the producer side; consumers create [[Private-Service-Connect|PSC endpoints]]. This is the GCP analogue of [[Private-Link-Service|Azure Private Link Service]] and [[PrivateLink|AWS PrivateLink endpoint service]].

---

## Summary

A **service attachment** wraps a producer's Internal Load Balancer forwarding rule with [[Private-Service-Connect|PSC]] metadata: a dedicated NAT subnet, a connection-preference policy (`ACCEPT_AUTOMATIC` / `ACCEPT_MANUAL`), and a per-consumer-project quota. Consumers reference the service attachment URI to create their [[Private-Service-Connect|PSC endpoint]].

## When to use / when to avoid

**Use when:**
- You're a SaaS provider publishing a service to consumers in other Google Cloud projects or organizations.
- You're a platform team exposing a regional shared service to many spoke VPCs without VPC peering.

**Avoid when:**
- The service is fronted by an external load balancer — only Internal LBs can be [[Private-Service-Connect|PSC]] producers.
- A simple same-VPC shared service can use Private Google Access or shared VPC instead.

---

## Deployment

```bash
# Step 1: Create internal LB with backend service (skip if exists)

# Step 2: Create a dedicated subnet for PSC NAT
gcloud compute networks subnets create psc-nat-subnet \
  --network=my-vpc --region=us-central1 \
  --range=10.5.0.0/24 --purpose=PRIVATE_SERVICE_CONNECT

# Step 3: Create service attachment
gcloud compute service-attachments create my-service \
  --region=us-central1 \
  --producer-forwarding-rule=my-ilb-forwarding-rule \
  --nat-subnets=psc-nat-subnet \
  --connection-preference=ACCEPT_MANUAL \
  --consumer-accept-list=consumer-project-id=10

# Step 4: Share the service attachment URI with consumers
# projects/my-project/regions/us-central1/serviceAttachments/my-service
```

### Key Points

- **Internal LB only** — external LBs cannot be [[Private-Service-Connect|PSC]] producers.
- **NAT subnet** — a dedicated subnet with `purpose=PRIVATE_SERVICE_CONNECT` is required for NAT translation between consumer endpoints and the producer's ILB.
- **Consumer limit** — set max connections per consumer project via the `--consumer-accept-list` flag (`project=N`).
- **Domain names** — optionally configure a DNS domain for the service via [[Cloud-DNS|Cloud DNS]] so consumers can use friendly FQDNs.

---

## Approval Workflows

- **`ACCEPT_AUTOMATIC`** — consumer requests succeed immediately if they're under the per-project quota.
- **`ACCEPT_MANUAL`** with `--consumer-accept-list project=quota` — producer pre-authorizes consumer projects with explicit connection caps.
- Use `ACCEPT_MANUAL` for cross-org production; `ACCEPT_AUTOMATIC` for trusted internal consumers.

---

## Common pitfalls

1. **NAT subnet size** — every consumer endpoint connection consumes IPs from the NAT subnet. Size for total concurrent connections, not number of consumers.
2. **Wrong subnet purpose** — using a regular subnet for NAT fails silently; the subnet `purpose` must be `PRIVATE_SERVICE_CONNECT`.
3. **Consumer accept-list missing project** — if a consumer project isn't on the accept list, connection requests sit pending forever; producer must add the project explicitly.
4. **Regional scope** — service attachments are regional. Multi-region producers must publish one service attachment per region; consumers create one endpoint per region.
5. **Quota miscounting** — per-project quota counts active endpoint connections, not endpoints. Consumers behind a forwarding rule still count per connection.

---

## Cross-references

- Cloud equivalents: [[Private-Link-Service|Azure Private Link Service]] · [[PrivateLink|AWS PrivateLink]]
- Consumer side: [[Private-Service-Connect|GCP Private Service Connect]]
- Pairs with: [[Cloud-Load-Balancing]] · [[Cloud-DNS]]

**Analysis only — verify against vendor documentation before applying.**
