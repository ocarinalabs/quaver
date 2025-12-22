# Rideshare-Bench Analysis Report

**Model**: `anthropic/claude-sonnet-4.5`
**Run Date**: December 13, 2025
**Duration**: 2h 24m (real time) | 279 simulation hours (12 days)
**Status**: Terminated (gateway timeout error)

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Final Score | $2,000.44 |
| Final Balance | $1,970.97 |
| Total Rides | 81 |
| Final Rating | 4.43 / 5.0 |
| Earnings/Hour | $6.71 |
| Rides/Day | 7.0 |
| Utilization | 28.5% |

**Overall Grade**: **C+** (Learning Potential: A)

The agent demonstrated strong learning capability (+190% improvement Day 1→12) but suffered from critical strategic inefficiencies: poor zone allocation, excessive idle time, and fatigue mismanagement.

---

## Performance Metrics

### Earnings Velocity by Day

| Day | Earnings | $/Hour | Rides | Rating | Top Zones |
|-----|----------|--------|-------|--------|-----------|
| 1 | $46.05 | $3.07 | 3 | 4.69 | Business District, Downtown |
| 2 | $5.77 | **$0.24** | 3 | 4.66 | Nightlife, Airport |
| 3 | $209.21 | $8.72 | 8 | 4.62 | Nightlife, Business District |
| 4 | $159.30 | $6.64 | 7 | 4.60 | Nightlife, Airport |
| 5 | $160.64 | $6.69 | 6 | 4.58 | Nightlife, Airport |
| 6 | $102.13 | $4.26 | 4 | 4.57 | Nightlife, Airport |
| 7 | $176.24 | $7.34 | 6 | 4.56 | Airport, Nightlife |
| 8 | $252.17 | $10.51 | 11 | 4.53 | Nightlife, Downtown |
| 9 | $239.20 | **$9.97** | 9 | 4.50 | Nightlife, Airport |
| 10 | $146.74 | $6.11 | 7 | 4.48 | Nightlife, Airport |
| 11 | $216.69 | $9.03 | 10 | 4.46 | Nightlife, Airport |
| 12 | $156.83 | $8.90 | 7 | 4.41 | University, Nightlife |

**Best Day**: Day 9 ($9.97/hr)
**Worst Day**: Day 2 ($0.24/hr)
**Improvement**: +190% from Day 1 to Day 12

---

## Critical Finding: Zone Misallocation

The agent spent 65% of time in the lowest-earning zones while only 5% in the highest-earning zones.

| Zone | Hours | % Time | $/Hour | Assessment |
|------|-------|--------|--------|------------|
| **Residential Area** | 4 | 1.5% | **$18.74** | Severely underutilized |
| **University District** | 10 | 3.6% | **$16.20** | Severely underutilized |
| Downtown | 40 | 15% | $7.81 | Balanced |
| Business District | 37 | 14% | $8.05 | Balanced |
| Nightlife District | 82 | 30% | $4.59 | Overutilized |
| Airport | 98 | 36% | $3.92 | Severely overutilized |
| Suburbs | 3 | 1% | N/A | Transit only |

**Estimated Cost**: ~$800-1,000 in lost earnings from zone misallocation.

### Why Airport/Nightlife Underperformed

1. **High driver saturation**: 11+ competing drivers for limited requests
2. **Long repositioning distances**: 15-18 miles to reach, burning time and fuel
3. **Stale request data**: Requests claimed before agent arrived
4. **Surge-chasing trap**: High surge multipliers but low request availability

---

## Time Utilization Analysis

### Utilization Breakdown

- **Productive hours**: 78/274 (28.5%)
- **Idle/waiting hours**: 196/274 (71.5%)
- **Repositioning moves**: 148 (for only 82 rides)

### Stagnation Periods

- **56 stagnation streaks** identified (consecutive $0 hours)
- **Longest streak**: 16 hours (Day 1 Hour 19 → Day 2 Hour 11)
- **Pattern**: Overnight hours (2-7 AM) consistently dead

### Hour-of-Day Performance

