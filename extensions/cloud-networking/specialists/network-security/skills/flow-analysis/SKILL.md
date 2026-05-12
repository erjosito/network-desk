# Skill: Flow Log Analysis (nsec_flow-analysis)

Analyze network flow logs to detect security threats, identify traffic anomalies, and establish baselines across Azure NSG flow logs, AWS VPC flow logs, and GCP VPC flow logs.

---

## Azure NSG Flow Log Format (Version 2)

Version 2 flow logs include per-flow byte and packet counts, flow state tracking, and bandwidth information.

### Log Structure
```
{
  "records": [{
    "time": "2024-01-15T10:30:00.000Z",
    "systemId": "nsg-guid",
    "macAddress": "000D3A123456",
    "category": "NetworkSecurityGroupFlowEvent",
    "resourceId": "/subscriptions/.../networkSecurityGroups/myNSG",
    "operationName": "NetworkSecurityGroupFlowEvents",
    "properties": {
      "Version": 2,
      "flows": [{
        "rule": "DefaultRule_AllowInternetOutBound",
        "flows": [{
          "mac": "000D3A123456",
          "flowTuples": [
            "1705312200,10.0.1.4,52.168.1.1,49152,443,T,O,A,B,100,5000,80,4000"
          ]
        }]
      }]
    }
  }]
}
```

**Flow Tuple Fields (Version 2)**:
`timestamp, srcIP, dstIP, srcPort, dstPort, protocol(T/U), direction(I/O), action(A/D), flowState(B/C/E), srcPackets, srcBytes, dstPackets, dstBytes`

Flow states: **B** = Begin (new flow), **C** = Continuing (flow update), **E** = End (flow terminated).

### Enabling NSG Flow Logs
```bash
# Enable NSG flow logs (version 2) with traffic analytics
az network watcher flow-log create \
  --name MyFlowLog \
  --nsg MyNSG --resource-group MyRG \
  --storage-account mystorageaccount \
  --workspace myLogAnalyticsWorkspace \
  --enabled true \
  --format JSON --log-version 2 \
  --traffic-analytics true \
  --interval 10
```

---

## AWS VPC Flow Log Fields

### Standard Fields (Version 2)
`version account-id interface-id srcaddr dstaddr srcport dstport protocol packets bytes start end action log-status`

### Extended Fields (Version 3+)
Additional fields: `vpc-id subnet-id instance-id type pkt-srcaddr pkt-dstaddr region az-id sublocation-type sublocation-id tcp-flags`

The `tcp-flags` field is critical for security analysis — values are bitmask: SYN=2, SYN-ACK=18, FIN=1, RST=4, ACK=16.

### Enabling VPC Flow Logs
```bash
# Enable VPC flow logs with all fields
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids vpc-xxx \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs \
  --log-group-name VPCFlowLogs \
  --deliver-logs-permission-arn arn:aws:iam::xxx:role/FlowLogsRole \
  --log-format '${version} ${account-id} ${interface-id} ${srcaddr} ${dstaddr} ${srcport} ${dstport} ${protocol} ${packets} ${bytes} ${start} ${end} ${action} ${log-status} ${vpc-id} ${subnet-id} ${instance-id} ${tcp-flags}'
```

---

## Security Pattern Detection

### Port Scanning Detection
**Signature**: Single source IP connecting to many destination ports on one or more targets in a short timeframe. Typically SYN-only packets (tcp-flags=2) with no established connections.

**KQL Query (Azure Log Analytics)**:
```kql
AzureNetworkAnalytics_CL
| where TimeGenerated > ago(1h)
| where FlowDirection_s == "I" and FlowStatus_s == "D"
| summarize DistinctPorts = dcount(DestPort_d), 
            DistinctTargets = dcount(DestIP_s),
            TotalFlows = count() 
  by SrcIP_s, bin(TimeGenerated, 5m)
| where DistinctPorts > 20 or (DistinctTargets > 5 and DistinctPorts > 10)
| order by DistinctPorts desc
```

**CloudWatch Insights (AWS)**:
```
fields @timestamp, srcAddr, dstAddr, dstPort, action
| filter action = "REJECT"
| stats count_distinct(dstPort) as portCount, count() as totalFlows by srcAddr, bin(5m)
| filter portCount > 20
| sort portCount desc
```

### Lateral Movement Detection
**Signature**: Internal IP communicates with many other internal IPs on SMB (445), WMI (135), WinRM (5985), or SSH (22) ports. Abnormal for non-management workloads.

**KQL Query**:
```kql
AzureNetworkAnalytics_CL
| where TimeGenerated > ago(24h)
| where FlowDirection_s == "I" and FlowStatus_s == "A"
| where DestPort_d in (445, 135, 5985, 22, 3389)
| where SrcIP_s startswith "10." and DestIP_s startswith "10."
| summarize DistinctTargets = dcount(DestIP_s), 
            Ports = make_set(DestPort_d)
  by SrcIP_s, bin(TimeGenerated, 1h)
| where DistinctTargets > 10
| order by DistinctTargets desc
```

### C2 Beaconing Detection
**Signature**: Regular, periodic connections from an internal IP to an external IP. Beacons typically have consistent interval (e.g., every 60 seconds) with small payload sizes (< 1 KB).

**KQL Query**:
```kql
AzureNetworkAnalytics_CL
| where TimeGenerated > ago(24h)
| where FlowDirection_s == "O" and FlowStatus_s == "A"
| where not(DestIP_s startswith "10." or DestIP_s startswith "172.16." or DestIP_s startswith "192.168.")
| summarize ConnectionCount = count(),
            AvgBytesPerFlow = avg(BytesSrcToDest_d),
            StdDevInterval = stdev(TimeGenerated)
  by SrcIP_s, DestIP_s, DestPort_d, bin(TimeGenerated, 1h)
| where ConnectionCount > 30 and AvgBytesPerFlow < 1000
| order by ConnectionCount desc
```

---

## Top Talkers Analysis

Identify the highest-volume sources and destinations to understand traffic patterns and detect anomalies.

**KQL Query — Top Talkers by Bytes**:
```kql
AzureNetworkAnalytics_CL
| where TimeGenerated > ago(1h)
| summarize TotalBytes = sum(BytesSrcToDest_d + BytesDestToSrc_d),
            FlowCount = count(),
            DistinctDestinations = dcount(DestIP_s)
  by SrcIP_s
| top 20 by TotalBytes desc
| extend TotalGB = round(TotalBytes / 1073741824.0, 2)
```

**CloudWatch Insights — Top Talkers**:
```
fields srcAddr, dstAddr, bytes
| stats sum(bytes) as totalBytes, count() as flowCount by srcAddr
| sort totalBytes desc
| limit 20
```

---

## Anomalous Traffic Detection

### Baseline Establishment
1. Collect 30 days of flow log data during normal operations.
2. Calculate baseline metrics per source IP: average bytes/hour, average flows/hour, typical destination set, typical port set.
3. Alert when current metrics exceed baseline by > 3 standard deviations.

### Anomaly Indicators
- **Volume spike**: Source IP sending > 3x normal bytes/hour — possible data exfiltration.
- **New destinations**: Source IP connecting to previously unseen external IPs — possible C2 or credential theft.
- **Off-hours activity**: Traffic from workloads that should be idle during non-business hours.
- **Protocol anomalies**: DNS (UDP 53) traffic to non-DNS servers, ICMP tunneling (large ICMP packets > 64 bytes).

**Analysis only — verify against vendor documentation before applying.**
