---
type: vendor
name: AWS Network Firewall
vendor_kind: cloud-fw
roles: [firewall]
tags: [firewall, vendor, aws, aws-network-firewall, cloud-fw]
specialists: [cn_fw]
status: stable
updated: 2026-06-01
---

# AWS Network Firewall

## Overview

AWS-native, managed stateful firewall built on the open-source **Suricata** IDS/IPS engine. Per-VPC deployment with per-AZ firewall endpoints in a dedicated firewall subnet; traffic is steered via route tables — typically a "firewall subnet" tier sits between the IGW (or [[Transit-Gateway|TGW]] attachment) and workload subnets. Billed by firewall-endpoint-hour **per AZ** + data processed (GB/h); at one endpoint per AZ for HA, it is materially more expensive than a security-group-only design and significantly more expensive than [[Azure-Firewall|Azure Firewall]] in equivalent topologies. Best used for centralized egress filtering, intra-VPC east-west inspection, and Suricata signature-based detection. Pair with [[Transit-Gateway|Transit Gateway]] for multi-VPC inspection patterns.

## Config generation

```yaml
# Stateful rule group
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  DMZtoDBRuleGroup:
    Type: AWS::NetworkFirewall::RuleGroup
    Properties:
      RuleGroupName: dmz-to-db-rules
      Type: STATEFUL
      Capacity: 10
      RuleGroup:
        RulesSource:
          StatefulRules:
            - Action: PASS
              Header:
                Protocol: TCP
                Source: "10.1.2.0/24"
                SourcePort: ANY
                Destination: "10.1.3.0/24"
                DestinationPort: "3306"
                Direction: FORWARD
              RuleOptions:
                - Keyword: "sid"
                  Settings: ["1000001"]
                - Keyword: "msg"
                  Settings: ['"Allow DMZ web servers to MySQL"']
```

```bash
# AWS CLI equivalent
aws network-firewall create-rule-group \
  --rule-group-name dmz-to-db-rules \
  --type STATEFUL \
  --capacity 10 \
  --rule-group '{
    "RulesSource": {
      "StatefulRules": [{
        "Action": "PASS",
        "Header": {
          "Protocol": "TCP",
          "Source": "10.1.2.0/24",
          "SourcePort": "ANY",
          "Destination": "10.1.3.0/24",
          "DestinationPort": "3306",
          "Direction": "FORWARD"
        },
        "RuleOptions": [
          {"Keyword": "sid", "Settings": ["1000001"]}
        ]
      }]
    }
  }'
```

## HA

```
VPC Route Table → GWLB Endpoint → GWLB → NVA-1 (target group)
                                        → NVA-2 (target group)
```
- **GWLB** distributes traffic to multiple NVA instances in a target group using GENEVE encapsulation.
- Cross-AZ deployment for resilience; health checks remove unhealthy targets.
- **[[Transit-Gateway|Transit Gateway]]** integration for centralized inspection.
- AWS Network Firewall is managed — HA is built-in with multi-AZ endpoints.

## Policy design

- Zones map to VPC subnets; route table entries steer traffic through firewall endpoints.
- Stateful rule groups define zone-transition policies.
- Domain-based filtering available via stateful rules with HTTP host header inspection.

## Hardening

