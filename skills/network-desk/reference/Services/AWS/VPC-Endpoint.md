---
type: service
name: AWS VPC Endpoint
cloud: aws
category: networking
specialists: [cn_pl]
aliases: [VPC Endpoint, Interface Endpoint, Gateway Endpoint, AWS PrivateLink Endpoint]
tags: [vpc-endpoint, privatelink, private-connectivity, dns]
status: stable
updated: 2026-06-01
---
# AWS VPC Endpoint

VPC endpoints provide private connectivity from a VPC to AWS services (S3, DynamoDB, SQS, KMS, …) or to consumer-published [[PrivateLink|AWS PrivateLink]] services, without traversing the public internet, a NAT Gateway, or a VPN. This is the AWS analogue of [[Private-Endpoint|Azure Private Endpoint]] and [[Private-Service-Connect|GCP Private Service Connect]].

---

## Summary

Two flavors:
- **Interface Endpoint** — one Elastic Network Interface (ENI) per AZ, powered by [[PrivateLink|AWS PrivateLink]]. Works for ~all AWS services + customer-published endpoint services. Has per-hour and per-GB cost.
- **Gateway Endpoint** — route-table entry, no ENI, only for **S3** and **DynamoDB**. Free.

## When to use / when to avoid

**Use when:**
- You need workloads in a VPC to reach AWS APIs without an Internet Gateway / NAT Gateway path.
- You consume a SaaS service exposed via [[PrivateLink|AWS PrivateLink]] (provider's [[PrivateLink|endpoint service]]).
- Compliance forbids egress over public AWS endpoints.

**Avoid when:**
- The service is only S3 / DynamoDB and the workload stays in-VPC — use a (free) Gateway Endpoint instead of an Interface Endpoint.
- You'd be paying per-AZ ENI charges for sparse usage — measure cost first.

---

## Subnet & Security Considerations

- Each interface endpoint creates **one ENI per AZ** where it's deployed. If your endpoint spans 3 AZs, it consumes 3 IPs.
- Security groups are applied **per-endpoint** — use a dedicated subnet or carefully manage SGs.
- Gateway endpoints attach to route tables, not subnets — they have no IP and no SG.
- Enable `--private-dns-enabled` for interface endpoints so AWS service SDKs resolve the regional service name to the private ENI IPs automatically.

---

## Interface Endpoint

```bash
# Create interface endpoint for SQS in specific subnets
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-0123456789abcdef0 \
  --vpc-endpoint-type Interface \
  --service-name com.amazonaws.us-east-1.sqs \
  --subnet-ids subnet-aaa subnet-bbb subnet-ccc \
  --security-group-ids sg-0123456789abcdef0 \
  --private-dns-enabled

# List available services
aws ec2 describe-vpc-endpoint-services \
  --query 'ServiceNames[?contains(@, `sqs`)]'
```

---

## Gateway Endpoint (S3 / DynamoDB only)

```bash
# Create gateway endpoint for S3
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-0123456789abcdef0 \
  --vpc-endpoint-type Gateway \
  --service-name com.amazonaws.us-east-1.s3 \
  --route-table-ids rtb-0123456789abcdef0
```

**Gateway vs Interface for S3:**
- **Gateway**: Free, route-based, no ENI, works within VPC only.
- **Interface**: Costs money, ENI-based, supports cross-VPC / on-prem access via [[PrivateLink]].

---

## Approval Workflows

- **Auto-approval**: configurable via the [[PrivateLink|endpoint service]]'s `acceptance-required` flag (default true for cross-account [[PrivateLink|PrivateLink]] services).
- **Cross-account / cross-tenant**: supported — provider accepts/rejects connection requests via `accept-vpc-endpoint-connections`.

```bash
# Accept consumer VPC endpoint connection (provider side)
aws ec2 accept-vpc-endpoint-connections \
  --service-id vpce-svc-0123456789abcdef0 \
  --vpc-endpoint-ids vpce-0123456789abcdef0
```

---

## Common pitfalls

1. **Per-AZ ENI cost surprise** — spreading an interface endpoint across many AZs multiplies hourly cost; pin to the AZs your workload actually uses.
2. **Private DNS conflict** — enabling `--private-dns-enabled` overrides default resolution for that service in the VPC; if you have on-prem DNS forwarders pointing to public AWS endpoints, behavior changes silently.
3. **Gateway endpoint missed in route tables** — gateway endpoints attach to route tables, not subnets. Subnets associated with a route table without the endpoint route will still NAT out to public S3.
4. **Security group too restrictive** — forgetting that the SG applies to the *endpoint*, not the client; you may need to allow 443 from your workload subnets.
5. **Cross-region access** — interface endpoints are regional. Cross-region clients still use the public endpoint unless you build interconnect / private DNS forwarding yourself.

---

## Cross-references

- Cloud equivalents: [[Private-Endpoint|Azure Private Endpoint]] · [[Private-Service-Connect|GCP Private Service Connect]]
- Producer side: [[PrivateLink|AWS PrivateLink]] (publishing your own service)
- Pairs with: [[Private-Endpoint-DNS-Integration]] · [[Private-Endpoint-Security-Review]] · [[Private-Endpoint-Troubleshooting]]

**Analysis only — verify against vendor documentation before applying.**
