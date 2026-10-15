import React, { useState, useEffect, useRef } from 'react';

// API base URL configuration
const API_BASE = '/api';

// Pre-populated Enterprise Knowledge Base Articles
const KNOWLEDGE_ARTICLES = [
  {
    id: 1,
    title: 'How to reset GlobalProtect VPN token',
    category: 'network',
    readTime: '3 min read',
    summary: 'Fix connection timeouts and re-synchronize MFA token for Palo Alto GlobalProtect.',
    steps: [
      'Open GlobalProtect from the macOS menu bar and click the gear icon (Settings).',
      'Select the "General" tab and click "Sign Out" to clear the stale session credentials.',
      'Open Terminal and flush DNS cache: sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder',
      'Sign back in using your corporate Okta credentials and approve the push notification on your phone.',
      'Confirm connection status changes to "Connected" with IP range 10.240.x.x.'
    ],
    defaultPriority: 'medium'
  },
  {
    id: 2,
    title: 'Requesting Figma enterprise workspace license',
    category: 'software',
    readTime: '2 min read',
    summary: 'Self-service provisioning workflow for Design System & Product Figma seats.',
    steps: [
      'Navigate to Okta dashboard at https://enterprise.okta.com.',
      'Click "Add Apps" in the top right corner and search for "Figma Enterprise".',
      'Select "Request App" and enter your department budget code (e.g., DEPT-ENG-402).',
      'Manager approval is auto-routed via Slack bot within 2 business hours.',
      'Once approved, refresh Figma desktop app and toggle organization to Enterprise.'
    ],
    defaultPriority: 'low'
  },
  {
    id: 3,
    title: 'Troubleshoot DisplayPort MST hub daisy chaining',
    category: 'hardware',
    readTime: '4 min read',
    summary: 'Resolve flickering, missing second display, or resolution caps on Thunderbolt docks.',
    steps: [
      'Ensure the USB-C / Thunderbolt 4 cable is connected to the primary 100W PD port on the dock.',
      'Note: macOS does not support DisplayPort MST daisy chaining natively; dual displays require a Thunderbolt 3/4 dock or two direct connections.',
      'In System Settings > Displays, hold Option key and click "Detect Displays".',
      'Disconnect power to the dock for 15 seconds to reset the display controller firmware.',
      'Reconnect displays one by one and configure refresh rate to 60Hz.'
    ],
    defaultPriority: 'medium'
  },
  {
    id: 4,
    title: 'Okta Verify & WebAuthn Security Key registration',
    category: 'account-access',
    readTime: '3 min read',
    summary: 'Pair a replacement YubiKey or migrate authentication to a new smartphone.',
    steps: [
      'Sign in to Okta using temporary backup SMS code or IT Emergency Bypass code.',
      'Go to Account Settings > Security Methods > Add Phone / Security Key.',
      'Insert your YubiKey 5C NFC and tap the gold contact sensor when prompted.',
      'Name your key (e.g. "Work YubiKey 5C") and set as primary factor.',
      'Test in an incognito window to verify passwordless FastPass authentication.'
    ],
    defaultPriority: 'high'
  },
  {
    id: 5,
    title: 'MacBook Pro Apple Silicon Homebrew & Git SSH keys',
    category: 'software',
    readTime: '5 min read',
    summary: 'Standard development environment initialization for engineering workstations.',
    steps: [
      'Install Xcode Command Line Tools: xcode-select --install',
      'Install Homebrew: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"',
      'Generate ed25519 SSH key: ssh-keygen -t ed25519 -C "your_email@company.com"',
      'Add key to ssh-agent: ssh-add --apple-use-keychain ~/.ssh/id_ed25519',
      'Copy public key: pbcopy < ~/.ssh/id_ed25519.pub and paste into GitHub Enterprise settings.'
    ],
    defaultPriority: 'low'
  },
  {
    id: 6,
    title: 'Corporate 802.1X Wi-Fi Certificate Renewal',
    category: 'network',
    readTime: '3 min read',
    summary: 'Resolve "Wi-Fi Authentication Failed" after enterprise CA certificate rotation.',
    steps: [
      'Open System Settings > Wi-Fi > Details for "Enterprise-Corp".',
      'Click "Forget This Network" to remove expired EAP-TLS profile.',
      'Open Self-Service.app and search for "Install 802.1X Root Certificates".',
      'Click "Run Policy" to install the 2026-2028 CA cert into System Keychain.',
      'Reconnect to "Enterprise-Corp" and trust the new certificate profile.'
    ],
    defaultPriority: 'high'
  }
];

// Employee Assigned Hardware Devices
const USER_DEVICES = [
  {
    id: 'dev-1',
    name: 'Apple MacBook Pro 16" (M3 Max)',
    type: 'Primary Laptop',
    assetTag: 'ASSET-NYC-9081',
    serial: 'C02G901QMD6R',
    os: 'macOS Sonoma 14.6',
    status: 'Compliant',
    health: {
      filevault: 'Encrypted (AES-256)',
      edr: 'CrowdStrike Falcon 7.15 Active',
      mdm: 'Jamf Pro Enrolled',
      batteryHealth: '98% (Normal)'
    }
  },
  {
    id: 'dev-2',
    name: 'YubiKey 5C NFC Security Key',
    type: 'Hardware Authenticator',
    assetTag: 'ASSET-YUBI-4421',
    serial: 'YK-19044218',
    os: 'Firmware 5.4.3',
    status: 'Active',
    health: {
      fido2: 'WebAuthn Registered',
      pin: 'Configured',
      slot1: 'Yubico OTP Active'
    }
  },
  {
    id: 'dev-3',
    name: 'Dell UltraSharp U2723QE 4K USB-C Hub Display',
    type: 'Desk Peripheral',
    assetTag: 'ASSET-MON-1102',
    serial: 'CN-0K7V90-74445',
    os: 'Firmware M3T104',
    status: 'Desk 4B Assigned',
    health: {
      resolution: '3840 x 2160 @ 60Hz',
      powerDelivery: '90W Active'
    }
  }
];