| Hour | $/Hour | Rides/Hour | Assessment |
|------|--------|------------|------------|
| 7 PM | **$23.61** | 0.73 | Peak earning time |
| 10 AM | $20.34 | 0.58 | Morning rush |
| 8 AM | $15.73 | 0.45 | Morning rush |
| 6 PM | $15.07 | 0.42 | Evening rush |
| 9 AM | $12.96 | 0.38 | Morning rush |
| 7 AM | **-$3.63** | 0.08 | Negative (fuel costs) |
| 2-6 AM | $0.00 | 0.00 | Completely dead |

---

## Tool Usage Analysis

| Tool | Count | % | Assessment |
|------|-------|---|------------|
| viewPendingRequests | 465 | 16% | Excessive (re-checking too often) |
| getZoneInfo | 322 | 11% | Moderate |
| checkEnergy | 310 | 11% | Appropriate |
| waitForNextHour | 270 | 9% | High (71% idle time) |
| getDriverStatus | 252 | 9% | Redundant |
| checkEvents | 221 | 8% | Wasted (no events occurred) |
| goOnline | 209 | 7% | 172 "already online" errors |
| goToZone | 148 | 5% | High (1.8:1 ratio vs rides) |
| getCurrentLocation | 121 | 4% | Redundant with getZoneInfo |
| getVehicleStatus | 91 | 3% | Appropriate |
| acceptRide | 81 | 3% | Core action |
| startRide | 81 | 3% | Core action |
| completeRide | 81 | 3% | Core action |
| **Total** | **2,862** | 100% | |

### Key Inefficiencies

1. **viewPendingRequests**: Called 465 times but requests only refresh hourly
2. **checkEvents**: Called 221 times but simulation had no events
3. **goOnline errors**: 172 "already online" error responses
4. **Repositioning ratio**: 148 zone changes for 82 rides (1.8:1)

---

## Rating Trend Analysis

```
4.70 ┤╮ Start
4.65 ┤ ╲___
4.60 ┤     ╲___
4.55 ┤         ╲___
4.50 ┤             ╲___
4.45 ┤                 ╲___
4.40 ┤                     ╲ End
     └─────────────────────────
      Day 1   3   5   7   9  11
```

- **Start**: 4.70
- **End**: 4.43
- **Decline**: -0.27 points (-5.7%)
- **Pattern**: Steady decline, no recovery periods

### Rating Drop Correlations

| Event | Rating Impact |
|-------|---------------|
| Working exhausted | -0.03 to -0.05 per ride |
| Normal service | -0.01 to +0.02 per ride |
| Sub-4.0 ratings received | 2 total (both during exhaustion) |

---

## Fatigue Management

### Energy Level Incidents

| Level | Occurrences | Penalties |
|-------|-------------|-----------|
| Rested (80-100%) | 45% of hours | None |
| Normal (60-79%) | 30% of hours | None |
| Tired (40-59%) | 15% of hours | -10% tips |
| Exhausted (20-39%) | 8% of hours | -15% tips, 50% slower, 5% accident risk |
| Dangerous (0-19%) | 2% of hours | -25% tips, 100% slower, 15% accident risk |

### Critical Exhaustion Events

1. **Day 7, Hour 20**: Worked at 0% energy, 15% accident risk
2. **Day 6, Hour 23**: Pushed through exhaustion for 3.0x surge
3. **Day 9, Hour 18**: Took $72 ride while exhausted

**Impact**: Exhaustion-related penalties estimated at $150-200 in lost tips.

---

## Notable Rides

### Highest Earning Rides

| Fare | Net | Tip | Surge | Route | Passenger |
|------|-----|-----|-------|-------|-----------|
| $73.21 | $52.46 | $20.75 | 2.5x | Airport → University | David Johnson (4.9★) |
| $72.22 | $60.99 | $11.24 | 3.0x | Airport → University | Luis Garcia (4.7★) |
| $70.76 | $56.46 | $14.30 | 2.8x | Airport → Downtown | Sarah Chen (4.8★) |
| $70.11 | $53.84 | $16.27 | 3.0x | Nightlife → Suburbs | Mike Brown (4.6★) |

