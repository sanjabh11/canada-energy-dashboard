/**
 * Help content: Security
 *
 * Split from src/lib/helpContent.ts (F-11 / CODE-4 god-object refactor).
 * Entries are verbatim slices of the original HELP_CONTENT_DATABASE.
 */
import type { HelpContentItem } from './types';

export const SECURITY_CONTENT: Record<string, HelpContentItem> = {
  // ========================================
  // Security Dashboard Topics
  // ========================================

  'security.overview': {
    id: 'security.overview',
    title: 'Energy Infrastructure Cybersecurity',
    shortText: "Protecting Canada's energy systems from cyber and physical threats",
    difficulty: 'advanced',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Cybersecurity for Critical Energy Infrastructure</h3>
      <p class="mb-4">Energy infrastructure is a prime target for cyberattacks due to its critical importance and increasing digital connectivity. Canadian grid operators face threats from nation-state actors, ransomware groups, insider threats, and coordinated physical attacks. A successful attack could cause widespread blackouts, economic damage, and threaten public safety.</p>

      <h4 class="font-semibold mt-4 mb-2">Canadian Energy Sector Threat Landscape (2024):</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead class="bg-slate-100">
          <tr>
            <th class="border px-3 py-2 text-left">Threat Category</th>
            <th class="border px-3 py-2 text-left">Frequency</th>
            <th class="border px-3 py-2 text-left">Impact</th>
            <th class="border px-3 py-2 text-left">Examples</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-3 py-2"><strong>Ransomware</strong></td>
            <td class="border px-3 py-2">High (weekly attempts)</td>
            <td class="border px-3 py-2">Medium-High</td>
            <td class="border px-3 py-2">Colonial Pipeline (US 2021), Hydro-Québec attempted breach (2022)</td>
          </tr>
          <tr>
            <td class="border px-3 py-2"><strong>Nation-State APT</strong></td>
            <td class="border px-3 py-2">Medium (monthly)</td>
            <td class="border px-3 py-2">Critical</td>
            <td class="border px-3 py-2">Dragonfly/Energetic Bear, Sandworm (Ukraine 2015/2016)</td>
          </tr>
          <tr>
            <td class="border px-3 py-2"><strong>Insider Threat</strong></td>
            <td class="border px-3 py-2">Low (quarterly)</td>
            <td class="border px-3 py-2">High</td>
            <td class="border px-3 py-2">Credential theft, sabotage, data exfiltration</td>
          </tr>
          <tr>
            <td class="border px-3 py-2"><strong>Physical Attack</strong></td>
            <td class="border px-3 py-2">Low-Medium (yearly)</td>
            <td class="border px-3 py-2">High-Critical</td>
            <td class="border px-3 py-2">BC Hydro substation vandalism (2023), Duke Energy NC (2022)</td>
          </tr>
          <tr>
            <td class="border px-3 py-2"><strong>Supply Chain</strong></td>
            <td class="border px-3 py-2">Medium (monthly)</td>
            <td class="border px-3 py-2">Medium-Critical</td>
            <td class="border px-3 py-2">Backdoored equipment, compromised software updates</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">Key Vulnerabilities in Energy Systems:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>SCADA/ICS Networks:</strong> Supervisory Control and Data Acquisition systems often run legacy software with known vulnerabilities. Many systems designed before cybersecurity was a priority.</li>
        <li><strong>Remote Access Points:</strong> VPN connections for field technicians, vendor remote support create attack surface if not properly secured (multi-factor authentication, least privilege).</li>
        <li><strong>Grid Interconnections:</strong> Cross-border ties to US grid (Ontario-MISO, BC-Bonneville) create interdependencies. Compromise in neighboring jurisdiction could cascade.</li>
        <li><strong>Third-Party Vendors:</strong> Equipment manufacturers, maintenance contractors, software providers. Target for supply chain attacks (e.g., SolarWinds-style).</li>
        <li><strong>Human Factor:</strong> Phishing emails, social engineering, weak passwords. 85% of breaches involve human element (Verizon DBIR 2024).</li>
      </ul>

      <div class="bg-red-50 border-l-4 border-red-500 p-4 my-4">
        <p class="font-semibold text-red-900">Real Incident: 2023 IESO Phishing Campaign</p>
        <p class="text-red-800 mt-2">May 2023 spear-phishing targeted IESO employees with fake "grid emergency" emails. 3 employees clicked malicious link → credential harvesting attempt. Blocked by 2FA + rapid IR response. No systems compromised, but highlighted insider risk. Result: mandatory security training + simulated phishing campaigns quarterly.</p>
      </div>

      <h4 class="font-semibold mt-4 mb-2">Canadian Regulatory Framework:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>NERC CIP Standards:</strong> Critical Infrastructure Protection (CIP-002 through CIP-014) mandatory for bulk electric system operators. Covers access control, incident response, recovery planning.</li>
        <li><strong>CSE Guidelines:</strong> Canadian Centre for Cyber Security publishes sector-specific guidance (ITSE.00.103 for energy).</li>
        <li><strong>Bill C-26:</strong> 2024 Critical Cyber Systems Protection Act strengthens federal oversight of energy, telecom, finance, transport sectors.</li>
      </ul>
    `,
    relatedTopics: ['security.threats', 'security.incidents', 'security.mitigation'],
  },

  'security.threats': {
    id: 'security.threats',
    title: 'Threat Modeling & Risk Assessment',
    shortText: 'Identifying and analyzing attack vectors, likelihood, and potential impact',
    difficulty: 'advanced',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Threat Modeling for Energy Infrastructure</h3>
      <p class="mb-4">Threat modeling identifies potential attack scenarios, assesses their likelihood and impact, and prioritizes defenses. For energy systems, threat models consider cyber attacks (malware, data breaches), physical attacks (sabotage, terrorism), natural disasters, and supply chain compromises.</p>

      <h4 class="font-semibold mt-4 mb-2">Risk Assessment Matrix:</h4>
      <p class="mb-2">Risk Score = Likelihood (0-1) × Impact (0-1). Prioritize threats with Risk Score &gt; 0.4 for immediate action.</p>
      <table class="min-w-full border text-sm mb-4">
        <thead class="bg-slate-100">
          <tr>
            <th class="border px-3 py-2 text-left">Threat Scenario</th>
            <th class="border px-3 py-2 text-left">Likelihood</th>
            <th class="border px-3 py-2 text-left">Impact</th>
            <th class="border px-3 py-2 text-left">Risk Score</th>
            <th class="border px-3 py-2 text-left">Priority</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-3 py-2">Ransomware on corporate IT (email, billing)</td>
            <td class="border px-3 py-2">0.8</td>
            <td class="border px-3 py-2">0.4</td>
            <td class="border px-3 py-2 font-semibold">0.32</td>
            <td class="border px-3 py-2"><span class="text-yellow-600 font-medium">Medium</span></td>
          </tr>
          <tr>
            <td class="border px-3 py-2">SCADA malware (BlackEnergy-style grid control)</td>
            <td class="border px-3 py-2">0.2</td>
            <td class="border px-3 py-2">0.95</td>
            <td class="border px-3 py-2 font-semibold">0.19</td>
            <td class="border px-3 py-2"><span class="text-orange-600 font-medium">High</span></td>
          </tr>
          <tr>
            <td class="border px-3 py-2">Coordinated substation physical attack</td>
            <td class="border px-3 py-2">0.1</td>
            <td class="border px-3 py-2">0.85</td>
            <td class="border px-3 py-2 font-semibold">0.085</td>
            <td class="border px-3 py-2"><span class="text-blue-600 font-medium">Low-Med</span></td>
          </tr>
          <tr>
            <td class="border px-3 py-2">Supply chain backdoor (Chinese equipment concern)</td>
            <td class="border px-3 py-2">0.3</td>
            <td class="border px-3 py-2">0.75</td>
            <td class="border px-3 py-2 font-semibold">0.225</td>
            <td class="border px-3 py-2"><span class="text-orange-600 font-medium">High</span></td>
          </tr>
          <tr>
            <td class="border px-3 py-2">Insider sabotage (disgruntled employee)</td>
            <td class="border px-3 py-2">0.15</td>
            <td class="border px-3 py-2">0.7</td>
            <td class="border px-3 py-2 font-semibold">0.105</td>
            <td class="border px-3 py-2"><span class="text-blue-600 font-medium">Low-Med</span></td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">Common Attack Vectors:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Phishing/Spear-Phishing:</strong> Targeted emails to employees with malicious links/attachments. Goal: credential theft, malware deployment. Defense: email filtering, user training, 2FA.</li>
        <li><strong>Remote Access Exploitation:</strong> VPN vulnerabilities, weak credentials, MFA bypass. Recent examples: Pulse Secure CVE-2021-22893, Fortinet CVE-2022-40684.</li>
        <li><strong>Zero-Day Exploits:</strong> Previously unknown vulnerabilities in SCADA software, network equipment. Hard to defend against but rare (nation-state level).</li>
        <li><strong>Denial of Service (DoS):</strong> Overwhelm systems with traffic, crash critical applications. DDoS attacks on utility websites common but low impact on operations.</li>
        <li><strong>Physical Intrusion:</strong> Fence cutting, lock tampering to access substations. Install malware via USB, sabotage equipment. Detection: perimeter alarms, cameras, patrols.</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Threat Intelligence Sharing:</strong> Canadian Electricity Association (CEA) runs Cyber Security Collaborative (CSC) for utilities to share threat intel, incident reports, best practices. Participation: 50+ Canadian utilities covering 95% of load.</p>
      </div>
    `,
    relatedTopics: ['security.overview', 'security.incidents', 'security.mitigation'],
  },

  'security.incidents': {
    id: 'security.incidents',
    title: 'Incident Detection & Response',
    shortText: 'Monitoring for security events and executing rapid response procedures',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Security Incident Management</h3>
      <p class="mb-4">Incident response follows a structured lifecycle: Detection → Analysis → Containment → Eradication → Recovery → Lessons Learned. Speed is critical - average time to detect breach is 207 days globally, but energy sector targets &lt;24 hours due to operational impact.</p>

      <h4 class="font-semibold mt-4 mb-2">Incident Severity Classification:</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead class="bg-slate-100">
          <tr>
            <th class="border px-3 py-2 text-left">Severity</th>
            <th class="border px-3 py-2 text-left">Definition</th>
            <th class="border px-3 py-2 text-left">Response Time</th>
            <th class="border px-3 py-2 text-left">Examples</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-3 py-2"><strong class="text-red-600">Critical</strong></td>
            <td class="border px-3 py-2">Operational impact, grid stability threatened</td>
            <td class="border px-3 py-2">&lt;15 min</td>
            <td class="border px-3 py-2">SCADA compromise, control system malware, coordinated attack</td>
          </tr>
          <tr>
            <td class="border px-3 py-2"><strong class="text-orange-600">High</strong></td>
            <td class="border px-3 py-2">Potential operational impact, data breach</td>
            <td class="border px-3 py-2">&lt;1 hour</td>
            <td class="border px-3 py-2">Failed login attempts to SCADA, ransomware detected, insider threat</td>
          </tr>
          <tr>
            <td class="border px-3 py-2"><strong class="text-yellow-600">Medium</strong></td>
            <td class="border px-3 py-2">IT systems affected, no operational impact</td>
            <td class="border px-3 py-2">&lt;4 hours</td>
            <td class="border px-3 py-2">Corporate network breach, phishing campaign, DDoS on website</td>
          </tr>
          <tr>
            <td class="border px-3 py-2"><strong class="text-blue-600">Low</strong></td>
            <td class="border px-3 py-2">Security policy violation, no systems affected</td>
            <td class="border px-3 py-2">&lt;24 hours</td>
            <td class="border px-3 py-2">Unauthorized USB device, policy violation, suspicious email</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">Detection Methods:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>SIEM (Security Information and Event Management):</strong> Aggregates logs from firewalls, IDS/IPS, endpoints. Correlates events to detect attack patterns. Common platforms: Splunk, QRadar, LogRhythm.</li>
        <li><strong>Intrusion Detection Systems (IDS):</strong> Network-based (NIDS) monitors traffic for signatures. Host-based (HIDS) monitors system calls, file changes.</li>
        <li><strong>Anomaly Detection:</strong> ML models learn normal behavior, flag deviations. E.g., unusual login times, unexpected SCADA commands, abnormal data exfiltration.</li>
        <li><strong>Threat Hunting:</strong> Proactive search for indicators of compromise (IOCs). Security analysts manually investigate suspicious activity before alerts fire.</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Response Procedures (Critical Incident):</h4>
      <ol class="list-decimal pl-5 space-y-1 mb-4">
        <li><strong>Alert (0-5 min):</strong> SIEM fires alert → Security Operations Center (SOC) analyst triages → Escalates to Incident Commander</li>
        <li><strong>Containment (5-15 min):</strong> Isolate affected systems (network segmentation, disable accounts), preserve forensic evidence</li>
        <li><strong>Analysis (15-60 min):</strong> Determine attack vector, scope of compromise, root cause. Forensic imaging of affected systems</li>
        <li><strong>Eradication (1-6 hours):</strong> Remove malware, patch vulnerabilities, reset credentials, restore from clean backups</li>
        <li><strong>Recovery (6-24 hours):</strong> Gradually restore systems, monitor for reinfection, validate operational integrity</li>
        <li><strong>Post-Incident (1-7 days):</strong> Document timeline, identify gaps, update procedures, notify regulators (NERC within 1 hour for CIP violations)</li>
      </ol>

      <div class="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Drill Exercises:</strong> IESO conducts quarterly cybersecurity drills (tabletop exercises, red team/blue team). 2023 GridEx VI (North American exercise) simulated coordinated nation-state attack. Participation: 500+ organizations, 8,000+ participants.</p>
      </div>
    `,
    relatedTopics: ['security.overview', 'security.threats', 'security.mitigation'],
  },

  'security.mitigation': {
    id: 'security.mitigation',
    title: 'Mitigation Strategies & Implementation',
    shortText: 'Defensive measures, security controls, and risk reduction techniques',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Security Mitigation & Defense-in-Depth</h3>
      <p class="mb-4">Defense-in-depth uses multiple layers of security controls so that if one layer fails, others still provide protection. For energy infrastructure, this spans physical security (fences, guards), network security (firewalls, segmentation), endpoint security (antivirus, EDR), and human security (training, policies).</p>

      <h4 class="font-semibold mt-4 mb-2">Key Mitigation Strategies (Prioritized):</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead class="bg-slate-100">
          <tr>
            <th class="border px-3 py-2 text-left">Strategy</th>
            <th class="border px-3 py-2 text-left">Effectiveness</th>
            <th class="border px-3 py-2 text-left">Cost</th>
            <th class="border px-3 py-2 text-left">Timeline</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-3 py-2"><strong>Network Segmentation</strong> (IT/OT air gap)</td>
            <td class="border px-3 py-2">90%</td>
            <td class="border px-3 py-2">$500k-2M</td>
            <td class="border px-3 py-2">6-12 months</td>
          </tr>
          <tr>
            <td class="border px-3 py-2"><strong>Multi-Factor Authentication</strong> (all access)</td>
            <td class="border px-3 py-2">85%</td>
            <td class="border px-3 py-2">$50k-200k</td>
            <td class="border px-3 py-2">2-4 months</td>
          </tr>
          <tr>
            <td class="border px-3 py-2"><strong>Security Awareness Training</strong> (quarterly)</td>
            <td class="border px-3 py-2">70%</td>
            <td class="border px-3 py-2">$30k-100k/yr</td>
            <td class="border px-3 py-2">Ongoing</td>
          </tr>
          <tr>
            <td class="border px-3 py-2"><strong>Endpoint Detection & Response</strong> (EDR)</td>
            <td class="border px-3 py-2">80%</td>
            <td class="border px-3 py-2">$200k-500k/yr</td>
            <td class="border px-3 py-2">3-6 months</td>
          </tr>
          <tr>
            <td class="border px-3 py-2"><strong>Vulnerability Scanning & Patching</strong></td>
            <td class="border px-3 py-2">75%</td>
            <td class="border px-3 py-2">$100k-300k/yr</td>
            <td class="border px-3 py-2">Ongoing</td>
          </tr>
          <tr>
            <td class="border px-3 py-2"><strong>Physical Security Upgrades</strong> (cameras, alarms)</td>
            <td class="border px-3 py-2">65%</td>
            <td class="border px-3 py-2">$300k-1M</td>
            <td class="border px-3 py-2">4-8 months</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">NERC CIP Compliance Requirements:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>CIP-002:</strong> Categorize critical cyber assets based on impact to bulk electric system</li>
        <li><strong>CIP-005:</strong> Electronic security perimeters, access control, monitoring</li>
        <li><strong>CIP-007:</strong> System security management (patch management, malware prevention, port/service security)</li>
        <li><strong>CIP-008:</strong> Incident response plans with quarterly drills, 1-hour reporting for critical incidents</li>
        <li><strong>CIP-010:</strong> Configuration change management, vulnerability assessments</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Implementation Status Tracking:</h4>
      <p class="mb-2">Typical utility cybersecurity program maturity:</p>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Planned (20%):</strong> Strategy approved, budget allocated, not yet started</li>
        <li><strong>In Progress (35%):</strong> Active implementation, partial deployment, piloting</li>
        <li><strong>Implemented (30%):</strong> Fully deployed, operational, not yet validated</li>
        <li><strong>Effective (15%):</strong> Proven through testing/audits, continuous improvement</li>
      </ul>

      <div class="bg-purple-50 border-l-4 border-purple-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Hydro-Québec Case Study:</strong> $150M cybersecurity investment (2020-2024): network segmentation of 12 control centers, EDR on 45,000 endpoints, SOC expansion from 8 to 35 analysts. Result: Mean time to detect dropped from 45 days → 6 hours. Zero successful breaches 2022-2024.</p>
      </div>
    `,
    relatedTopics: ['security.overview', 'security.threats', 'security.incidents'],
  },
};