export default function App() {
  // Current user & authentication state
  const [currentUser, setCurrentUser] = useState(null);
  const [authToken, setAuthToken] = useState(localStorage.getItem('hd360_token') || null);
  const [authLoading, setAuthLoading] = useState(true);

  // Active view: 'employee' or 'technician'
  const [activeRole, setActiveRole] = useState('employee');

  // Tickets & data
  const [tickets, setTickets] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [stats, setStats] = useState({
    open_issues: 0,
    urgent_requests: 0,
    active_technicians: 0,
    total_technicians: 0,
    completed_work: 0,
    total_tickets: 0
  });
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [techFilter, setTechFilter] = useState('ALL');
  const [myTicketsOnly, setMyTicketsOnly] = useState(false);

  // View mode simulation (Live list vs Empty preview)
  const [viewMode, setViewMode] = useState('live'); // 'live' or 'empty'

  // Pending changes for technician inline editing
  const [pendingChanges, setPendingChanges] = useState({}); // { [ticketId]: { status?, assigned_to? } }
  const [selectedTicketIds, setSelectedTicketIds] = useState([]);

  // Ticket Activity Side Panel state
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [activityTicket, setActivityTicket] = useState(null);
  const [activityHistory, setActivityHistory] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityNoteText, setActivityNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Modal detail & quick reply (General inspection modal)
  const [activeModalTicket, setActiveModalTicket] = useState(null);
  const [ticketHistory, setTicketHistory] = useState([]);
  const [modalReplyText, setModalReplyText] = useState('');

  // Interactive Support & Diagnostics Modals State
  const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState(false);
  const [isMyDevicesOpen, setIsMyDevicesOpen] = useState(false);
  const [isSelfHelpOpen, setIsSelfHelpOpen] = useState(false);
  const [knowledgeSearch, setKnowledgeSearch] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [expandedTrackingTicketId, setExpandedTrackingTicketId] = useState(null);
  const [selfHelpChecklist, setSelfHelpChecklist] = useState({
    cable: false,
    network: false,
    auth: false,
    reboot: false
  });

  // Know Me User Guide Modal State
  const [isKnowMeOpen, setIsKnowMeOpen] = useState(false);
  const [knowMeTab, setKnowMeTab] = useState('employee'); // 'employee' | 'technician' | 'auditor'

  // Theme State: 'dark' | 'light' | 'contrast'
  const [theme, setTheme] = useState(() => localStorage.getItem('hd360_theme') || 'dark');

  // Interactive Demo Simulation Mode State
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [demoIsRunning, setDemoIsRunning] = useState(false);
  const demoIntervalRef = useRef(null);

  // Sync theme changes to document root dataset and localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hd360_theme', theme);
  }, [theme]);

  // Clean up demo timer on unmount
  useEffect(() => {
    return () => {
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    };
  }, []);

  // Demo step definitions for automated/interactive tour
  const DEMO_STEPS = [
    {
      step: 1,
      title: 'Step 1: Employee Files Urgent P1 Ticket',
      actor: 'Priya Nair (Employee)',
      role: 'employee',
      desc: 'Priya reports critical VPN tunnel failure halting access to production clusters. Form submits with immediate double-click protection.',
      actionText: 'Submit P1 Incident',
      badge: 'Submission & Idempotency'
    },
    {
      step: 2,
      title: 'Step 2: Automated Urgent SLA Triage & Auto-Pinning',
      actor: 'SLA Dispatch Engine',
      role: 'technician',
      desc: 'System detects Urgent priority. SQL query applies CASE WHEN priority = "urgent" THEN 0 ELSE 1 END, pinning ticket to row 0 with 15m timer.',
      actionText: 'Observe Priority Pinning',
      badge: 'SLA Prioritization'
    },
    {
      step: 3,
      title: 'Step 3: Technician Assignment & Status Transition',
      actor: 'Arjun Mehta (Technician)',
      role: 'technician',
      desc: 'Arjun claims the ticket. Server-side state machine validates role=technician and moves state strictly from "open" -> "in-progress".',
      actionText: 'Assign to Arjun',
      badge: 'State Machine'
    },
    {
      step: 4,
      title: 'Step 4: Live Delivery-Style Resolution Tracker in Motion',
      actor: 'Live Package Tracker',
      role: 'employee',
      desc: 'Employee portal advances shopping/courier delivery stepper to Stage 3 (In-Progress / Active Diagnostics) with live ETA.',
      actionText: 'View Delivery Tracker',
      badge: 'Real-Time Tracking'
    },
    {
      step: 5,
      title: 'Step 5: Diagnostic Fix & Quality Resolution Delivered',
      actor: 'Arjun Mehta (Technician)',
      role: 'technician',
      desc: 'Gateway pods recycled and verified. Status transitions to "resolved". status_history audit row logged with timestamp.',
      actionText: 'Resolve Incident',
      badge: 'Audit Trail'
    },
    {
      step: 6,
      title: 'Step 6: Real-Time Dashboard KPI Recalculation',
      actor: 'SQLite3 Storage (helpdesk.db)',
      role: 'technician',
      desc: 'Dashboard runs 4 direct raw SQL aggregate queries: Open Issues decreases, Completed Work increases. 100% query traceability.',
      actionText: 'Recalculate SQL KPIs',
      badge: 'SQL Traceability'
    }
  ];

  // Ticket creation form state
  const [createForm, setCreateForm] = useState({
    title: '',
    category: '',
    priority: 'low',
    description: '',
    attachmentsCount: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast feedback state
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const toastTimeoutRef = useRef(null);

  // Show Toast helper
  const showToast = (message, type = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ visible: true, message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast({ visible: false, message: '', type: 'success' });
    }, 4000);
  };

  // Login handler
  const login = async (username, password = 'password123') => {
    setAuthLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      setAuthToken(data.token);
      setCurrentUser(data.user);
      localStorage.setItem('hd360_token', data.token);
      setActiveRole(data.user.role);
      setPendingChanges({});
      setSelectedTicketIds([]);
      showToast(`Logged in as ${data.user.name} (${data.user.role})`);
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  // Initial Auth on Mount
  useEffect(() => {
    login('priya.nair', 'password123');
  }, []);

  // Fetch Tickets based on role and filters
  const fetchTickets = async () => {
    if (!authToken) return;
    setLoadingTickets(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL' && statusFilter !== 'Status: All') {
        params.append('status', statusFilter);
      }
      if (priorityFilter !== 'ALL' && priorityFilter !== 'Priority: All') {
        params.append('priority', priorityFilter);
      }
      if (categoryFilter !== 'ALL' && categoryFilter !== 'Category: All') {
        params.append('category', categoryFilter);
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      if (activeRole === 'technician') {
        if (myTicketsOnly) {
          params.append('my_tickets', 'true');
        } else if (techFilter !== 'ALL' && techFilter !== 'Technician: All Techs') {
          params.append('technician_id', techFilter);
        }
      }

      const res = await fetch(`${API_BASE}/tickets?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        setTickets(data.tickets || []);
        // If activity panel is open, update the active ticket reference
        if (activityTicket) {
          const updated = (data.tickets || []).find(t => t.id === activityTicket.id);
          if (updated) setActivityTicket(updated);
        }
      } else {
        showToast(data.error || 'Failed to fetch tickets', 'error');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTickets(false);
    }
  };

  // Fetch Dashboard Stats for Technician
  const fetchStats = async () => {
    if (!authToken || activeRole !== 'technician') return;
    try {
      const res = await fetch(`${API_BASE}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Technicians list for dropdowns
  const fetchTechnicians = async () => {
    if (!authToken || activeRole !== 'technician') return;
    try {
      const res = await fetch(`${API_BASE}/technicians`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        setTechnicians(data.technicians || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger refetch when token, role, or filters change
  useEffect(() => {
    if (authToken && currentUser) {
      fetchTickets();
      if (activeRole === 'technician') {
        fetchStats();
        fetchTechnicians();
      }
    }
  }, [authToken, currentUser, activeRole, statusFilter, priorityFilter, categoryFilter, techFilter, myTicketsOnly, searchQuery]);

  // Periodic 30s auto-refresh for Technician Queue
  useEffect(() => {
    if (activeRole !== 'technician' || !authToken) return;
    const interval = setInterval(() => {
      fetchTickets();
      fetchStats();
      if (isActivityOpen && activityTicket) {
        fetchActivityHistory(activityTicket.id);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [activeRole, authToken, isActivityOpen, activityTicket]);

  // Switch role button action
  const handleSwitchUser = (targetUsername) => {
    login(targetUsername, 'password123');
    setIsActivityOpen(false);
    setActivityTicket(null);
  };

  // Interactive Demo Simulation Step Runner
  const handleRunDemoStep = async (stepIndex) => {
    const targetStep = stepIndex !== undefined ? stepIndex : (demoStep % DEMO_STEPS.length) + 1;
    setDemoStep(targetStep);

    if (targetStep === 1) {
      if (activeRole !== 'employee') await login('priya.nair', 'password123');
      showToast('[Demo 1/6] Priya Nair submitted ticket #HD-9081 (Urgent: VPN Gateway connection failure).');
    } else if (targetStep === 2) {
      if (activeRole !== 'technician') await login('arjun.mehta', 'password123');
      showToast('[Demo 2/6] Automated SLA triage: P1 Urgent incident prioritized to top of queue (15m SLA).');
    } else if (targetStep === 3) {
      if (activeRole !== 'technician') await login('arjun.mehta', 'password123');
      showToast('[Demo 3/6] State machine transition: Ticket claimed by Arjun Mehta (open -> in-progress).');
    } else if (targetStep === 4) {
      if (activeRole !== 'employee') await login('priya.nair', 'password123');
      showToast('[Demo 4/6] Live package-style resolution tracker advanced to Stage 3 (Diagnostics In-Progress).');
    } else if (targetStep === 5) {
      if (activeRole !== 'technician') await login('arjun.mehta', 'password123');
      showToast('[Demo 5/6] Resolution delivered: Gateway pod recycled. Status updated to resolved in status_history.');
    } else if (targetStep === 6) {
      if (activeRole !== 'technician') await login('arjun.mehta', 'password123');
      fetchStats();
      showToast('[Demo 6/6] Raw SQL dashboard metrics recomputed: Completed Work +1, Open Issues -1.');
    }
  };

  const handleToggleAutoDemo = () => {
    if (demoIsRunning) {
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
      setDemoIsRunning(false);
      showToast('Simulation paused.');
    } else {
      setDemoIsRunning(true);
      showToast('Auto simulation started. Executing 6-step lifecycle...');
      demoIntervalRef.current = setInterval(() => {
        setDemoStep(prev => {
          const next = (prev % DEMO_STEPS.length) + 1;
          handleRunDemoStep(next);
          return next;
        });
      }, 3500);
    }
  };

  const handleResetDemo = () => {
    if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    setDemoIsRunning(false);
    setDemoStep(0);
    showToast('Simulation reset to initial state.');
  };

  // Submit Ticket (Employee view) with Double-Click Idempotency Defense (Part 6.6)
  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double-click execution

    if (!createForm.title.trim() || !createForm.description.trim() || !createForm.category) {
      showToast('Please complete all required fields.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: createForm.title.trim(),
          category: createForm.category.toLowerCase(),
          priority: createForm.priority.toLowerCase(),
          description: createForm.description.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ticket creation failed');

      showToast(`Ticket #${data.ticket.ticket_code} submitted successfully. SLA: 15 mins.`);
      setCreateForm({
        title: '',
        category: '',
        priority: 'low',
        description: '',
        attachmentsCount: 0
      });
      setViewMode('live');
      fetchTickets();
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stage inline changes (Technician view)
  const handleStageChange = (ticketId, field, value) => {
    setPendingChanges(prev => ({
      ...prev,
      [ticketId]: {
        ...(prev[ticketId] || {}),
        [field]: value
      }
    }));
  };

  // Apply single row updates
  const handleSaveSingleRow = async (ticketId) => {
    const changes = pendingChanges[ticketId];
    if (!changes) {
      showToast('No changes to save for this ticket.');
      return;
    }

    try {
      if (changes.status) {
        await fetch(`${API_BASE}/tickets/${ticketId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({ status: changes.status })
        });
      }
      if (changes.assigned_to !== undefined) {
        await fetch(`${API_BASE}/tickets/${ticketId}/assign`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({ assigned_to: changes.assigned_to })
        });
      }

      showToast(`Ticket #${ticketId} updated successfully.`);
      setPendingChanges(prev => {
        const next = { ...prev };
        delete next[ticketId];
        return next;
      });
      fetchTickets();
      fetchStats();
      if (activityTicket && activityTicket.id === ticketId) {
        fetchActivityHistory(ticketId);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to update ticket.', 'error');
    }
  };

  // Batch Apply All Pending Changes
  const handleApplyBatchUpdates = async () => {
    const updates = Object.keys(pendingChanges).map(id => ({
      id: parseInt(id, 10),
      ...pendingChanges[id]
    }));

    if (updates.length === 0) {
      showToast('No pending changes to apply.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/tickets/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ updates })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Batch commit failed');

      showToast(`Batch updates committed successfully: ${data.count} tickets updated.`);
      setPendingChanges({});
      fetchTickets();
      fetchStats();
      if (activityTicket) {
        fetchActivityHistory(activityTicket.id);
      }
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    }
  };

  // Fetch Activity History from status_history table
  const fetchActivityHistory = async (ticketId) => {
    if (!authToken || !ticketId) return;
    setActivityLoading(true);
    try {
      const res = await fetch(`${API_BASE}/tickets/${ticketId}/history`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        setActivityHistory(data.history || []);
      } else {
        showToast(data.error || 'Failed to query ticket activity history', 'error');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActivityLoading(false);
    }
  };

  // Open Ticket Activity Side Panel
  const openActivityPanel = (ticket) => {
    setActivityTicket(ticket);
    setIsActivityOpen(true);
    fetchActivityHistory(ticket.id);
  };

  // Close Ticket Activity Side Panel
  const closeActivityPanel = () => {
    setIsActivityOpen(false);
  };

  // Post Activity Note directly to status_history
  const handlePostActivityNote = async (e) => {
    e?.preventDefault();
    if (!activityNoteText.trim() || !activityTicket) return;

    setIsSubmittingNote(true);
    try {
      const res = await fetch(`${API_BASE}/tickets/${activityTicket.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ note: activityNoteText.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post note');

      showToast('Activity note logged to status_history audit trail.');
      setActivityNoteText('');
      setActivityHistory(data.history || []);
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Change status directly from Ticket Activity side panel
  const handleQuickStatusChange = async (newStatus) => {
    if (!activityTicket) return;
    try {
      const res = await fetch(`${API_BASE}/tickets/${activityTicket.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Ticket status updated to ${newStatus}.`);
      setActivityTicket(data.ticket);
      fetchTickets();
      fetchStats();
      fetchActivityHistory(activityTicket.id);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Quick fill asset tag in employee form
  const handleQuickFillAsset = () => {
    const tag = 'Asset: ASSET-NYC-9081 (MacBook Pro 16 M3 Max)\n';
    if (!createForm.description.includes('ASSET-NYC-9081')) {
      setCreateForm(prev => ({
        ...prev,
        description: tag + prev.description
      }));
      showToast('Asset tag added to ticket description.');
    }
  };

  // Copy Ticket ID
  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text);
    showToast(`Copied ${text} to clipboard`);
  };

  // Open ticket details modal
  const openTicketModal = async (ticket) => {
    setActiveModalTicket(ticket);
    try {
      const res = await fetch(`${API_BASE}/tickets/${ticket.id}/history`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        setTicketHistory(data.history || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Close ticket modal
  const closeTicketModal = () => {
    setActiveModalTicket(null);
    setTicketHistory([]);
    setModalReplyText('');
  };

  // Post modal reply / note
  const postModalReply = () => {
    if (!modalReplyText.trim()) return;
    showToast('Your note has been posted to the ticket thread.');
    setModalReplyText('');
    closeTicketModal();
  };

  // Export CSV for Technician
  const handleExportCSV = () => {
    if (tickets.length === 0) {
      showToast('No tickets to export.');
      return;
    }
    const headers = ['Ticket ID', 'Title', 'Category', 'Priority', 'Status', 'Reporter', 'Assignee', 'Created At'];
    const rows = tickets.map(t => [
      `"${t.ticket_code}"`,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${t.category}"`,
      `"${t.priority}"`,
      `"${t.status}"`,
      `"${t.reporter_name || ''}"`,
      `"${t.assignee_name || 'Unassigned'}"`,
      `"${t.created_at}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `helpdesk360_tickets_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('CSV export downloaded successfully.');
  };

  // Bulk Status Update state & handler
  const [bulkAssignTarget, setBulkAssignTarget] = useState('');

  // Bulk update status for multiple selected tickets
  const handleBulkStatusUpdate = async (targetStatus) => {
    if (selectedTicketIds.length === 0) {
      showToast('Select at least one ticket using the checkboxes.', 'error');
      return;
    }

    const updates = selectedTicketIds.map(id => ({
      id,
      status: targetStatus
    }));

    try {
      const res = await fetch(`${API_BASE}/tickets/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ updates })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk status update failed');

      showToast(`Updated status to "${targetStatus}" for ${selectedTicketIds.length} tickets.`);
      setSelectedTicketIds([]);
      fetchTickets();
      fetchStats();
      if (activityTicket && selectedTicketIds.includes(activityTicket.id)) {
        fetchActivityHistory(activityTicket.id);
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to update tickets', 'error');
    }
  };

  // Bulk assign selected tickets to chosen technician
  const handleBulkAssignTarget = async () => {
    if (selectedTicketIds.length === 0) {
      showToast('Select at least one ticket to assign.', 'error');
      return;
    }
    const techId = bulkAssignTarget === 'unassigned'
      ? null
      : bulkAssignTarget
      ? parseInt(bulkAssignTarget, 10)
      : currentUser?.id;

    const updates = selectedTicketIds.map(id => ({
      id,
      assigned_to: techId
    }));

    try {
      const res = await fetch(`${API_BASE}/tickets/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ updates })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const targetTech = technicians.find(t => t.id === techId);
      const techName = techId ? (targetTech?.name || currentUser?.name || 'Technician') : 'Unassigned';
      showToast(`Assigned ${selectedTicketIds.length} tickets to ${techName}.`);
      setSelectedTicketIds([]);
      fetchTickets();
      fetchStats();
      if (activityTicket && selectedTicketIds.includes(activityTicket.id)) {
        fetchActivityHistory(activityTicket.id);
      }
    } catch (err) {
      showToast('Bulk assignment failed', 'error');
    }
  };

  // Bulk assign shortcut
  const handleBulkAssign = async () => {
    await handleBulkAssignTarget();
  };

  // Select all checkbox ref for indeterminate state
  const selectAllRef = useRef(null);

  // Sync indeterminate state on table header select-all checkbox
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedTicketIds.length > 0 && selectedTicketIds.length < tickets.length;
    }
  }, [selectedTicketIds, tickets]);

  // Keyboard shortcut: Esc to clear multi-selection
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedTicketIds.length > 0) {
        setSelectedTicketIds([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTicketIds]);

  // Toggle select all checkboxes
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedTicketIds(tickets.map(t => t.id));
    } else {
      setSelectedTicketIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedTicketIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Relative time helper
  const getRelativeTime = (isoString) => {
    if (!isoString) return 'Just now';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  // Format date helper
  const formatDate = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' at ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Helper for status badge styling
  const renderStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'open') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-label-sm text-label-sm font-medium bg-primary-fixed text-on-primary-fixed">
          <span className="w-2 h-2 rounded-full bg-primary"></span>
          Open
        </span>
      );
    }
    if (s === 'in-progress') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-label-sm text-label-sm font-medium bg-secondary-fixed text-on-secondary-fixed">
          <span className="w-2 h-2 rounded-full bg-secondary"></span>
          In-Progress
        </span>
      );
    }
    if (s === 'resolved') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-sm text-label-sm font-medium bg-tertiary-fixed text-on-tertiary-fixed">
          <span className="material-symbols-outlined text-[14px] text-tertiary">check</span>
          Resolved
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-label-sm text-label-sm font-medium bg-surface-container text-outline">
        Closed
      </span>
    );
  };

  // Pending changes count
  const pendingCount = Object.keys(pendingChanges).length;

  // Active tickets for employee
  const employeeActiveTickets = tickets.filter(t => t.status === 'open' || t.status === 'in-progress');
  const employeeResolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');

  return (
    <div className="bg-surface font-body-md text-body-md text-on-surface antialiased min-h-screen flex flex-col">
      {/* =========================================================================
          ROLE SWITCHER & LIVE AUTHENTICATION BAR (TOP SYSTEM HEADER)
         ========================================================================= */}
      <div className="w-full bg-[#0b1c30] text-[#eaf1ff] text-xs py-2 px-4 shadow-sm z-50 flex flex-wrap items-center justify-between gap-3 border-b border-[#213145]">
        <div className="flex items-center gap-2">
          <span className="font-semibold tracking-wide uppercase text-[10px] px-2 py-0.5 rounded bg-primary-container text-white">
            HelpDesk 360 RBAC
          </span>
          <span className="text-gray-300">
            Active Session: <strong className="text-white">{currentUser?.name || 'Loading...'}</strong> ({currentUser?.role})
          </span>
          <span className="hidden sm:inline text-gray-500">|</span>
          <span className="hidden sm:inline text-gray-400">Database: <code className="text-tertiary-fixed">helpdesk.db (SQLite3)</code></span>
        </div>

        {/* Quick User Switcher, Know Me & Theme Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Know Me Guide Button */}
          <button
            onClick={() => setIsKnowMeOpen(true)}
            className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ring-1 ring-emerald-400/40"
            title="Open HelpDesk 360 User & System Guide"
          >
            <span className="material-symbols-outlined text-[15px]">help_center</span>
            <span>Know Me</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping"></span>
          </button>

          {/* Live vs Demo Mode Toggle */}
          <div className="flex items-center rounded-lg bg-[#142338] p-0.5 border border-[#213145]">
            <button
              onClick={() => {
                setIsDemoMode(false);
                if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
                setDemoIsRunning(false);
                showToast('Switched to Live Production Mode (real SQLite database).');
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                !isDemoMode ? 'bg-primary text-white shadow-xs' : 'text-gray-400 hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Live Mode
            </button>
            <button
              onClick={() => {
                setIsDemoMode(true);
                showToast('Switched to Demo Simulation Mode: interactive step-by-step walkthrough.');
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                isDemoMode ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' : 'text-gray-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[13px]">play_circle</span>
              Demo Mode
            </button>
          </div>

          {/* Theme Selector (Light, Dark, High-Contrast) */}
          <div className="flex items-center rounded-lg bg-[#142338] p-0.5 border border-[#213145]" title="Switch Theme">
            <button
              onClick={() => {
                setTheme('light');
                showToast('Switched to Light Theme.');
              }}
              className={`p-1 rounded text-[11px] transition-all cursor-pointer ${
                theme === 'light' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-gray-400 hover:text-white'
              }`}
              title="Light Theme"
            >
              <span className="material-symbols-outlined text-[14px]">light_mode</span>
            </button>
            <button
              onClick={() => {
                setTheme('dark');
                showToast('Switched to Dark Theme.');
              }}
              className={`p-1 rounded text-[11px] transition-all cursor-pointer ${
                theme === 'dark' ? 'bg-slate-800 text-cyan-300 shadow-xs font-bold' : 'text-gray-400 hover:text-white'
              }`}
              title="Dark Theme"
            >
              <span className="material-symbols-outlined text-[14px]">dark_mode</span>
            </button>
            <button
              onClick={() => {
                setTheme('contrast');
                showToast('Switched to High-Contrast Theme.');
              }}
              className={`p-1 rounded text-[11px] transition-all cursor-pointer ${
                theme === 'contrast' ? 'bg-yellow-400 text-black font-bold shadow-xs' : 'text-gray-400 hover:text-white'
              }`}
              title="High-Contrast Theme"
            >
              <span className="material-symbols-outlined text-[14px]">contrast</span>
            </button>
          </div>

          <span className="text-gray-400 text-[11px] hidden md:inline ml-1">Switch User:</span>
          <button
            onClick={() => handleSwitchUser('priya.nair')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              currentUser?.username === 'priya.nair'
                ? 'bg-primary text-white ring-1 ring-white/30'
                : 'bg-[#213145] text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
            title="Login as Priya Nair (Employee)"
          >
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            Priya (Employee)
          </button>
          <button
            onClick={() => handleSwitchUser('arjun.mehta')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              currentUser?.username === 'arjun.mehta'
                ? 'bg-secondary text-white ring-1 ring-white/30'
                : 'bg-[#213145] text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
            title="Login as Arjun Mehta (Technician)"
          >
            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            Arjun (Technician)
          </button>
        </div>
      </div>


      {/* =========================================================================
          MAIN FIXED HEADER (SHARED BRAND BAR)
         ========================================================================= */}
      <header className="sticky top-0 left-0 right-0 w-full z-40 bg-surface-container-lowest/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-20 w-full px-gutter max-w-[1440px] mx-auto flex items-center justify-between gap-gutter">
          {/* Brand Logo & System Status */}
          <div className="flex items-center gap-space-lg shrink-0">
            <div className="flex items-center gap-space-sm cursor-pointer" onClick={() => fetchTickets()}>
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm font-bold text-lg">
                <span className="material-symbols-outlined text-[24px]">support_agent</span>
              </div>
              <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight font-bold">
                HelpDesk 360
              </span>
            </div>

            <div className="hidden xl:flex items-center gap-space-xs px-space-sm py-space-xs rounded-full bg-surface-container-low">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary-container opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                All IT Systems Operational
              </span>
            </div>
          </div>

          {/* Search Bar in Header */}
          <div className="flex-1 max-w-lg hidden md:block">
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-space-md text-outline pointer-events-none text-[20px]">
                search
              </span>
              <input
                className="w-full h-10 pl-10 pr-space-md bg-surface-container-low rounded-xl text-on-surface placeholder:text-outline text-body-sm font-body-sm transition-all focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none"
                placeholder={activeRole === 'employee' ? "Search knowledge base, assets, or reported issues..." : "Search ticket #ID, reporter, keywords..."}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 text-outline hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Profile & Notifications */}
          <div className="flex items-center gap-space-md shrink-0">
            {activeRole === 'technician' && (
              <button
                onClick={() => {
                  if (!isActivityOpen) {
                    const target = activityTicket || tickets[0];
                    if (target) openActivityPanel(target);
                    else showToast('No ticket available to show activity.');
                  } else {
                    setIsActivityOpen(false);
                  }
                }}
                className={`relative px-3 py-1.5 rounded-xl font-label-md text-label-md flex items-center gap-1.5 transition-all shadow-xs ${
                  isActivityOpen
                    ? 'bg-primary text-white'
                    : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                }`}
                title="Toggle Ticket Activity Panel"
              >
                <span className="material-symbols-outlined text-[18px]">history</span>
                <span className="hidden sm:inline">Ticket Activity</span>
              </button>
            )}

            <button
              onClick={() => showToast('No unread enterprise alerts.')}
              className="relative p-space-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-xl transition-colors"
              title="Notifications"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
            </button>

            <div className="flex items-center gap-space-sm pl-space-xs">
              <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('') : 'U'}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="font-label-md text-label-md text-on-surface leading-none font-semibold">
                  {currentUser?.name || 'Guest User'}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant leading-none mt-1">
                  {currentUser?.department || (activeRole === 'employee' ? 'DevOps Engineering' : 'Tier 2 Support')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sub-navigation bar */}
        <div className="w-full bg-surface-container-lowest/60 border-t border-surface-container">
          <div className="w-full px-gutter max-w-[1440px] mx-auto flex items-center justify-between">
            <nav className="flex items-center gap-space-xs py-space-xs overflow-x-auto">
              <button
                className={`px-space-md py-space-xs rounded-xl font-label-md text-label-md transition-all ${
                  activeRole === 'employee'
                    ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
                onClick={() => {
                  if (activeRole !== 'employee') handleSwitchUser('priya.nair');
                }}
              >
                Employee Portal
              </button>
              <button
                className={`px-space-md py-space-xs rounded-xl font-label-md text-label-md transition-all ${
                  activeRole === 'technician'
                    ? 'bg-secondary text-white font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
                onClick={() => {
                  if (activeRole !== 'technician') handleSwitchUser('arjun.mehta');
                }}
              >
                Technician Queue
              </button>
              <span className="text-outline-variant px-1 hidden md:inline">|</span>
              <button
                className="px-space-md py-space-xs rounded-xl font-label-md text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all hidden md:flex items-center gap-1.5 cursor-pointer"
                onClick={() => setIsKnowledgeBaseOpen(true)}
              >
                <span className="material-symbols-outlined text-[16px]">menu_book</span>
                <span>Knowledge Base</span>
              </button>
              <button
                className="px-space-md py-space-xs rounded-xl font-label-md text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all hidden lg:flex items-center gap-1.5 cursor-pointer"
                onClick={() => setIsMyDevicesOpen(true)}
              >
                <span className="material-symbols-outlined text-[16px]">devices</span>
                <span>My Devices</span>
              </button>
            </nav>

            <div className="hidden md:flex items-center gap-space-sm py-1">
              {activeRole === 'employee' ? (
                <button
                  onClick={() => {
                    document.getElementById('ticket-title')?.focus();
                  }}
                  className="inline-flex items-center justify-center px-space-md py-space-xs bg-primary text-on-primary rounded-xl font-label-md text-label-md hover:bg-primary-container transition-colors shadow-sm gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  New Ticket
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">SLA Queue:</span>
                  <span className="px-2 py-0.5 rounded-full bg-error-container text-error font-semibold text-xs">
                    {stats.urgent_requests} Urgent
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* =========================================================================
          MAIN APPLICATION CANVAS (EMPLOYEE VIEW VS TECHNICIAN VIEW)
         ========================================================================= */}
      <main className="w-full bg-surface flex-1 relative">
        {activeRole === 'employee' ? (
          /* =========================================================================
             VIEW 1: EMPLOYEE IT SUPPORT CENTER
             ========================================================================= */
          <div className="max-w-[1440px] mx-auto px-gutter py-space-lg">
            <div className="flex flex-col w-full">
              {/* Page Header & Metrics Section */}
              <section className="flex flex-col gap-space-md mb-space-xl">
                {/* Breadcrumb & Control Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
                  <nav aria-label="Breadcrumb" className="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm">
                    <span className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer" onClick={() => fetchTickets()}>
                      <span className="material-symbols-outlined text-[16px]">home</span>
                      Home
                    </span>
                    <span className="text-outline">/</span>
                    <span className="hover:text-primary transition-colors">IT Support</span>
                    <span className="text-outline">/</span>
                    <span aria-current="page" className="text-on-surface font-semibold">My Requests</span>
                  </nav>

                  {/* View Switcher: Live List vs Empty State Preview */}
                  <div className="inline-flex items-center p-1 bg-surface-container rounded-xl self-start sm:self-auto shadow-xs">
                    <button
                      className={`px-space-md py-1 rounded-lg font-label-sm text-label-sm transition-all flex items-center gap-1.5 ${
                        viewMode === 'live'
                          ? 'text-on-primary bg-primary shadow-sm font-semibold'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                      onClick={() => setViewMode('live')}
                    >
                      <span className="material-symbols-outlined text-[16px]">confirmation_number</span>
                      My Tickets ({employeeActiveTickets.length} active)
                    </button>
                    <button
                      className={`px-space-md py-1 rounded-lg font-label-sm text-label-sm transition-all flex items-center gap-1.5 ${
                        viewMode === 'empty'
                          ? 'text-on-primary bg-primary shadow-sm font-semibold'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                      onClick={() => setViewMode('empty')}
                    >
                      <span className="material-symbols-outlined text-[16px]">inbox</span>
                      Preview Empty State
                    </button>
                  </div>
                </div>

                {/* Title & Subtitle Banner */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pb-space-sm">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-space-xs text-primary font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                      <span className="material-symbols-outlined text-[18px]">verified_user</span>
                      Enterprise Workplace IT Desk
                    </div>
                    <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-bold">
                      Employee IT Support Center
                    </h1>
                    <p className="font-body-lg text-body-lg text-on-surface-variant max-w-3xl">
                      Submit new requests and track the resolution of your existing tickets in real-time with automated SLA dispatch.
                    </p>
                  </div>
                  <div className="flex items-center gap-space-sm shrink-0">
                    <a
                      className="inline-flex items-center gap-space-xs px-space-md py-space-sm bg-error-container text-on-error-container rounded-xl font-label-md text-label-md hover:opacity-95 transition-all shadow-sm"
                      href="tel:4357"
                      onClick={(e) => { e.preventDefault(); showToast('Emergency IT Line connected: Dial Ext 4357 on IP Phone'); }}
                    >
                      <span className="material-symbols-outlined text-error text-[18px] animate-pulse">phone_in_talk</span>
                      Emergency Hotline: <span className="font-bold underline">Ext 4357 (HELP)</span>
                    </a>
                  </div>
                </div>

                {/* Metric Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
                  {/* Card 1 */}
                  <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex items-center justify-between transition-all hover:shadow-md">
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Active Requests</span>
                      <span className="font-headline-lg text-headline-lg text-on-surface mt-1 font-bold">
                        {employeeActiveTickets.length} <span className="font-label-sm text-label-sm font-normal text-on-surface-variant">open</span>
                      </span>
                      <span className="font-label-sm text-label-sm text-primary flex items-center gap-0.5 mt-1 font-medium">
                        <span className="material-symbols-outlined text-[14px]">bolt</span> {tickets.filter(t => t.status === 'in-progress').length} under review
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[26px]">receipt_long</span>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex items-center justify-between transition-all hover:shadow-md">
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Avg First Response</span>
                      <span className="font-headline-lg text-headline-lg text-tertiary mt-1 font-bold">
                        18<span className="text-headline-sm font-normal text-on-surface-variant">m</span>
                      </span>
                      <span className="font-label-sm text-label-sm text-tertiary flex items-center gap-0.5 mt-1 font-medium">
                        <span className="material-symbols-outlined text-[14px]">trending_down</span> 4m faster than target
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-tertiary-fixed/30 flex items-center justify-center text-tertiary">
                      <span className="material-symbols-outlined text-[26px]">timer</span>
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex items-center justify-between transition-all hover:shadow-md">
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Resolved Tickets</span>
                      <span className="font-headline-lg text-headline-lg text-on-surface mt-1 font-bold">
                        {employeeResolvedTickets.length} <span className="font-label-sm text-label-sm font-normal text-on-surface-variant">tickets</span>
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-0.5 mt-1">
                        <span className="material-symbols-outlined text-[14px] text-tertiary">thumb_up</span> 100% CSAT rating
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined text-[26px]">task_alt</span>
                    </div>
                  </div>

                  {/* Card 4 */}
                  <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex items-center justify-between transition-all hover:shadow-md">
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">SLA Compliance</span>
                      <span className="font-headline-lg text-headline-lg text-on-surface mt-1 font-bold">99.4%</span>
                      <span className="font-label-sm text-label-sm text-primary flex items-center gap-0.5 mt-1 font-medium">
                        <span className="material-symbols-outlined text-[14px]">format_image_left</span> Tier 1 Tier 2 Online
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-primary-container">
                      <span className="material-symbols-outlined text-[26px]">speed</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Main 12-Column Responsive Bento Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
                {/* LEFT COLUMN: Submit an IT Request (5 columns on large screen) */}
                <div className="lg:col-span-5 flex flex-col gap-space-lg">
                  <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg relative overflow-hidden">
                    {/* Accent top bar decoration */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-primary-container to-secondary"></div>

                    {/* Form Header */}
                    <div className="flex items-center gap-space-sm mb-space-md">
                      <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary shrink-0">
                        <span className="material-symbols-outlined text-[22px]">add_circle</span>
                      </div>
                      <div className="flex flex-col">
                        <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                          Create New Support Ticket
                        </h2>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          Direct routing to DevOps, Security, and Workplace Ops
                        </p>
                      </div>
                    </div>

                    {/* Submission Form */}
                    <form className="flex flex-col gap-space-md" onSubmit={handleTicketSubmit}>
                      {/* Title Input */}
                      <div className="flex flex-col gap-1.5">
                        <label className="font-label-md text-label-md text-on-surface flex items-center justify-between" htmlFor="ticket-title">
                          <span>Issue Summary <span className="text-error">*</span></span>
                          <span className="font-label-sm text-label-sm text-outline">{80 - createForm.title.length} chars left</span>
                        </label>
                        <input
                          className="w-full h-10 px-space-sm bg-surface-container-lowest border border-outline-variant rounded-xl font-body-md text-body-md text-on-surface placeholder:text-outline transition-all focus:bg-surface-container-low focus:ring-2 focus:ring-primary focus:outline-none"
                          id="ticket-title"
                          maxLength={80}
                          placeholder="e.g., MacBook Pro external display flickering via USB-C"
                          required
                          type="text"
                          value={createForm.title}
                          onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                        />
                      </div>

                      {/* Two-Column Fields: Category & Priority */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                        {/* Category Dropdown */}
                        <div className="flex flex-col gap-1.5">
                          <label className="font-label-md text-label-md text-on-surface" htmlFor="ticket-category">
                            Category <span className="text-error">*</span>
                          </label>
                          <div className="relative">
                            <select
                              className="w-full h-10 pl-space-sm pr-8 bg-surface-container-lowest border border-outline-variant rounded-xl font-body-md text-body-md text-on-surface appearance-none focus:bg-surface-container-low focus:ring-2 focus:ring-primary focus:outline-none"
                              id="ticket-category"
                              required
                              value={createForm.category}
                              onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                            >
                              <option disabled value="">Select category...</option>
                              <option value="hardware">💻 Hardware (Laptops, Monitors)</option>
                              <option value="network">🌐 Network (VPN, Wi-Fi, DNS)</option>
                              <option value="software">📦 Software (SaaS Tools, OS, Licenses)</option>
                              <option value="account-access">🔑 Account & Access (SSO, 2FA, IAM)</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-2.5 top-2.5 pointer-events-none text-outline text-[18px]">
                              expand_more
                            </span>
                          </div>
                        </div>

                        {/* Priority Dropdown */}
                        <div className="flex flex-col gap-1.5">
                          <label className="font-label-md text-label-md text-on-surface" htmlFor="ticket-priority">
                            Impact Level <span className="text-error">*</span>
                          </label>
                          <div className="relative">
                            <select
                              className="w-full h-10 pl-space-sm pr-8 bg-surface-container-lowest border border-outline-variant rounded-xl font-body-md text-body-md text-on-surface appearance-none focus:bg-surface-container-low focus:ring-2 focus:ring-primary focus:outline-none"
                              id="ticket-priority"
                              required
                              value={createForm.priority}
                              onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                            >
                              <option value="low">🟢 Low - Routine inquiry</option>
                              <option value="medium">🟡 Medium - Normal workflow bug</option>
                              <option value="high">🟠 High - Impaired deadline</option>
                              <option value="urgent">🔴 Urgent - Work fully halted</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-2.5 top-2.5 pointer-events-none text-outline text-[18px]">
                              expand_more
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Description Textarea */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <label className="font-label-md text-label-md text-on-surface" htmlFor="ticket-description">
                            Description & Details <span className="text-error">*</span>
                          </label>
                          <span className="font-label-sm text-label-sm text-outline flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">markdown</span> Markdown supported
                          </span>
                        </div>
                        <textarea
                          className="w-full p-space-sm bg-surface-container-lowest border border-outline-variant rounded-xl font-body-md text-body-md text-on-surface placeholder:text-outline transition-all focus:bg-surface-container-low focus:ring-2 focus:ring-primary focus:outline-none resize-y"
                          id="ticket-description"
                          placeholder="Please include error messages, steps to reproduce, or affected device asset tag (e.g. ASSET-NYC-9081)..."
                          required
                          rows={4}
                          value={createForm.description}
                          onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                        />
                        <p className="font-body-sm text-body-sm text-on-surface-variant italic">
                          Tip: If this is an OS crash, include timestamp or terminal log output.
                        </p>
                      </div>

                      {/* File Attachment Zone */}
                      <div className="flex flex-col gap-1.5">
                        <span className="font-label-md text-label-md text-on-surface">Attachments & Screenshots</span>
                        <label
                          className="group cursor-pointer p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-all flex flex-col items-center justify-center text-center relative border border-dashed border-outline-variant"
                        >
                          <input
                            className="hidden"
                            type="file"
                            multiple
                            onChange={(e) => {
                              if (e.target.files?.length) {
                                setCreateForm(prev => ({ ...prev, attachmentsCount: e.target.files.length }));
                                showToast(`Attached ${e.target.files.length} diagnostic file(s).`);
                              }
                            }}
                          />
                          <div className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center text-primary group-hover:scale-110 transition-transform mb-2 shadow-sm">
                            <span className="material-symbols-outlined text-[22px]">cloud_upload</span>
                          </div>
                          <p className="font-label-md text-label-md text-on-surface">
                            <span className="text-primary font-semibold underline">Click to upload</span> or drag and drop
                          </p>
                          <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                            PNG, JPG, PDF, or LOG up to 25MB
                          </span>
                          {createForm.attachmentsCount > 0 && (
                            <div className="mt-2 text-primary font-label-sm text-label-sm font-semibold">
                              Attached: {createForm.attachmentsCount} file(s) selected
                            </div>
                          )}
                        </label>
                      </div>

                      {/* Advisory SLA Notice */}
                      <div className="p-space-sm bg-surface-container-low rounded-xl flex items-start gap-space-xs border border-outline-variant/40">
                        <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">info</span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          Urgent tickets trigger real-time PagerDuty escalation and are triaged by on-call engineers within <strong>15 minutes</strong>.
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-space-sm pt-space-xs">
                        <button
                          className="w-full sm:w-auto px-space-md py-space-sm bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md rounded-xl transition-colors text-center order-2 sm:order-1"
                          type="button"
                          onClick={() => showToast('Ticket progress saved as local draft.')}
                        >
                          Save as Draft
                        </button>
                        <button
                          className="w-full sm:w-auto px-space-lg py-space-sm bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md rounded-xl shadow-md transition-all flex items-center justify-center gap-2 order-1 sm:order-2 disabled:opacity-50"
                          disabled={isSubmitting}
                          type="submit"
                        >
                          <span className={`material-symbols-outlined text-[18px] ${isSubmitting ? 'animate-spin' : ''}`}>
                            {isSubmitting ? 'progress_activity' : 'send'}
                          </span>
                          <span>{isSubmitting ? 'Submitting...' : 'Submit Request'}</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Quick Self-Service Knowledge Base Widget */}
                  <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col gap-space-sm border border-outline-variant/30">
                    <div className="flex items-center justify-between">
                      <span className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-primary text-[18px]">auto_stories</span>
                        Instant Self-Help Guides
                      </span>
                      <button
                        className="font-label-sm text-label-sm text-primary hover:underline cursor-pointer"
                        onClick={() => setIsKnowledgeBaseOpen(true)}
                      >
                        All 140+ Guides
                      </button>
                    </div>
                    <div className="flex flex-col gap-space-xs">
                      <button
                        className="p-space-xs hover:bg-surface-container-lowest rounded-lg transition-colors flex items-center justify-between group text-left w-full cursor-pointer"
                        onClick={() => {
                          setSelectedArticle(0);
                          setIsKnowledgeBaseOpen(true);
                        }}
                      >
                        <span className="font-body-sm text-body-sm text-on-surface group-hover:text-primary">
                          How to reset GlobalProtect VPN token
                        </span>
                        <span className="material-symbols-outlined text-outline text-[16px]">chevron_right</span>
                      </button>
                      <button
                        className="p-space-xs hover:bg-surface-container-lowest rounded-lg transition-colors flex items-center justify-between group text-left w-full cursor-pointer"
                        onClick={() => {
                          setSelectedArticle(1);
                          setIsKnowledgeBaseOpen(true);
                        }}
                      >
                        <span className="font-body-sm text-body-sm text-on-surface group-hover:text-primary">
                          Requesting Figma enterprise workspace license
                        </span>
                        <span className="material-symbols-outlined text-outline text-[16px]">chevron_right</span>
                      </button>
                      <button
                        className="p-space-xs hover:bg-surface-container-lowest rounded-lg transition-colors flex items-center justify-between group text-left w-full cursor-pointer"
                        onClick={() => {
                          setSelectedArticle(2);
                          setIsKnowledgeBaseOpen(true);
                        }}
                      >
                        <span className="font-body-sm text-body-sm text-on-surface group-hover:text-primary">
                          Troubleshoot DisplayPort MST hub daisy chaining
                        </span>
                        <span className="material-symbols-outlined text-outline text-[16px]">chevron_right</span>
                      </button>
                      <button
                        className="p-space-xs bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-primary text-xs font-semibold mt-1 cursor-pointer"
                        onClick={() => setIsSelfHelpOpen(true)}
                      >
                        <span className="material-symbols-outlined text-[16px]">checklist</span>
                        <span>Launch Interactive Diagnostic Wizard</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: My Submitted Tickets List or Empty State */}
                <div className="lg:col-span-7 flex flex-col gap-space-md">
                  {viewMode === 'empty' || tickets.length === 0 ? (
                    /* EMPTY STATE VIEW CONTAINER */
                    <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-xl flex flex-col items-center justify-center text-center py-16">
                      <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center text-primary mb-space-md">
                        <span className="material-symbols-outlined text-[44px]">all_inbox</span>
                      </div>
                      <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1 font-semibold">
                        No open tickets submitted yet
                      </h3>
                      <p className="font-body-md text-body-md text-on-surface-variant max-w-md mb-space-lg">
                        Need assistance with software access, hardware malfunctions, or VPN connections? Fill out the form to get in touch with our enterprise IT team.
                      </p>
                      <button
                        className="inline-flex items-center gap-space-xs px-space-lg py-space-sm bg-primary text-on-primary rounded-xl font-label-md text-label-md hover:bg-primary-container transition-all shadow-sm"
                        onClick={() => {
                          setViewMode('live');
                          document.getElementById('ticket-title')?.focus();
                        }}
                      >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Submit New Ticket
                      </button>
                    </div>
                  ) : (
                    /* TABLE VIEW CONTAINER */
                    <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
                      {/* Table Control & Filter Header */}
                      <div className="p-space-md bg-surface-container-lowest flex flex-col gap-space-sm border-b border-surface-container">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
                          <div className="flex items-center gap-space-xs">
                            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                              My Submitted Tickets
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-semibold">
                              {tickets.length} Active
                            </span>
                          </div>

                          <div className="flex items-center gap-space-xs">
                            {/* Search box */}
                            <div className="relative w-full sm:w-56">
                              <span className="material-symbols-outlined absolute left-2.5 top-2 text-outline text-[18px]">
                                search
                              </span>
                              <input
                                className="w-full h-8 pl-8 pr-space-sm bg-surface-container-low rounded-lg text-body-sm font-body-sm text-on-surface placeholder:text-outline focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary focus:outline-none"
                                placeholder="Filter by keyword, #ID..."
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                              />
                            </div>
                            {/* Refresh button */}
                            <button
                              className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors shrink-0"
                              onClick={() => {
                                fetchTickets();
                                showToast('Tickets refreshed from IT Cloud Service.');
                              }}
                              title="Refresh Tickets"
                            >
                              <span className={`material-symbols-outlined text-[20px] ${loadingTickets ? 'animate-spin' : ''}`}>
                                sync
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Status Filter Pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                          {['ALL', 'Open', 'In-Progress', 'Resolved', 'Closed'].map((st) => (
                            <button
                              key={st}
                              className={`px-3 py-1 rounded-full font-label-sm text-label-sm transition-all ${
                                statusFilter === st
                                  ? 'bg-surface-container-high text-on-surface font-semibold'
                                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                              }`}
                              onClick={() => setStatusFilter(st)}
                            >
                              {st === 'ALL'
                                ? `All (${tickets.length})`
                                : `${st} (${tickets.filter(t => t.status.toLowerCase() === st.toLowerCase()).length})`}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Table View */}
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left font-body-sm text-body-sm border-collapse">
                          <thead>
                            <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                              <th className="py-space-sm px-space-md font-semibold" scope="col">Ticket ID & Title</th>
                              <th className="py-space-sm px-space-md font-semibold" scope="col">Category</th>
                              <th className="py-space-sm px-space-md font-semibold" scope="col">Priority</th>
                              <th className="py-space-sm px-space-md font-semibold" scope="col">Status</th>
                              <th className="py-space-sm px-space-md font-semibold" scope="col">Assignee</th>
                              <th className="py-space-sm px-space-md font-semibold text-right" scope="col">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-surface-container-lowest divide-y divide-surface-container">
                            {tickets.map((ticket) => (
                              <React.Fragment key={ticket.id}>
                                <tr className="ticket-row transition-colors hover:bg-surface-container-low/70">
                                <td className="py-space-md px-space-md">
                                  <div className="flex items-start gap-space-xs">
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-label-sm text-label-sm font-bold text-primary">
                                          #{ticket.ticket_code}
                                        </span>
                                        <button
                                          className="text-outline hover:text-primary transition-colors"
                                          onClick={() => copyToClipboard(`#${ticket.ticket_code}`)}
                                          title="Copy Ticket ID"
                                        >
                                          <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                        </button>
                                      </div>
                                      <span className="font-label-md text-label-md text-on-surface font-semibold mt-0.5 line-clamp-1">
                                        {ticket.title}
                                      </span>
                                      <span className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1">
                                        {ticket.description}
                                      </span>
                                      <span className="font-label-sm text-label-sm text-outline mt-1">
                                        Submitted {getRelativeTime(ticket.created_at)}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-space-md px-space-md whitespace-nowrap">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-container font-label-sm text-label-sm text-on-surface capitalize">
                                    <span className="material-symbols-outlined text-[16px] text-primary">
                                      {ticket.category === 'hardware' ? 'laptop_mac' :
                                       ticket.category === 'network' ? 'lan' :
                                       ticket.category === 'software' ? 'inventory_2' : 'badge'}
                                    </span>
                                    {ticket.category}
                                  </span>
                                </td>

                                <td className="py-space-md px-space-md whitespace-nowrap">
                                  {ticket.priority === 'urgent' ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold bg-error-container text-on-error-container">
                                      <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-error"></span>
                                      </span>
                                      Urgent
                                    </span>
                                  ) : ticket.priority === 'high' ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold bg-surface-container-highest text-primary">
                                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                      High
                                    </span>
                                  ) : ticket.priority === 'medium' ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold bg-surface-container text-on-surface-variant">
                                      <span className="w-1.5 h-1.5 rounded-full bg-outline"></span>
                                      Medium
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-medium bg-surface-container-low text-on-surface-variant">
                                      Low
                                    </span>
                                  )}
                                </td>

                                <td className="py-space-md px-space-md whitespace-nowrap">
                                  {renderStatusBadge(ticket.status)}
                                </td>

                                <td className="py-space-md px-space-md whitespace-nowrap">
                                  {ticket.assignee_name ? (
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center font-label-sm text-label-sm font-bold text-primary">
                                        {ticket.assignee_name.split(' ').map(n => n[0]).join('')}
                                      </div>
                                      <span className="font-label-sm text-label-sm text-on-surface font-medium">
                                        {ticket.assignee_name}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded font-label-sm text-label-sm text-outline italic bg-surface-container-low">
                                      Unassigned
                                    </span>
                                  )}
                                </td>

                                <td className="py-space-md px-space-md text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                                        expandedTrackingTicketId === ticket.id
                                          ? 'bg-primary text-white shadow-xs'
                                          : 'bg-primary/10 text-primary hover:bg-primary/20'
                                      }`}
                                      onClick={() => setExpandedTrackingTicketId(expandedTrackingTicketId === ticket.id ? null : ticket.id)}
                                      title="Live Delivery-Style Resolution Tracker"
                                    >
                                      <span className="material-symbols-outlined text-[15px]">local_shipping</span>
                                      <span className="hidden sm:inline">{expandedTrackingTicketId === ticket.id ? 'Hide Tracker' : 'Live Tracker'}</span>
                                    </button>
                                    <button
                                      className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
                                      onClick={() => openTicketModal(ticket)}
                                      title="View Ticket Details"
                                    >
                                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>

                              {expandedTrackingTicketId === ticket.id && (
                                <tr className="bg-primary/5 border-b-2 border-primary/20 animate-in fade-in duration-150">
                                  <td colSpan={6} className="p-space-md">
                                    <div className="bg-surface-container-lowest p-4 rounded-xl border border-primary/20 shadow-xs flex flex-col gap-3">
                                      <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div className="flex items-center gap-2">
                                          <div className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center">
                                            <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                                          </div>
                                          <div>
                                            <span className="font-bold text-xs text-on-surface">
                                              Live Resolution Tracker • Ticket #{ticket.ticket_code}
                                            </span>
                                            <span className="text-[11px] text-outline ml-2">
                                              Delivery SLA: {ticket.priority === 'urgent' ? '15 Min Express P1' : ticket.priority === 'high' ? '2 Hour Priority' : '8 Hour Standard'}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                          <span className="text-outline">Live Status:</span>
                                          {renderStatusBadge(ticket.status)}
                                        </div>
                                      </div>

                                      {/* Visual Stepper / Progress Rail */}
                                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-2">
                                        {/* Step 1: Received */}
                                        <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-low border border-outline-variant/30">
                                          <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-[12px]">check</span>
                                          </span>
                                          <div className="flex flex-col text-[11px]">
                                            <span className="font-bold text-on-surface">1. Ticket Received</span>
                                            <span className="text-outline">{getRelativeTime(ticket.created_at)}</span>
                                          </div>
                                        </div>

                                        {/* Step 2: SLA & Triage */}
                                        <div className={`flex items-center gap-2 p-2 rounded-lg border ${
                                          ticket.status !== 'open' || ticket.assigned_to
                                            ? 'bg-surface-container-low border-outline-variant/30'
                                            : 'bg-primary/10 border-primary/30 animate-pulse'
                                        }`}>
                                          <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                            ticket.status !== 'open' || ticket.assigned_to ? 'bg-emerald-500 text-white' : 'bg-primary text-white'
                                          }`}>
                                            <span className="material-symbols-outlined text-[12px]">
                                              {ticket.status !== 'open' || ticket.assigned_to ? 'check' : 'hourglass_top'}
                                            </span>
                                          </span>
                                          <div className="flex flex-col text-[11px]">
                                            <span className="font-bold text-on-surface">2. SLA Triage</span>
                                            <span className="text-outline capitalize">{ticket.priority} Queue</span>
                                          </div>
                                        </div>

                                        {/* Step 3: Assigned & In-Progress */}
                                        <div className={`flex items-center gap-2 p-2 rounded-lg border ${
                                          ticket.status === 'resolved' || ticket.status === 'closed'
                                            ? 'bg-surface-container-low border-outline-variant/30'
                                            : ticket.status === 'in-progress'
                                            ? 'bg-secondary/10 border-secondary/40 animate-pulse'
                                            : 'bg-surface-container-lowest border-outline-variant/20 opacity-60'
                                        }`}>
                                          <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                            ticket.status === 'resolved' || ticket.status === 'closed'
                                              ? 'bg-emerald-500 text-white'
                                              : ticket.status === 'in-progress'
                                              ? 'bg-secondary text-white'
                                              : 'bg-outline-variant text-white'
                                          }`}>
                                            <span className="material-symbols-outlined text-[12px]">
                                              {ticket.status === 'resolved' || ticket.status === 'closed' ? 'check' : 'engineering'}
                                            </span>
                                          </span>
                                          <div className="flex flex-col text-[11px]">
                                            <span className="font-bold text-on-surface">3. In-Progress</span>
                                            <span className="text-outline">{ticket.assignee_name || 'Assigning Tech...'}</span>
                                          </div>
                                        </div>

                                        {/* Step 4: Resolution Delivered */}
                                        <div className={`flex items-center gap-2 p-2 rounded-lg border ${
                                          ticket.status === 'resolved' || ticket.status === 'closed'
                                            ? 'bg-emerald-500/15 border-emerald-500/40'
                                            : 'bg-surface-container-lowest border-outline-variant/20 opacity-60'
                                        }`}>
                                          <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                            ticket.status === 'resolved' || ticket.status === 'closed'
                                              ? 'bg-emerald-600 text-white'
                                              : 'bg-outline-variant text-white'
                                          }`}>
                                            <span className="material-symbols-outlined text-[12px]">
                                              {ticket.status === 'resolved' || ticket.status === 'closed' ? 'verified' : 'flag'}
                                            </span>
                                          </span>
                                          <div className="flex flex-col text-[11px]">
                                            <span className="font-bold text-on-surface">4. Resolved</span>
                                            <span className="text-outline">
                                              {ticket.status === 'resolved' || ticket.status === 'closed' ? 'Remediation Verified' : 'Awaiting Delivery'}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination & Footer Stats */}
                      <div className="p-space-md bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-space-sm text-on-surface-variant font-label-sm text-label-sm">
                        <span>Showing <strong>{tickets.length}</strong> of <strong>{tickets.length}</strong> tickets</span>
                        <div className="flex items-center gap-space-xs">
                          <button className="px-2.5 py-1 rounded bg-surface-container-lowest text-outline cursor-not-allowed">
                            Previous
                          </button>
                          <span className="px-2 py-1 font-semibold text-primary">1</span>
                          <button className="px-2.5 py-1 rounded bg-surface-container-lowest text-outline cursor-not-allowed">
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Enterprise Hardware & Device Health Spotlight Bento Card */}
                  <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md flex flex-col md:flex-row items-center justify-between gap-space-md border border-surface-container">
                    <div className="flex items-center gap-space-md">
                      <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-primary shrink-0">
                        <span className="material-symbols-outlined text-[26px]">devices</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-space-xs">
                          <span className="font-label-md text-label-md font-semibold text-on-surface">
                            {currentUser?.name || "Employee"}'s Primary Device
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-semibold">
                            MDM Compliant
                          </span>
                        </div>
                        <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                          MacBook Pro 16" (M3 Max, 64GB) • Tag: <strong>ASSET-NYC-9081</strong> • FileVault Active
                        </span>
                      </div>
                    </div>
                    <button
                      className="px-space-md py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high font-label-sm text-label-sm text-primary font-semibold transition-colors shrink-0"
                      onClick={handleQuickFillAsset}
                    >
                      Auto-fill Asset Tag
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* =========================================================================
             VIEW 2: TECHNICIAN CONSOLE
             ========================================================================= */
          <div className="w-full max-w-[1440px] mx-auto px-gutter py-space-md flex flex-col gap-space-lg">
            {/* Top Technician Breadcrumb & Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
              <div className="flex flex-col gap-space-xs">
                <div className="flex items-center gap-space-xs text-outline font-label-sm text-label-sm">
                  <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => fetchTickets()}>
                    Home
                  </span>
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  <span className="hover:text-primary cursor-pointer transition-colors">Operations</span>
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  <span className="text-on-surface font-semibold">Support Queue (Technician Console)</span>
                </div>

                <div className="flex items-center gap-space-md flex-wrap">
                  <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
                    Technician Triage & Support Queue
                  </h1>
                  <div className="flex items-center gap-space-xs px-space-sm py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm shadow-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    <span>Auto-refresh: On (30s)</span>
                  </div>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Live ticket dispatch, SLA management, and real-time technician reassignment.
                </p>
              </div>

              {/* Quick Action Controls */}
              <div className="flex items-center gap-space-sm flex-wrap self-start md:self-auto">
                <div className="inline-flex rounded-xl p-1 bg-surface-container-low shadow-sm">
                  <button
                    className={`px-space-md py-1.5 rounded-lg font-label-md text-label-md font-semibold transition-all flex items-center gap-1 ${
                      viewMode === 'live'
                        ? 'bg-surface-container-lowest text-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                    onClick={() => setViewMode('live')}
                  >
                    <span className="material-symbols-outlined text-[16px]">grid_view</span>
                    Live Queue
                  </button>
                  <button
                    className={`px-space-md py-1.5 rounded-lg font-label-md text-label-md font-medium transition-all flex items-center gap-1 ${
                      viewMode === 'empty'
                        ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                    onClick={() => setViewMode('empty')}
                  >
                    <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
                    Empty State Preview
                  </button>
                </div>

                {/* Ticket Activity Panel Trigger Button */}
                <button
                  onClick={() => {
                    const target = activityTicket || tickets[0];
                    if (target) openActivityPanel(target);
                    else showToast('No ticket available for activity timeline.');
                  }}
                  className={`px-space-md py-2 rounded-xl font-label-md text-label-md shadow-sm flex items-center gap-1.5 transition-all border ${
                    isActivityOpen
                      ? 'bg-primary text-white border-primary shadow-md'
                      : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container border-outline-variant/30'
                  }`}
                  title="Open Ticket Activity side panel"
                >
                  <span className="material-symbols-outlined text-[18px]">history</span>
                  <span>Ticket Activity</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  className="px-space-md py-2 bg-surface-container-lowest text-on-surface rounded-xl font-label-md text-label-md hover:bg-surface-container shadow-sm flex items-center gap-1.5 transition-colors border border-outline-variant/30"
                >
                  <span className="material-symbols-outlined text-[18px] text-outline">file_download</span>
                  Export (CSV)
                </button>

                <button
                  onClick={handleBulkAssign}
                  className="px-space-md py-2 bg-primary text-on-primary rounded-xl font-label-md text-label-md hover:bg-primary-container shadow-sm flex items-center gap-1.5 transition-all"
                  title="Assign selected tickets to me"
                >
                  <span className="material-symbols-outlined text-[18px]">group_add</span>
                  Bulk Assign ({selectedTicketIds.length})
                </button>
              </div>
            </div>

            {/* Top Metric Bar (4 KPI Cards - Computed from direct SQL aggregate queries against SQLite3 helpdesk.db) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
              {/* Card 1: Open Issues */}
              <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between border border-surface-container">
                <div className="flex items-center justify-between">
                  <span className="font-label-md text-label-md text-on-surface-variant font-medium">Open Issues</span>
                  <div className="p-2 rounded-lg bg-surface-container-low text-primary">
                    <span className="material-symbols-outlined text-[20px]">inbox</span>
                  </div>
                </div>
                <div className="mt-space-sm flex items-baseline gap-space-sm">
                  <span className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-bold">
                    {stats.open_issues}
                  </span>
                  <span className="font-label-sm text-label-sm text-primary flex items-center font-medium">
                    <span className="material-symbols-outlined text-[14px]">trending_up</span> direct SQL
                  </span>
                </div>
                <div className="mt-space-xs flex items-center gap-1">
                  <div className="h-1.5 flex-1 rounded-full bg-surface-container overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${Math.min(100, (stats.open_issues / (stats.total_tickets || 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="text-outline font-label-sm text-[10px]">
                    Triage {Math.round((stats.open_issues / (stats.total_tickets || 1)) * 100)}%
                  </span>
                </div>
              </div>

              {/* Card 2: Urgent Requests (Alerting state) */}
              <div className="bg-error-container/40 p-space-md rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden border border-error/20">
                <div className="absolute -right-4 -bottom-4 opacity-10 text-error pointer-events-none">
                  <span className="material-symbols-outlined text-[110px]">emergency</span>
                </div>
                <div className="flex items-center justify-between z-10">
                  <span className="font-label-md text-label-md text-on-error-container font-semibold">
                    Urgent Requests
                  </span>
                  <div className="p-2 rounded-lg bg-error-container text-error flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px] animate-pulse">crisis_alert</span>
                  </div>
                </div>
                <div className="mt-space-sm flex items-baseline gap-space-sm z-10">
                  <span className="font-headline-xl text-headline-xl text-error font-bold tracking-tight">
                    {stats.urgent_requests}
                  </span>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container-lowest text-error font-label-sm text-label-sm shadow-xs font-semibold">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-error"></span>
                    </span>
                    <span>Breach SLA Risk</span>
                  </div>
                </div>
                <span className="mt-space-xs text-on-error-container font-label-sm text-[11px] font-medium z-10">
                  Requires immediate manager assignment
                </span>
              </div>

              {/* Card 3: Assigned Technicians */}
              <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between border border-surface-container">
                <div className="flex items-center justify-between">
                  <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                    Active Technicians
                  </span>
                  <div className="p-2 rounded-lg bg-surface-container-low text-tertiary">
                    <span className="material-symbols-outlined text-[20px]">engineering</span>
                  </div>
                </div>
                <div className="mt-space-sm flex items-baseline gap-space-sm">
                  <span className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-bold">
                    {stats.active_technicians}
                  </span>
                  <span className="font-label-sm text-label-sm text-tertiary flex items-center font-semibold">
                    / {stats.total_technicians || 4} on shift
                  </span>
                </div>
                <div className="mt-space-xs flex items-center justify-between text-on-surface-variant font-label-sm text-[11px]">
                  <span>Tier 1 & Tier 2</span>
                  <span className="text-tertiary font-medium">
                    {stats.total_technicians ? Math.round((stats.active_technicians / stats.total_technicians) * 100) : 78}% utilization
                  </span>
                </div>
              </div>

              {/* Card 4: Completed Work */}
              <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between border border-surface-container">
                <div className="flex items-center justify-between">
                  <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                    Resolved Today
                  </span>
                  <div className="p-2 rounded-lg bg-surface-container-low text-secondary">
                    <span className="material-symbols-outlined text-[20px]">task_alt</span>
                  </div>
                </div>
                <div className="mt-space-sm flex items-baseline gap-space-sm">
                  <span className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-bold">
                    {stats.completed_work}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center">
                    Tickets closed
                  </span>
                </div>
                <div className="mt-space-xs flex items-center gap-space-xs text-tertiary font-label-sm text-[11px] font-semibold">
                  <span className="material-symbols-outlined text-[14px]">verified</span>
                  <span>96.4% on-time SLA adherence</span>
                </div>
              </div>
            </div>

            {/* Filter & Triage Bar */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md border border-surface-container">
              {/* Search Box & Selects */}
              <div className="flex-1 flex flex-wrap items-center gap-space-sm">
                <div className="relative min-w-[260px] flex-1 sm:flex-initial">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-[18px]">
                    search
                  </span>
                  <input
                    className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-low text-body-sm font-body-sm text-on-surface placeholder:text-outline focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                    placeholder="Search ticket #ID, reporter, keywords..."
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Filter Dropdown 1: Status */}
                <div className="relative">
                  <select
                    className="h-10 pl-3 pr-8 rounded-lg bg-surface-container-low font-label-md text-label-md text-on-surface appearance-none focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer transition-all"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="ALL">Status: All</option>
                    <option value="open">Open</option>
                    <option value="in-progress">In-Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-3 text-[16px] text-outline pointer-events-none">
                    expand_more
                  </span>
                </div>

                {/* Filter Dropdown 2: Priority */}
                <div className="relative">
                  <select
                    className="h-10 pl-3 pr-8 rounded-lg bg-surface-container-low font-label-md text-label-md text-on-surface appearance-none focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer transition-all"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                  >
                    <option value="ALL">Priority: All</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-3 text-[16px] text-outline pointer-events-none">
                    expand_more
                  </span>
                </div>

                {/* Filter Dropdown 3: Category */}
                <div className="relative">
                  <select
                    className="h-10 pl-3 pr-8 rounded-lg bg-surface-container-low font-label-md text-label-md text-on-surface appearance-none focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer transition-all"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="ALL">Category: All</option>
                    <option value="software">Software</option>
                    <option value="hardware">Hardware</option>
                    <option value="network">Network</option>
                    <option value="account-access">Account-Access</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-3 text-[16px] text-outline pointer-events-none">
                    expand_more
                  </span>
                </div>

                {/* Assigned Filter */}
                <div className="relative">
                  <select
                    className="h-10 pl-3 pr-8 rounded-lg bg-surface-container-low font-label-md text-label-md text-on-surface appearance-none focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer transition-all"
                    value={techFilter}
                    onChange={(e) => setTechFilter(e.target.value)}
                  >
                    <option value="ALL">Technician: All Techs</option>
                    <option value="unassigned">Unassigned</option>
                    {technicians.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.department || 'Tech'})
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-3 text-[16px] text-outline pointer-events-none">
                    expand_more
                  </span>
                </div>

                {/* My Tickets Toggle Pill */}
                <button
                  className={`h-10 px-space-md rounded-lg font-label-md text-label-md flex items-center gap-1.5 transition-colors ${
                    myTicketsOnly
                      ? 'bg-primary text-white font-semibold'
                      : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                  }`}
                  onClick={() => setMyTicketsOnly(!myTicketsOnly)}
                >
                  <span className="material-symbols-outlined text-[16px]">person</span>
                  <span>My Tickets</span>
                </button>
              </div>

              {/* Quick Reset & Batch Commit */}
              <div className="flex items-center justify-end gap-space-sm pt-2 lg:pt-0">
                <button
                  className="h-10 px-space-sm text-on-surface-variant hover:text-on-surface font-label-md text-label-md flex items-center gap-1 transition-colors"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                    setPriorityFilter('ALL');
                    setCategoryFilter('ALL');
                    setTechFilter('ALL');
                    setMyTicketsOnly(false);
                    setPendingChanges({});
                    showToast('Filters reset.');
                  }}
                >
                  <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                  <span>Reset</span>
                </button>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded-full font-label-sm text-label-sm font-semibold transition-colors ${
                      pendingCount > 0
                        ? 'bg-secondary-fixed text-on-secondary-fixed'
                        : 'bg-surface-container text-outline'
                    }`}
                  >
                    Pending Changes ({pendingCount})
                  </span>
                  <button
                    onClick={handleApplyBatchUpdates}
                    disabled={pendingCount === 0}
                    className="h-10 px-space-md rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>Apply Updates</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Active Table Container or Empty State */}
            {viewMode === 'empty' || tickets.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-xl p-space-xl shadow-sm flex flex-col items-center justify-center text-center py-20 border border-surface-container">
                <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-outline mb-space-md">
                  <span className="material-symbols-outlined text-[36px]">filter_list_off</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  No tickets matching your filter criteria
                </h3>
                <p className="mt-space-xs text-on-surface-variant font-body-md text-body-md max-w-md">
                  There are currently no active incidents matching the selected criteria. Try adjusting your priority, assigned tech filters, or search terms.
                </p>
                <div className="mt-space-lg flex items-center gap-space-sm">
                  <button
                    className="px-space-md py-2 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors"
                    onClick={() => {
                      setStatusFilter('ALL');
                      setPriorityFilter('ALL');
                      setCategoryFilter('ALL');
                      setTechFilter('ALL');
                      setSearchQuery('');
                      setViewMode('live');
                    }}
                  >
                    Clear All Filters
                  </button>
                  <button
                    className="px-space-md py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-all"
                    onClick={() => setViewMode('live')}
                  >
                    Return to Live Queue
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-space-sm">
                {/* BULK ACTION TOOLBAR (Appears when 1 or more tickets are selected) */}
                {selectedTicketIds.length > 0 && (
                  <div className="bg-primary/10 border-2 border-primary/40 rounded-xl p-space-sm px-space-md shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-space-sm animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="flex items-center gap-space-sm flex-wrap">
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary text-white font-label-md text-label-md font-semibold shadow-xs">
                        <span className="material-symbols-outlined text-[18px]">checklist</span>
                        <span>{selectedTicketIds.length} {selectedTicketIds.length === 1 ? 'Ticket' : 'Tickets'} Selected</span>
                      </div>
                      <button
                        onClick={() => setSelectedTicketIds([])}
                        className="text-on-surface-variant hover:text-error font-label-sm text-label-sm underline flex items-center gap-0.5 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                        Deselect All
                      </button>
                    </div>

                    {/* Quick Bulk Status & Assignment Controls */}
                    <div className="flex flex-wrap items-center gap-space-sm w-full md:w-auto">
                      {/* Status quick action pill buttons */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-label-sm text-label-sm text-outline font-semibold uppercase tracking-wider text-[11px] hidden sm:inline">
                          Set Status:
                        </span>
                        <div className="inline-flex rounded-lg bg-surface-container-lowest p-1 shadow-xs border border-outline-variant/30">
                          <button
                            onClick={() => handleBulkStatusUpdate('open')}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold text-primary hover:bg-primary-fixed/40 transition-colors flex items-center gap-1"
                            title="Mark selected as Open"
                          >
                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                            Open
                          </button>
                          <button
                            onClick={() => handleBulkStatusUpdate('in-progress')}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold text-secondary hover:bg-secondary-fixed/40 transition-colors flex items-center gap-1"
                            title="Mark selected as In-Progress"
                          >
                            <span className="w-2 h-2 rounded-full bg-secondary"></span>
                            In-Progress
                          </button>
                          <button
                            onClick={() => handleBulkStatusUpdate('resolved')}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold text-tertiary hover:bg-tertiary-fixed/40 transition-colors flex items-center gap-1"
                            title="Mark selected as Resolved"
                          >
                            <span className="material-symbols-outlined text-[14px]">check</span>
                            Resolved
                          </button>
                          <button
                            onClick={() => handleBulkStatusUpdate('closed')}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors flex items-center gap-1"
                            title="Mark selected as Closed"
                          >
                            <span className="material-symbols-outlined text-[14px]">archive</span>
                            Closed
                          </button>
                        </div>
                      </div>

                      <span className="text-outline-variant hidden lg:inline">|</span>

                      {/* Bulk Assign Select & Button */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <select
                          value={bulkAssignTarget}
                          onChange={(e) => setBulkAssignTarget(e.target.value)}
                          className="h-8 pl-2 pr-6 rounded-lg bg-surface-container-lowest text-xs font-medium text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                        >
                          <option value="">Assign to: {currentUser?.name} (Me)</option>
                          <option value="unassigned">⚠️ Set to Unassigned</option>
                          {technicians.map(t => (
                            <option key={t.id} value={t.id}>
                              Assign: {t.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleBulkAssignTarget}
                          className="h-8 px-3 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-container transition-all shadow-xs flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">person_check</span>
                          <span>Assign</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col border border-surface-container">
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider select-none">
                          <th className="py-3 px-4 w-12 text-center">
                            <input
                              ref={selectAllRef}
                              type="checkbox"
                              className="rounded w-4 h-4 text-primary focus:ring-primary cursor-pointer accent-primary"
                              checked={selectedTicketIds.length === tickets.length && tickets.length > 0}
                              onChange={handleSelectAll}
                              title={selectedTicketIds.length === tickets.length ? "Deselect All Tickets" : "Select All Tickets"}
                              aria-label="Select all tickets"
                            />
                          </th>
                          <th className="py-3 px-3">Ticket ID</th>
                          <th className="py-3 px-3">Reporter & Dept</th>
                          <th className="py-3 px-4">Title & Category</th>
                          <th className="py-3 px-3">Priority</th>
                          <th className="py-3 px-3">Status</th>
                          <th className="py-3 px-3">Assignee</th>
                          <th className="py-3 px-3">Created</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-container text-body-sm font-body-sm text-on-surface">
                        {tickets.map((ticket) => {
                          const isUrgent = ticket.priority === 'urgent';
                          const isChecked = selectedTicketIds.includes(ticket.id);
                          const isPanelSelected = isActivityOpen && activityTicket?.id === ticket.id;
                          const currentStatus = pendingChanges[ticket.id]?.status || ticket.status;
                          const currentAssignee = pendingChanges[ticket.id]?.assigned_to !== undefined
                            ? pendingChanges[ticket.id]?.assigned_to
                            : (ticket.assigned_to || '');

                          return (
                            <tr
                              key={ticket.id}
                              className={`transition-colors ${
                                isChecked
                                  ? 'bg-primary-container/15 ring-1 ring-primary/40'
                                  : isPanelSelected
                                  ? 'bg-primary-fixed/30 ring-1 ring-primary/40'
                                  : isUrgent
                                  ? 'bg-error-container/20 hover:bg-error-container/30'
                                  : 'hover:bg-surface-container-low'
                              }`}
                            >
                              <td className="py-3.5 px-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleSelectOne(ticket.id)}
                                  className="rounded w-4 h-4 text-primary focus:ring-primary cursor-pointer accent-primary"
                                  aria-label={`Select ticket ${ticket.ticket_code}`}
                                />
                              </td>

                            <td className="py-3.5 px-3 whitespace-nowrap">
                              <div
                                className="flex items-center gap-1 font-label-md text-label-md font-bold cursor-pointer"
                                onClick={() => openActivityPanel(ticket)}
                              >
                                {isUrgent && (
                                  <span className="material-symbols-outlined text-[16px] text-error">push_pin</span>
                                )}
                                <span className={isUrgent ? 'text-error hover:underline' : 'text-on-surface hover:text-primary hover:underline'}>
                                  #{ticket.ticket_code}
                                </span>
                              </div>
                              {isUrgent && (
                                <span className="font-label-sm text-[10px] text-error uppercase font-bold tracking-wider">
                                  Pinned SLA
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-3 whitespace-nowrap">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-xs text-primary shrink-0">
                                  {ticket.reporter_name ? ticket.reporter_name.split(' ').map(n => n[0]).join('') : 'U'}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-label-md text-label-md font-semibold text-on-surface">
                                    {ticket.reporter_name || 'Enterprise User'}
                                  </span>
                                  <span className="text-outline font-label-sm text-[11px]">
                                    {ticket.reporter_department || 'Workplace'}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 max-w-sm">
                              <div className="flex flex-col gap-1">
                                <div
                                  className="font-label-md text-label-md font-medium text-on-surface line-clamp-1 hover:text-primary cursor-pointer"
                                  onClick={() => openActivityPanel(ticket)}
                                >
                                  {ticket.title}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-surface-container text-on-surface-variant capitalize">
                                    {ticket.category}
                                  </span>
                                  <span className="text-outline text-[11px] line-clamp-1">
                                    {ticket.description}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-3 whitespace-nowrap">
                              {isUrgent ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-sm text-label-sm font-bold bg-error-container text-error">
                                  <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping"></span>
                                  Urgent
                                </span>
                              ) : ticket.priority === 'high' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-sm text-label-sm font-semibold bg-amber-50 text-amber-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                  High
                                </span>
                              ) : ticket.priority === 'medium' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-sm text-label-sm font-semibold bg-surface-container text-on-surface-variant">
                                  <span className="w-1.5 h-1.5 rounded-full bg-outline"></span>
                                  Medium
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-sm text-label-sm font-medium bg-surface-container-low text-on-surface-variant">
                                  Low
                                </span>
                              )}
                            </td>

                            {/* INLINE STATUS SELECTOR */}
                            <td className="py-3.5 px-3 whitespace-nowrap">
                              <div className="relative inline-block">
                                <select
                                  className="h-8 pl-2 pr-7 rounded-lg bg-surface-container font-label-sm text-label-sm font-medium text-on-surface appearance-none focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer border border-outline-variant/30"
                                  value={currentStatus}
                                  onChange={(e) => handleStageChange(ticket.id, 'status', e.target.value)}
                                >
                                  <option value="open">Open</option>
                                  <option value="in-progress">In-Progress</option>
                                  <option value="resolved">Resolved</option>
                                  <option value="closed">Closed</option>
                                </select>
                                <span className="material-symbols-outlined absolute right-1.5 top-2 text-[14px] text-outline pointer-events-none">
                                  unfold_more
                                </span>
                              </div>
                            </td>

                            {/* INLINE ASSIGNEE SELECTOR */}
                            <td className="py-3.5 px-3 whitespace-nowrap">
                              <div className="relative inline-block">
                                <select
                                  className={`h-8 pl-2 pr-7 rounded-lg font-label-sm text-label-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer border ${
                                    !currentAssignee
                                      ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold'
                                      : 'bg-surface-container-low text-on-surface border-outline-variant/30'
                                  }`}
                                  value={currentAssignee}
                                  onChange={(e) => handleStageChange(ticket.id, 'assigned_to', e.target.value ? parseInt(e.target.value, 10) : null)}
                                >
                                  <option value="">⚠️ Unassigned</option>
                                  {technicians.map(t => (
                                    <option key={t.id} value={t.id}>
                                      {t.name} ({t.department || 'Tech'})
                                    </option>
                                  ))}
                                </select>
                                <span className="material-symbols-outlined absolute right-1.5 top-2 text-[14px] text-outline pointer-events-none">
                                  arrow_drop_down
                                </span>
                              </div>
                            </td>

                            <td className="py-3.5 px-3 whitespace-nowrap text-on-surface-variant font-label-sm text-label-sm">
                              {getRelativeTime(ticket.created_at)}
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap text-right">
                              <div className="inline-flex items-center gap-1.5">
                                {/* Dedicated Ticket Activity Timeline button */}
                                <button
                                  className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${
                                    isPanelSelected
                                      ? 'bg-primary text-white shadow-xs'
                                      : 'hover:bg-surface-container text-on-surface-variant hover:text-primary'
                                  }`}
                                  onClick={() => openActivityPanel(ticket)}
                                  title="View Ticket Activity Timeline"
                                >
                                  <span className="material-symbols-outlined text-[18px]">history</span>
                                </button>

                                {pendingChanges[ticket.id] ? (
                                  <button
                                    onClick={() => handleSaveSingleRow(ticket.id)}
                                    className="px-2.5 py-1 rounded-lg bg-primary text-on-primary font-label-sm text-label-sm hover:bg-primary-container transition-colors shadow-xs"
                                  >
                                    Confirm
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => openTicketModal(ticket)}
                                    className="px-2.5 py-1 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container font-label-sm text-label-sm transition-colors border border-outline-variant/30"
                                  >
                                    View
                                  </button>
                                )}

                                <button
                                  className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
                                  onClick={() => openTicketModal(ticket)}
                                  title="View Ticket details"
                                >
                                  <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Paging Footer */}
                <div className="p-space-md bg-surface-container-lowest flex flex-col sm:flex-row items-center justify-between gap-space-sm border-t border-surface-container">
                  <div className="flex items-center gap-space-md text-on-surface-variant font-label-sm text-label-sm">
                    <span>
                      Showing <strong className="text-on-surface font-semibold">{tickets.length}</strong> of{' '}
                      <strong className="text-on-surface font-semibold">{stats.total_tickets || tickets.length}</strong> tickets
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded-lg bg-surface-container-low text-outline hover:text-on-surface disabled:opacity-40 transition-colors" disabled>
                      <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                    <button className="w-8 h-8 rounded-lg bg-primary text-on-primary font-label-sm text-label-sm font-semibold">1</button>
                    <button className="p-1.5 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors" disabled>
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Operations Quick Dispatch Panel (Bento Footer / Status Insight) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md">
              {/* Fast Dispatch Queue Status */}
              <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between border border-surface-container">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">bolt</span>
                    <span className="font-label-md text-label-md font-semibold text-on-surface">Auto-Dispatch Engine</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-[11px] font-semibold">
                    Active (Smart Router)
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-sm">
                  Incoming tickets with Tier-1 hardware tags are routing automatically to London and NYC shift teams based on skill tags.
                </p>
                <div className="mt-space-md pt-space-xs flex items-center justify-between font-label-sm text-label-sm">
                  <span className="text-outline">Algorithm load balance:</span>
                  <span className="text-tertiary font-semibold">Optimal (1.2m avg assignment)</span>
                </div>
              </div>

              {/* Quick Escalation Protocol */}
              <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between border border-surface-container">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-error text-[20px]">warning</span>
                    <span className="font-label-md text-label-md font-semibold text-on-surface">P1 Emergency Escalation</span>
                  </div>
                  <span className="font-label-sm text-label-sm text-error font-medium">Duty On-Call</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-sm">
                  Enterprise ERP incidents are auto-notified to Duty Manager Elena Rostova via PagerDuty webhook.
                </p>
                <div className="mt-space-md pt-space-xs flex items-center justify-between">
                  <button
                    className="px-space-sm py-1.5 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high font-label-sm text-label-sm font-medium transition-colors"
                    onClick={() => showToast('Incident Room IR-902 activated with duty engineers on Slack #incident-p1.')}
                  >
                    Trigger Incident Room
                  </button>
                  <span className="text-outline font-label-sm text-[11px]">SLA countdown: 18m</span>
                </div>
              </div>

              {/* Shift Coverage Summary */}
              <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between border border-surface-container">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-[20px]">schedule</span>
                    <span className="font-label-md text-label-md font-semibold text-on-surface">Shift Handoff</span>
                  </div>
                  <span className="text-outline font-label-sm text-[11px]">Next: 18:00 UTC (EMEA → US-West)</span>
                </div>
                <div className="mt-space-sm flex items-center gap-3">
                  <div className="flex -space-x-2 overflow-hidden">
                    {technicians.slice(0, 4).map((tech, i) => (
                      <div
                        key={tech.id}
                        className="inline-flex h-8 w-8 rounded-full ring-2 ring-surface-container-lowest bg-primary text-white font-bold text-xs items-center justify-center"
                        title={tech.name}
                      >
                        {tech.name.split(' ').map(n => n[0]).join('')}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm font-semibold text-on-surface">
                      {technicians.length} Techs Available
                    </span>
                    <span className="text-outline font-label-sm text-[11px]">Sync notes drafted</span>
                  </div>
                </div>
                <div className="mt-space-md flex items-center justify-between">
                  <button
                    className="text-primary hover:underline font-label-sm text-label-sm font-medium flex items-center gap-1"
                    onClick={() => showToast('Shift notes loaded: Zero unresolved P1 blockers in EMEA.')}
                  >
                    Review Handoff Doc
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TICKET ACTIVITY SIDE PANEL (TECHNICIAN VIEW SLIDE-OVER DRAWER)
           ========================================================================= */}
        {activeRole === 'technician' && isActivityOpen && activityTicket && (
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-surface-container-lowest shadow-2xl border-l border-surface-container flex flex-col animate-in slide-in-from-right duration-200">
            {/* Side Panel Header */}
            <div className="p-space-md bg-surface-container-low border-b border-surface-container flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">history</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold leading-tight">
                      Ticket Activity
                    </h3>
                    <span className="font-label-sm text-label-sm font-bold text-primary">
                      #{activityTicket.ticket_code}
                    </span>
                  </div>
                  <span className="text-outline font-label-sm text-[11px]">
                    Chronological audit log from <code className="text-primary font-mono">status_history</code>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors"
                  onClick={() => {
                    fetchActivityHistory(activityTicket.id);
                    showToast('Activity timeline refreshed.');
                  }}
                  title="Refresh Timeline"
                >
                  <span className={`material-symbols-outlined text-[18px] ${activityLoading ? 'animate-spin' : ''}`}>
                    sync
                  </span>
                </button>
                <button
                  className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors"
                  onClick={closeActivityPanel}
                  title="Close Activity Panel"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Ticket Snapshot Card */}
            <div className="p-space-md bg-surface-container-lowest border-b border-surface-container flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <span className="font-label-md text-label-md font-bold text-on-surface leading-snug">
                  {activityTicket.title}
                </span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold capitalize shrink-0 ${
                  activityTicket.priority === 'urgent'
                    ? 'bg-error-container text-error'
                    : activityTicket.priority === 'high'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-surface-container text-on-surface-variant'
                }`}>
                  {activityTicket.priority}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-on-surface-variant pt-1">
                <div className="flex items-center gap-1">
                  <span className="text-outline">Status:</span>
                  {renderStatusBadge(activityTicket.status)}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-outline">Reporter:</span>
                  <span className="font-medium text-on-surface">{activityTicket.reporter_name || 'Employee'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-outline">Assignee:</span>
                  <span className="font-medium text-on-surface">{activityTicket.assignee_name || 'Unassigned'}</span>
                </div>
              </div>

              {/* Quick Status Triage Switcher inside Side Panel */}
              <div className="mt-2 pt-2 border-t border-surface-container-low flex items-center justify-between gap-2">
                <span className="font-label-sm text-label-sm text-outline font-medium">Quick Transition:</span>
                <div className="flex items-center gap-1">
                  {['open', 'in-progress', 'resolved', 'closed'].map((st) => (
                    <button
                      key={st}
                      disabled={activityTicket.status.toLowerCase() === st}
                      onClick={() => handleQuickStatusChange(st)}
                      className={`px-2 py-0.5 rounded font-label-sm text-[11px] transition-all capitalize ${
                        activityTicket.status.toLowerCase() === st
                          ? 'bg-primary text-white font-semibold cursor-default'
                          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Scrollable Timeline Section */}
            <div className="flex-1 p-space-md overflow-y-auto">
              <div className="flex items-center justify-between mb-space-md">
                <span className="font-label-sm text-label-sm text-outline font-bold uppercase tracking-wider">
                  Timeline Events ({activityHistory.length})
                </span>
                <span className="font-label-sm text-label-sm text-primary flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                  Real-time DB stream
                </span>
              </div>

              {activityLoading && activityHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-outline gap-2">
                  <span className="material-symbols-outlined text-[28px] animate-spin">progress_activity</span>
                  <span className="font-body-sm text-body-sm">Loading activity history...</span>
                </div>
              ) : activityHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-on-surface-variant gap-2">
                  <span className="material-symbols-outlined text-[36px] text-outline">history_toggle_off</span>
                  <span className="font-body-sm text-body-sm">No activity events recorded yet.</span>
                </div>
              ) : (
                /* Chronological 2px vertical guide rail timeline */
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container-high">
                  {activityHistory.map((item, index) => {
                    const isInitial = !item.old_status && item.new_status === 'open';
                    const isStatusChange = item.old_status && item.new_status !== item.old_status;
                    const isNoteOnly = item.old_status === item.new_status;

                    // Node dot styling
                    let dotColor = 'bg-primary';
                    let iconName = 'swap_horiz';

                    if (isInitial) {
                      dotColor = 'bg-primary-container';
                      iconName = 'add';
                    } else if (item.new_status === 'resolved') {
                      dotColor = 'bg-tertiary';
                      iconName = 'check_circle';
                    } else if (item.new_status === 'in-progress') {
                      dotColor = 'bg-secondary';
                      iconName = 'pending';
                    } else if (item.new_status === 'closed') {
                      dotColor = 'bg-outline';
                      iconName = 'archive';
                    } else if (isNoteOnly) {
                      dotColor = 'bg-amber-600';
                      iconName = 'chat_bubble';
                    }

                    return (
                      <div key={item.id || index} className="relative group">
                        {/* Circle Node Icon */}
                        <div
                          className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full ${dotColor} text-white flex items-center justify-center shadow-xs ring-4 ring-surface-container-lowest`}
                        >
                          <span className="material-symbols-outlined text-[12px]">{iconName}</span>
                        </div>

                        {/* Event Content Container */}
                        <div className="bg-surface-container-low/70 hover:bg-surface-container-low p-space-sm rounded-xl border border-outline-variant/30 transition-all flex flex-col gap-1.5">
                          {/* Event Header */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isInitial ? (
                                <span className="font-label-sm text-label-sm font-bold text-primary">
                                  Ticket Created
                                </span>
                              ) : isStatusChange ? (
                                <div className="flex items-center gap-1 font-label-sm text-label-sm font-semibold">
                                  <span className="text-on-surface-variant capitalize">{item.old_status}</span>
                                  <span className="material-symbols-outlined text-[14px] text-outline">arrow_forward</span>
                                  <span className="text-primary capitalize">{item.new_status}</span>
                                </div>
                              ) : (
                                <span className="font-label-sm text-label-sm font-bold text-amber-700">
                                  Activity Note Added
                                </span>
                              )}

                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-surface-container text-on-surface-variant font-medium">
                                #{item.id}
                              </span>
                            </div>

                            <span className="font-label-sm text-[11px] text-outline" title={formatDate(item.changed_at)}>
                              {getRelativeTime(item.changed_at)}
                            </span>
                          </div>

                          {/* Actor Info */}
                          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                            <span className="material-symbols-outlined text-[14px] text-outline">person</span>
                            <span className="font-semibold text-on-surface">
                              {item.changed_by_name || 'System Operator'}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-surface-container-high text-on-surface-variant capitalize">
                              {item.changed_by_role || 'staff'}
                            </span>
                          </div>

                          {/* Notes / Details */}
                          {item.notes && (
                            <p className="font-body-sm text-body-sm text-on-surface bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/20 mt-0.5 whitespace-pre-wrap">
                              {item.notes}
                            </p>
                          )}

                          {/* Timestamp details */}
                          <div className="text-[10px] text-outline font-mono pt-0.5">
                            {formatDate(item.changed_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Note Logging Form at Bottom of Side Panel */}
            <div className="p-space-md bg-surface-container-low border-t border-surface-container flex flex-col gap-2">
              <label htmlFor="side-panel-note" className="font-label-sm text-label-sm text-on-surface font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-primary">edit_note</span>
                Log Technician Note / Update
              </label>

              <div className="flex gap-2">
                <textarea
                  id="side-panel-note"
                  rows={2}
                  className="flex-1 p-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm font-body-sm text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                  placeholder="Record diagnosis, hardware serial number, or handover comment..."
                  value={activityNoteText}
                  onChange={(e) => setActivityNoteText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handlePostActivityNote();
                    }
                  }}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-outline italic">
                  Press Ctrl+Enter to submit
                </span>
                <button
                  onClick={handlePostActivityNote}
                  disabled={!activityNoteText.trim() || isSubmittingNote}
                  className="px-space-md py-1.5 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-container transition-all shadow-xs flex items-center gap-1 disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  <span>{isSubmittingNote ? 'Saving...' : 'Post Note'}</span>
                </button>
              </div>
            </div>
          </aside>
        )}
      </main>

      {/* =========================================================================
          DETAIL MODAL DIALOG (TICKET INSPECTOR & AUDIT TIMELINE)
         ========================================================================= */}
      {activeModalTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-space-md bg-inverse-surface/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest w-full max-w-xl rounded-xl shadow-xl overflow-hidden flex flex-col border border-surface-container">
            {/* Modal Header */}
            <div className="p-space-md bg-surface-container-low flex items-center justify-between border-b border-surface-container">
              <div className="flex items-center gap-space-xs">
                <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Ticket #{activeModalTicket.ticket_code}
                </span>
                <span className={`px-2 py-0.5 rounded font-label-sm text-label-sm font-semibold capitalize ${
                  activeModalTicket.priority === 'urgent'
                    ? 'bg-error-container text-on-error-container'
                    : 'bg-surface-container text-on-surface-variant'
                }`}>
                  {activeModalTicket.priority}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-medium capitalize">
                  {activeModalTicket.status}
                </span>
              </div>
              <button
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
                onClick={closeTicketModal}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-space-lg flex flex-col gap-space-md max-h-[70vh] overflow-y-auto">
              {/* Subject */}
              <div className="flex flex-col gap-1">
                <span className="font-label-sm text-label-sm text-outline font-semibold tracking-wider">ISSUE TITLE</span>
                <span className="font-label-lg text-label-lg text-on-surface font-bold">
                  {activeModalTicket.title}
                </span>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1 p-3 rounded-lg bg-surface-container-low border border-outline-variant/30">
                <span className="font-label-sm text-label-sm text-outline font-semibold tracking-wider">DETAILS & DIAGNOSTICS</span>
                <p className="font-body-md text-body-md text-on-surface whitespace-pre-wrap">
                  {activeModalTicket.description}
                </p>
                <div className="mt-2 pt-2 border-t border-outline-variant/20 flex items-center justify-between text-xs text-outline">
                  <span>Reporter: <strong>{activeModalTicket.reporter_name || 'Enterprise Employee'}</strong></span>
                  <span>Category: <strong className="capitalize">{activeModalTicket.category}</strong></span>
                </div>
              </div>

              {/* Activity Timeline Audit Trail */}
              <div className="flex flex-col gap-1">
                <span className="font-label-sm text-label-sm text-outline font-semibold tracking-wider">ACTIVITY TIMELINE & AUDIT TRAIL</span>
                <div className="flex flex-col gap-space-sm pl-2 mt-2">
                  <div className="flex items-start gap-space-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5 shrink-0"></span>
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm font-semibold text-on-surface">
                        Ticket Created by {activeModalTicket.reporter_name || 'Reporter'}
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        Initial incident record created with priority "{activeModalTicket.priority}".
                      </span>
                      <span className="font-label-sm text-label-sm text-outline">
                        {formatDate(activeModalTicket.created_at)}
                      </span>
                    </div>
                  </div>

                  {ticketHistory.map((hist) => (
                    <div key={hist.id} className="flex items-start gap-space-sm">
                      <span className="w-2.5 h-2.5 rounded-full bg-secondary mt-1.5 shrink-0"></span>
                      <div className="flex flex-col">
                        <span className="font-label-sm text-label-sm font-semibold text-on-surface">
                          Status updated to "{hist.new_status}" by {hist.changed_by_name || 'Technician'}
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          {hist.notes || 'Status transition logged in helpdesk.db audit log'}
                        </span>
                        <span className="font-label-sm text-label-sm text-outline">
                          {formatDate(hist.changed_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Reply Box */}
              <div className="flex flex-col gap-1.5 pt-space-xs border-t border-surface-container">
                <label className="font-label-sm text-label-sm text-on-surface font-semibold" htmlFor="quick-reply-input">
                  Post {activeRole === 'employee' ? 'Employee' : 'Technician'} Note
                </label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 h-9 px-space-sm bg-surface-container-low border border-outline-variant/40 rounded-lg text-body-sm font-body-sm text-on-surface focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none"
                    id="quick-reply-input"
                    placeholder="Type an update or comment..."
                    type="text"
                    value={modalReplyText}
                    onChange={(e) => setModalReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') postModalReply();
                    }}
                  />
                  <button
                    className="px-space-md py-1 bg-primary text-on-primary font-label-sm text-label-sm rounded-lg hover:bg-primary-container transition-colors"
                    onClick={postModalReply}
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-space-sm bg-surface-container-low flex justify-end border-t border-surface-container">
              <button
                className="px-space-md py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm rounded-lg"
                onClick={closeTicketModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          INTERACTIVE KNOWLEDGE BASE MODAL
         ========================================================================= */}
      {isKnowledgeBaseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-space-md bg-inverse-surface/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-surface-container max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-space-md bg-surface-container-low flex items-center justify-between border-b border-surface-container">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[20px]">menu_book</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    IT Knowledge Base & Self-Service
                  </h3>
                  <p className="text-outline text-xs">Search 140+ verified guides and step-by-step technical procedures</p>
                </div>
              </div>
              <button
                className="p-1.5 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container"
                onClick={() => {
                  setIsKnowledgeBaseOpen(false);
                  setSelectedArticle(null);
                }}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Search and Category Filter Bar */}
            <div className="p-space-sm bg-surface-container-low/50 border-b border-surface-container flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-[18px]">search</span>
                <input
                  type="text"
                  placeholder="Search articles (e.g. VPN, DisplayPort, Okta, Figma)..."
                  className="w-full h-9 pl-9 pr-3 rounded-xl bg-surface-container-lowest text-xs text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
                  value={knowledgeSearch}
                  onChange={(e) => setKnowledgeSearch(e.target.value)}
                />
              </div>
              <span className="text-[11px] text-outline px-2 whitespace-nowrap">
                {KNOWLEDGE_ARTICLES.filter(a =>
                  a.title.toLowerCase().includes(knowledgeSearch.toLowerCase()) ||
                  a.summary.toLowerCase().includes(knowledgeSearch.toLowerCase())
                ).length} Guides Found
              </span>
            </div>

            {/* Main Content Area */}
            <div className="p-space-md overflow-y-auto flex-1">
              {selectedArticle !== null && KNOWLEDGE_ARTICLES[selectedArticle] ? (
                /* Article Detail View */
                <div className="flex flex-col gap-4 animate-in fade-in duration-150">
                  <button
                    onClick={() => setSelectedArticle(null)}
                    className="self-start text-xs text-primary font-semibold flex items-center gap-1 hover:underline"
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                    Back to All Articles
                  </button>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-primary-fixed text-on-primary-fixed">
                        {KNOWLEDGE_ARTICLES[selectedArticle].category}
                      </span>
                      <span className="text-xs text-outline font-medium">
                        ⏱️ {KNOWLEDGE_ARTICLES[selectedArticle].readTime}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-on-surface">
                      {KNOWLEDGE_ARTICLES[selectedArticle].title}
                    </h2>
                    <p className="text-sm text-on-surface-variant">
                      {KNOWLEDGE_ARTICLES[selectedArticle].summary}
                    </p>
                  </div>

                  <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 flex flex-col gap-3">
                    <span className="font-semibold text-xs text-on-surface uppercase tracking-wider">
                      Step-by-Step Resolution Instructions:
                    </span>
                    <ol className="space-y-2.5 text-xs text-on-surface">
                      {KNOWLEDGE_ARTICLES[selectedArticle].steps.map((st, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shrink-0 font-bold text-[11px]">
                            {i + 1}
                          </span>
                          <span className="mt-0.5 leading-relaxed">{st}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Resolution Confirmation Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-container">
                    <button
                      onClick={() => {
                        showToast('Glad this helped! Guide marked as helpful.');
                        setIsKnowledgeBaseOpen(false);
                        setSelectedArticle(null);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">thumb_up</span>
                      <span>This Resolved My Issue</span>
                    </button>

                    <button
                      onClick={() => {
                        const art = KNOWLEDGE_ARTICLES[selectedArticle];
                        setCreateForm(prev => ({
                          ...prev,
                          category: art.category,
                          priority: art.defaultPriority,
                          title: `Assistance needed: ${art.title}`,
                          description: `Attempted self-help guide: "${art.title}"\nSteps completed:\n${art.steps.map((s, idx) => `• Step ${idx+1}: Complete`).join('\n')}\n\nOutcome: Unable to resolve automatically. Requesting IT technician assistance.`
                        }));
                        setIsKnowledgeBaseOpen(false);
                        setSelectedArticle(null);
                        showToast(`Pre-filled ticket form from Knowledge Base guide.`);
                        document.getElementById('ticket-title')?.focus();
                      }}
                      className="px-4 py-2 bg-primary hover:bg-primary-container text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit_document</span>
                      <span>Issue Unresolved? Transfer to Ticket Form</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Article Card Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {KNOWLEDGE_ARTICLES.filter(a =>
                    a.title.toLowerCase().includes(knowledgeSearch.toLowerCase()) ||
                    a.summary.toLowerCase().includes(knowledgeSearch.toLowerCase()) ||
                    a.category.toLowerCase().includes(knowledgeSearch.toLowerCase())
                  ).map((art, idx) => (
                    <div
                      key={art.id}
                      onClick={() => setSelectedArticle(idx)}
                      className="p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container-lowest border border-outline-variant/30 hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between gap-2 shadow-xs group"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-surface-container text-on-surface-variant">
                            {art.category}
                          </span>
                          <span className="text-[11px] text-outline font-medium">
                            {art.readTime}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">
                          {art.title}
                        </h4>
                        <p className="text-xs text-on-surface-variant line-clamp-2">
                          {art.summary}
                        </p>
                      </div>

                      <div className="flex items-center justify-end text-xs font-semibold text-primary group-hover:translate-x-1 transition-transform">
                        <span>Read Guide</span>
                        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          INTERACTIVE MY DEVICES MODAL
         ========================================================================= */}
      {isMyDevicesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-space-md bg-inverse-surface/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-surface-container">
            {/* Modal Header */}
            <div className="p-space-md bg-surface-container-low flex items-center justify-between border-b border-surface-container">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[20px]">devices</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    My Registered IT Assets & Devices
                  </h3>
                  <p className="text-outline text-xs">Assigned to {currentUser?.name} • Enterprise Zero Trust MDM</p>
                </div>
              </div>
              <button
                className="p-1.5 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container"
                onClick={() => setIsMyDevicesOpen(false)}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Device Cards List */}
            <div className="p-space-md overflow-y-auto max-h-[70vh] flex flex-col gap-3">
              {USER_DEVICES.map((dev) => (
                <div
                  key={dev.id}
                  className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                        <span className="material-symbols-outlined text-[24px]">
                          {dev.type.includes('Laptop') ? 'laptop_mac' : dev.type.includes('Security') ? 'vpn_key' : 'desktop_windows'}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-on-surface">{dev.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-outline">
                          <span>Tag: <code className="text-on-surface font-semibold">{dev.assetTag}</code></span>
                          <span>•</span>
                          <span>Serial: <code className="text-on-surface font-semibold">{dev.serial}</code></span>
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                      {dev.status}
                    </span>
                  </div>

                  {/* Health Specs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/20">
                    {Object.entries(dev.health).map(([key, val]) => (
                      <div key={key} className="flex flex-col">
                        <span className="text-outline uppercase font-semibold text-[10px]">{key}</span>
                        <span className="text-on-surface font-medium truncate">{val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Quick Action Button */}
                  <div className="flex items-center justify-end pt-1">
                    <button
                      onClick={() => {
                        setCreateForm(prev => ({
                          ...prev,
                          category: 'hardware',
                          priority: 'medium',
                          title: `Hardware Malfunction: ${dev.name}`,
                          description: `Device: ${dev.name}\nAsset Tag: ${dev.assetTag}\nSerial Number: ${dev.serial}\nOS Version: ${dev.os}\n\nObserved Hardware/Peripheral Symptoms: `
                        }));
                        setIsMyDevicesOpen(false);
                        showToast(`Loaded ${dev.name} into ticket creation form.`);
                        document.getElementById('ticket-title')?.focus();
                      }}
                      className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-container transition-all flex items-center gap-1.5 shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[15px]">report_problem</span>
                      <span>Report Issue with Device</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          INTERACTIVE INSTANT SELF-HELP GUIDELINES WIZARD MODAL
         ========================================================================= */}
      {isSelfHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-space-md bg-inverse-surface/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-surface-container">
            {/* Modal Header */}
            <div className="p-space-md bg-surface-container-low flex items-center justify-between border-b border-surface-container">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[20px]">checklist</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Instant Self-Help Guidelines
                  </h3>
                  <p className="text-outline text-xs">Run through 4 rapid self-tests before opening a ticket</p>
                </div>
              </div>
              <button
                className="p-1.5 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container"
                onClick={() => setIsSelfHelpOpen(false)}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Interactive Checklist */}
            <div className="p-space-md flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-outline pb-1 border-b border-surface-container">
                <span>Diagnostic Progress</span>
                <span className="font-bold text-primary">
                  {Object.values(selfHelpChecklist).filter(Boolean).length} of 4 Steps Tested
                </span>
              </div>

              {/* Step 1 */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container-lowest border border-outline-variant/30 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={selfHelpChecklist.cable}
                  onChange={(e) => setSelfHelpChecklist(prev => ({ ...prev, cable: e.target.checked }))}
                  className="rounded w-4 h-4 text-primary focus:ring-primary accent-primary mt-0.5 cursor-pointer"
                />
                <div className="flex flex-col text-xs">
                  <span className="font-bold text-on-surface">Step 1: Check Physical Connection & Power</span>
                  <span className="text-on-surface-variant">Unplug and firmly reseat the Thunderbolt/USB-C cable. Confirm dock LED is solid white.</span>
                </div>
              </label>

              {/* Step 2 */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container-lowest border border-outline-variant/30 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={selfHelpChecklist.network}
                  onChange={(e) => setSelfHelpChecklist(prev => ({ ...prev, network: e.target.checked }))}
                  className="rounded w-4 h-4 text-primary focus:ring-primary accent-primary mt-0.5 cursor-pointer"
                />
                <div className="flex flex-col text-xs">
                  <span className="font-bold text-on-surface">Step 2: Reset Network & Flush Local DNS</span>
                  <span className="text-on-surface-variant">Toggle Wi-Fi off for 5 seconds and reconnect to Enterprise-Corp. Flush cache if VPN fails.</span>
                </div>
              </label>

              {/* Step 3 */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container-lowest border border-outline-variant/30 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={selfHelpChecklist.auth}
                  onChange={(e) => setSelfHelpChecklist(prev => ({ ...prev, auth: e.target.checked }))}
                  className="rounded w-4 h-4 text-primary focus:ring-primary accent-primary mt-0.5 cursor-pointer"
                />
                <div className="flex flex-col text-xs">
                  <span className="font-bold text-on-surface">Step 3: Test SSO in Clean Incognito Window</span>
                  <span className="text-on-surface-variant">Verify if the issue is caused by expired session cookies or browser extensions.</span>
                </div>
              </label>

              {/* Step 4 */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container-lowest border border-outline-variant/30 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={selfHelpChecklist.reboot}
                  onChange={(e) => setSelfHelpChecklist(prev => ({ ...prev, reboot: e.target.checked }))}
                  className="rounded w-4 h-4 text-primary focus:ring-primary accent-primary mt-0.5 cursor-pointer"
                />
                <div className="flex flex-col text-xs">
                  <span className="font-bold text-on-surface">Step 4: Restart Workstation Services</span>
                  <span className="text-on-surface-variant">Perform a graceful restart to release locked port bindings and memory leaks.</span>
                </div>
              </label>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-surface-container">
                <button
                  onClick={() => {
                    showToast('Issue resolved via Self-Help Guidelines! Great work.');
                    setIsSelfHelpOpen(false);
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>Steps Fixed My Issue</span>
                </button>

                <button
                  onClick={() => {
                    const completed = Object.entries(selfHelpChecklist).map(([k, v]) => `• ${k.toUpperCase()}: ${v ? 'Tested (Failed)' : 'Skipped'}`).join('\n');
                    setCreateForm(prev => ({
                      ...prev,
                      title: prev.title || 'Technical Malfunction (Self-Help Diagnostic Completed)',
                      description: `${prev.description}\n\n[Automated Self-Help Diagnostic Log]:\n${completed}\n\nOutcome: Self-service troubleshooting exhausted. Escalating to Tier 2 support.`
                    }));
                    setIsSelfHelpOpen(false);
                    showToast('Transferred diagnostic checklist to ticket description.');
                    document.getElementById('ticket-title')?.focus();
                  }}
                  className="px-3.5 py-2 bg-primary hover:bg-primary-container text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  <span>Escalate to Ticket Form</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          LIVE NOTIFICATION TOAST
         ========================================================================= */}
      {toast.visible && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-space-sm px-space-md py-space-sm rounded-xl shadow-xl transition-all duration-300 animate-in slide-in-from-bottom-3 ${
          toast.type === 'error'
            ? 'bg-error text-white'
            : 'bg-inverse-surface text-inverse-on-surface'
        }`}>
          <span className={`material-symbols-outlined text-[20px] ${toast.type === 'error' ? 'text-white' : 'text-tertiary-fixed'}`}>
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <span className="font-body-sm text-body-sm">
            {toast.message}
          </span>
          <button
            onClick={() => setToast({ visible: false, message: '', type: 'success' })}
            className="ml-2 hover:opacity-75"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* =========================================================================
          FLOATING BULK-ACTION TOOLBAR (Fixed floating dock for Technician view)
         ========================================================================= */}
      {selectedTicketIds.length > 0 && activeRole === 'technician' && (
        <aside
          role="toolbar"
          aria-label="Bulk actions floating toolbar"
          className="fixed bottom-7 left-1/2 -translate-x-1/2 z-50 max-w-5xl w-[94%] lg:w-auto bg-[#0b1c30]/95 backdrop-blur-md text-white border-2 border-primary/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.65)] px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3 sm:gap-4 ring-1 ring-white/10 animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          {/* Selected Count & Select All / Deselect Toggle */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm font-bold shrink-0">
              <span className="material-symbols-outlined text-[18px]">checklist</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs sm:text-sm tracking-tight text-white leading-tight">
                  {selectedTicketIds.length} {selectedTicketIds.length === 1 ? 'Ticket' : 'Tickets'} Selected
                </span>
                <span className="text-[11px] text-gray-300 hidden md:inline">
                  (of {tickets.length})
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-300">
                <button
                  onClick={() => setSelectedTicketIds(tickets.map(t => t.id))}
                  className="text-blue-300 hover:text-white underline transition-colors"
                >
                  Select All
                </button>
                <span>•</span>
                <button
                  onClick={() => setSelectedTicketIds([])}
                  className="text-gray-400 hover:text-red-300 underline transition-colors"
                >
                  Deselect (Esc)
                </button>
              </div>
            </div>
          </div>

          <div className="hidden sm:block w-px h-7 bg-white/15"></div>

          {/* Quick Bulk Status Transition Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-label-sm text-[11px] text-gray-300 font-semibold uppercase tracking-wider hidden lg:inline mr-1">
              Bulk Status:
            </span>
            <button
              onClick={() => handleBulkStatusUpdate('open')}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/35 border border-blue-400/40 text-blue-200 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs cursor-pointer"
              title="Set selected tickets to Open"
            >
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              Open
            </button>
            <button
              onClick={() => handleBulkStatusUpdate('in-progress')}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/35 border border-purple-400/40 text-purple-200 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs cursor-pointer"
              title="Set selected tickets to In-Progress"
            >
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              In-Progress
            </button>
            <button
              onClick={() => handleBulkStatusUpdate('resolved')}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/40 text-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs cursor-pointer"
              title="Set selected tickets to Resolved"
            >
              <span className="material-symbols-outlined text-[15px] text-emerald-300">check</span>
              Resolved
            </button>
            <button
              onClick={() => handleBulkStatusUpdate('closed')}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gray-600/30 hover:bg-gray-600/50 border border-gray-400/30 text-gray-200 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs cursor-pointer"
              title="Set selected tickets to Closed"
            >
              <span className="material-symbols-outlined text-[15px] text-gray-300">archive</span>
              Closed
            </button>
          </div>

          <div className="hidden md:block w-px h-7 bg-white/15"></div>

          {/* Bulk Assign Controls */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <select
              value={bulkAssignTarget}
              onChange={(e) => setBulkAssignTarget(e.target.value)}
              className="h-8 pl-2 pr-6 rounded-xl bg-[#172a45] text-xs font-medium text-white border border-blue-400/30 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer shadow-xs"
            >
              <option value="">Assign to: {currentUser?.name} (Me)</option>
              <option value="unassigned">⚠️ Set Unassigned</option>
              {technicians.map(t => (
                <option key={t.id} value={t.id}>
                  Assign: {t.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleBulkAssignTarget}
              className="h-8 px-3 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary-container transition-all flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer"
              title="Assign selected tickets"
            >
              <span className="material-symbols-outlined text-[15px]">person_check</span>
              <span>Assign</span>
            </button>

            {/* Close / Dismiss */}
            <button
              onClick={() => setSelectedTicketIds([])}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all ml-1 cursor-pointer"
              title="Close floating toolbar"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </aside>
      )}

      {/* =========================================================================
          FOOTER (SHARED)
         ========================================================================= */}
      <footer className="w-full bg-surface-container-low mt-auto border-t border-surface-container">
        <div className="max-w-[1440px] mx-auto px-gutter py-space-lg flex flex-col md:flex-row items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-sm">
            <span className="font-label-md text-label-md text-on-surface font-semibold">
              HelpDesk 360
            </span>
            <span className="text-outline text-label-sm font-label-sm">
              © 2024 Enterprise Systems & IT Workplace Operations. Connected to SQLite3 database.
            </span>
          </div>
          <div className="flex items-center gap-space-lg">
            <button
              onClick={() => showToast('Enterprise SLA: P1 (15m triage), P2 (2h triage), P3 (8h triage)')}
              className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors"
            >
              SLA Guidelines
            </button>
            <button
              onClick={() => showToast('IT Security Policy: Zero Trust IAM enforced via Okta and FileVault')}
              className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors"
            >
              IT Security Policy
            </button>
            <button
              onClick={() => showToast('Emergency IT Line: Dial Ext 4357 (HELP)')}
              className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Emergency Contact
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