- Enable **alert and flow logging** to S3 / CloudWatch Logs.
- Use **managed rule groups** (AWS-managed threat signatures) alongside custom rules.
- Enable **strict rule ordering** for stateful rule groups to ensure predictable evaluation.
- Restrict firewall endpoint subnet routing — only route inspected traffic through firewall subnets.
- Ref: [AWS Network Firewall Best Practices](https://docs.aws.amazon.com/network-firewall/latest/developerguide/best-practices.html).

## Logging

```
# Top denied flows
fields @timestamp, event.src_ip, event.dest_ip, event.dest_port, event.event_type
| filter event.event_type = "drop"
| stats count() as DenyCount by event.src_ip, event.dest_ip, event.dest_port
| sort DenyCount desc
| limit 20

# Alert events
fields @timestamp, event.alert.signature, event.alert.severity, event.src_ip, event.dest_ip
| filter event.event_type = "alert"
| sort @timestamp desc
| limit 50
```

## Rule audit

```bash
# List rule groups
aws network-firewall list-rule-groups --type STATEFUL
aws network-firewall describe-rule-group --rule-group-arn <arn>

# Hit counts via CloudWatch Metrics
# Metric: DroppedPackets, PassedPackets per rule group
aws cloudwatch get-metric-statistics \
  --namespace AWS/NetworkFirewall \
  --metric-name PassedPackets \
  --dimensions Name=FirewallName,Value=<name> \
  --start-time <30-days-ago> --end-time <now> \
  --period 2592000 --statistics Sum
```

## Policy testing

```bash
# Stand up a non-prod firewall endpoint with a copy of the rule group
# in "alert-only" mode (Suricata: replace `drop`/`reject` with `alert`).

# Send a test flow from a test EC2 to the target
aws logs filter-log-events \
  --log-group-name /aws/network-firewall/alert \
  --filter-pattern '{ $.event.src_ip = "10.0.10.5" }' \
  --start-time $(date -d '5 min ago' +%s%3N)
```

For AWS Network Firewall, keep analyzer scope explicit: `--analyze-rule-group` is for stateless rule-group behavior, not full stateful Suricata evaluation. For stateful rules, export/describe the rule group, validate Suricata syntax offline, and test in a non-production firewall endpoint before deploy.
```bash
aws network-firewall describe-rule-group --rule-group-arn <arn>
# Then validate Suricata rules with the current Suricata toolchain and lab traffic before production.
```
Reference: https://docs.aws.amazon.com/cli/latest/reference/network-firewall/describe-rule-group.html

## Troubleshooting

```bash
# Check flow logs (if enabled)
# CloudWatch Logs Insights:
fields @timestamp, event.src_ip, event.dest_ip, event.dest_port, event.event_type
| filter event.src_ip = "10.1.2.5" AND event.dest_ip = "10.1.3.10"
| sort @timestamp desc

# Verify route tables point to firewall endpoint
aws ec2 describe-route-tables --route-table-id <rtb-id>

# Check firewall endpoint status
aws network-firewall describe-firewall --firewall-name <name> \
  --query 'FirewallStatus.SyncStates'
```

## Common gotchas

- Each AZ needs its own firewall endpoint **and** a dedicated firewall subnet — single-AZ deployments will not survive an AZ failure.
- Route tables must steer traffic to the firewall endpoint ENI ([[VPC-Endpoint|VPC Endpoint]]), not to the IGW — easy to misroute and bypass inspection; verify with the VPC Reachability Analyzer.
- The default policy is "forward to stateful engine", so any traffic without a stateless drop AND without a stateful match passes through — explicitly set default actions for both engines.
- Suricata rule syntax differs from cloud-native rule formats — beyond AWS-managed rule groups, tuning requires a Suricata-fluent engineer.
- Cross-AZ inspection traffic incurs inter-AZ data transfer charges — design the route topology to keep flows local-AZ where possible.
- Logging configuration is separate per log type (alert vs flow) and per destination (CloudWatch / S3 / Kinesis) — must be enabled per firewall, not policy-level.

## See also

- [[Topics/Firewall/Firewall-Config-Generation|Firewall Config Generation]]
- [[Topics/Firewall/Firewall-HA-Design|Firewall HA Design]]
- [[Topics/Firewall/Firewall-Hardening|Firewall Hardening]]
- [[Topics/Firewall/Firewall-Log-Analysis|Firewall Log Analysis]]
- [[Topics/Firewall/Firewall-Policy-Design|Firewall Policy Design]]
- [[Topics/Firewall/Firewall-Policy-Testing|Firewall Policy Testing]]
- [[Topics/Firewall/Firewall-Rule-Audit|Firewall Rule Audit]]
- [[Topics/Firewall/Firewall-Troubleshooting|Firewall Troubleshooting]]
- [[Topics/Firewall/Firewall-Vendor-Migration|Firewall vendor migration]] (multi-vendor)

---
Analysis only — verify against vendor documentation before applying.