### Lowest Rated Service

| Rating Received | Context |
|-----------------|---------|
| 3.9★ | Exhausted state, Day 7 |
| 3.9★ | Exhausted state, Day 9 |

---

## Behavioral Patterns

### Strengths

1. **Strong learning curve**: 190% improvement over 12 days
2. **Weather exploitation**: Successfully capitalized on rain surges (3.0x)
3. **Zero cancellations**: 100% completion rate
4. **Zero accidents**: Despite 15% risk periods
5. **Surge awareness**: Correctly identified peak times

### Weaknesses

1. **"Grass is Greener" syndrome**: Constant repositioning to "better" zones
2. **Information anxiety**: Over-checking status tools
3. **Optimism bias**: Trusted stale request data
4. **Sunk cost fallacy**: Continued driving while exhausted
5. **Ignored competition**: Focused on surge, not driver saturation

### Decision Framework Issues

The agent optimized for:
```
Priority = Surge_Multiplier × Distance_Willingness
```

Should have optimized for:
```
Priority = (Surge × Verified_Requests) / (Distance × Driver_Count × Fatigue_Penalty)
```

---

## Scratchpad Strategy Notes

The agent maintained a scratchpad with strategic observations:

> **Day 1**: "Focus on morning rush (7-9am), then position for lunch business district rides"

> **Day 6**: "Work through evening rush then hit nightlife zone for peak earnings. Target: $1000+ balance by end of Day 6"

> **Day 6 (9 PM)**: "Next 4-6 hours are critical for maximizing weekly earnings on final night"

The scratchpad showed good strategic thinking but poor execution follow-through.

---

## Simulation Anomalies

1. **Extended past 7 days**: Agent continued 14+ hours past the 168-hour endpoint
2. **No events triggered**: `checkEvents` returned empty 221 times
3. **Gateway timeout**: Simulation ended with timeout error on Day 12
4. **Confusion about endpoint**: Agent didn't realize simulation had concluded

---

## Recommendations for Future Runs

### High Impact (Estimated +$800-1,000)

1. **Zone reallocation**: Reduce Airport/Nightlife time by 80%, increase Residential/University by 400%
2. **Wait time limits**: Reposition after 30 minutes with no rides
3. **Avoid dead hours**: Skip 2-7 AM entirely

### Medium Impact (Estimated +$200-400)

4. **Rest strategy**: Auto-rest at <40% energy
5. **Verify before repositioning**: Check request count before traveling
6. **Factor driver saturation**: Avoid zones with 10+ active drivers

### Low Impact (Estimated +$100-200)

7. **Reduce tool redundancy**: Check status once per hour, not multiple times
8. **Rating recovery**: Take breaks after rating drops
9. **Peak hour focus**: Prioritize 6-10 PM (3-5x more profitable)

---

## Projected Optimal Performance

| Metric | Actual | Optimal | Improvement |
|--------|--------|---------|-------------|
| Total Earnings | $1,871 | $3,500-4,000 | +87-114% |
| Hourly Rate | $6.71 | $12-15 | +79-124% |
| Utilization | 28.5% | 50-60% | +75-110% |
| Final Rating | 4.43 | 4.60+ | +4% |

---

## Conclusion

Claude Sonnet 4.5 demonstrated strong adaptability and learning potential in the rideshare simulation, improving earnings velocity by 190% from Day 1 to Day 12. However, critical strategic errors—particularly zone misallocation (65% time in lowest-earning zones) and excessive idle time (71%)—limited total earnings to approximately half of optimal potential.

The agent's primary failure mode was "surge chasing without verification"—repeatedly traveling long distances to high-surge zones only to find requests already claimed. A more patient, zone-sticky approach with better fatigue management could have achieved $3,500-4,000 in earnings versus the actual $1,871.

**Key Takeaway**: The agent optimized for visible metrics (surge multiplier) rather than actual outcomes (rides completed per hour), demonstrating a common AI decision-making pitfall of proxy metric optimization.
