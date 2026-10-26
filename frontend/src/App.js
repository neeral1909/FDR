import LanguageSelector from "./LanguageSelector";
import FDRDocumentTools from "./FDRDocumentTools";
import React, { useEffect, useState } from "react";

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileCheck2,
  FilePlus2,
  Files,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Wallet,
  X
} from "lucide-react";

import Auth from "./Auth";
import "./App.css";

const API_URL = "http://localhost:5000/api";

function App() {
  const [auth, setAuth] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [page, setPage] = useState("Overview");
  const [fdrs, setFdrs] = useState([]);

  const [stats, setStats] = useState({
    totalFDRs: 0,
    totalAmount: 0,
    pendingVerification: 0,
    upcomingMaturities: 0,
    priorityCounts: {
      Critical: 0,
      High: 0,
      Medium: 0,
      Normal: 0
    }
  });

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [mobileMenu, setMobileMenu] = useState(false);

  const [form, setForm] = useState({
    fdrNumber: "",
    bank: "",
    branch: "",
    amount: "",
    issueDate: "",
    maturityDate: "",
    department: "Administration",
    purpose: "Security Deposit",
    notes: "",
    linkedFdrNumber: ""
  });

  async function request(path, options = {}) {
    const token = auth?.token || localStorage.getItem("token");

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      logout();
      throw new Error(
        "Your session has expired. Please log in again."
      );
    }

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  }

  useEffect(() => {
    async function validateSession() {
      const token = localStorage.getItem("token");

      if (!token) {
        setAuthChecking(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setAuth(null);
        } else {
          const result = await response.json();

          setAuth({
            token,
            user: result.user
          });
        }
      } catch {
        setError(
          "Cannot connect to the backend. Start the server and refresh."
        );
      } finally {
        setAuthChecking(false);
      }
    }

    validateSession();
  }, []);

  useEffect(() => {
    if (auth?.token) {
      loadData();
    }

    // Data is loaded after successful authentication.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token]);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [records, dashboard] = await Promise.all([
        request("/fdrs"),
        request("/dashboard")
      ]);

      setFdrs(records);
      setStats(dashboard);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleAuth(data) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    setAuth(data);
    setError("");
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setAuth(null);
    setFdrs([]);
    setSelected(null);
    setPage("Overview");
  }

  function changePage(nextPage) {
    setPage(nextPage);
    setSelected(null);
    setMobileMenu(false);
    setNotice("");
  }

  async function registerFDR(event) {
    event.preventDefault();

    setError("");
    setNotice("");

    try {
      await request("/fdrs", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount)
        })
      });

      setShowForm(false);

      setForm({
        fdrNumber: "",
        bank: "",
        branch: "",
        amount: "",
        issueDate: "",
        maturityDate: "",
        department: "Administration",
        purpose: "Security Deposit",
        notes: "",
        linkedFdrNumber: ""
      });

      setNotice("FDR registered successfully.");

      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteFDR(id) {
    if (
      !window.confirm(
        "Delete this FDR record permanently?"
      )
    ) {
      return;
    }

    try {
      await request(`/fdrs/${id}`, {
        method: "DELETE"
      });

      setSelected(null);
      setNotice("FDR deleted successfully.");

      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function verifyFDR(id) {
    try {
      const result = await request(`/fdrs/${id}/verify`, {
        method: "POST"
      });

      setNotice(result.message);

      await loadData();

      const updated = await request(`/fdrs/${id}`);
      setSelected(updated);
    } catch (err) {
      setError(err.message);
    }
  }

  const filtered = fdrs.filter((fdr) =>
    [
      fdr.fdrNumber,
      fdr.bank,
      fdr.branch,
      fdr.department,
      fdr.purpose
    ]
      .filter(Boolean)
      .some((value) =>
        String(value)
          .toLowerCase()
          .includes(search.toLowerCase())
      )
  );

  const navItems = [
    { label: "Overview", icon: LayoutDashboard },
    { label: "FDR Registry", icon: Files },
    { label: "Verification", icon: ShieldCheck },
    { label: "Priority Center", icon: Activity },
    { label: "FDR Lifecycle", icon: RefreshCw },
    { label: "Escalations", icon: Bell },
    { label: "Reports", icon: FileCheck2 }
  ];

  if (authChecking) {
    return (
      <div className="app-loading">
        <div className="loading-mark">F</div>
        <p>Preparing FDR Guardian...</p>
      </div>
    );
  }

  if (!auth) {
    return <Auth onAuth={handleAuth} />;
  }

  const criticalCount =
    stats.priorityCounts?.Critical || 0;

  const highCount =
    stats.priorityCounts?.High || 0;

  return (
    <div className="app-shell">
      <aside
        className={`sidebar ${
          mobileMenu ? "sidebar-open" : ""
        }`}
      >
        <div className="brand">
          <div className="brand-mark">F</div>

          <div>
            <strong>FDR GUARDIAN</strong>
            <span>DEPOSIT MANAGEMENT</span>
          </div>

          <button
            className="close-mobile"
            onClick={() => setMobileMenu(false)}
            aria-label="Close menu"
          >
            <X size={19} />
          </button>
        </div>

        <div className="workspace-label">
          WORKSPACE
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${
                page === label ? "nav-active" : ""
              }`}
              onClick={() => changePage(label)}
            >
              <Icon size={18} />
              <span>{label}</span>

              {label === "Priority Center" &&
                criticalCount > 0 && (
                  <span className="nav-count">
                    {criticalCount}
                  </span>
                )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="security-card">
            <ShieldCheck size={20} />
            <strong>Account workspace</strong>
            <p>
              Your records are associated with your account.
            </p>
          </div>

          <div className="sidebar-user">
            <div className="user-avatar">
              {(auth.user?.name || "U")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="user-info">
              <strong>
                {auth.user?.name || "User"}
              </strong>
              <span>{auth.user?.email}</span>
            </div>

            <button
              className="logout-icon"
              onClick={logout}
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      {mobileMenu && (
        <button
          className="mobile-overlay"
          aria-label="Close menu"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="menu-button"
              onClick={() => setMobileMenu(true)}
              aria-label="Open menu"
            >
              <Menu size={21} />
            </button>

            <div>
              <div className="breadcrumb">
                FDR MANAGEMENT / {page.toUpperCase()}
              </div>
              <h1>{page}</h1>
            </div>
          </div>

          <div className="topbar-right">
            <LanguageSelector />

            <div className="system-status">
              <span />
              Workspace
            </div>

            <button
              className="refresh-button"
              onClick={loadData}
            >
              <RefreshCw size={16} />
              <span>Refresh</span>
            </button>

            <div className="top-avatar">
              {(auth.user?.name || "U")
                .charAt(0)
                .toUpperCase()}
            </div>
          </div>
        </header>

        <div className="page-content">
          {error && (
            <div className="alert-banner alert-error">
              <CircleAlert size={18} />
              <span>{error}</span>

              <button
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {notice && (
            <div className="alert-banner alert-success">
              <CheckCircle2 size={18} />
              <span>{notice}</span>

              <button
                onClick={() => setNotice("")}
                aria-label="Dismiss message"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {loading && (
            <div className="loading-strip">
              <RefreshCw size={15} />
              Loading your records...
            </div>
          )}
                    {page === "Overview" && (
            <>
          <section className="stats-grid">
            <StatCard
              icon={Wallet}
              label="TOTAL FDR VALUE"
              value={formatCurrency(stats.totalAmount)}
              note="Total registered amount"
              color="blue"
            />

            <StatCard
              icon={Files}
              label="REGISTERED FDRs"
              value={stats.totalFDRs}
              note="Records in your workspace"
              color="purple"
            />

            <StatCard
              icon={Clock3}
              label="UPCOMING MATURITIES"
              value={stats.upcomingMaturities}
              note="Within the next 90 days"
              color="orange"
            />

            <StatCard
              icon={ShieldCheck}
              label="PENDING VERIFICATION"
              value={stats.pendingVerification}
              note="Awaiting further checks"
              color="green"
            />
          </section>

          <section className="overview-grid">
            <div className="content-card portfolio-card">
              <div className="card-heading">
                <div>
                  <h3>FDR Portfolio</h3>
                  <p>Recently registered instruments</p>
                </div>

                <button
                  className="text-button"
                  onClick={() => changePage("FDR Registry")}
                >
                  View all <ChevronRight size={15} />
                </button>
              </div>

              {fdrs.length === 0 ? (
                <EmptyState
                  title="Your portfolio is ready"
                  text="Register your first FDR to begin tracking its lifecycle."
                  action={() => setShowForm(true)}
                />
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>FDR DETAILS</th>
                        <th>AMOUNT</th>
                        <th>MATURITY</th>
                        <th>PRIORITY</th>
                      </tr>
                    </thead>

                    <tbody>
                      {fdrs.slice(0, 5).map((fdr) => (
                        <tr
                          key={fdr._id}
                          onClick={() => setSelected(fdr)}
                        >
                          <td>
                            <strong>{fdr.fdrNumber}</strong>
                            <span className="table-sub">
                              {fdr.bank}
                            </span>
                          </td>

                          <td>{formatCurrency(fdr.amount)}</td>
                          <td>{formatDate(fdr.maturityDate)}</td>
                          <td>
                            <PriorityBadge value={fdr.priority} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="content-card priority-card">
              <div className="card-heading">
                <div>
                  <h3>Action Center</h3>
                  <p>Administrative urgency overview</p>
                </div>
                <Activity size={19} className="muted-icon" />
              </div>

              <div className="priority-summary">
                <div className="priority-summary-icon critical">
                  <CircleAlert size={20} />
                </div>

                <div>
                  <strong>{criticalCount} Critical</strong>
                  <p>Overdue or discrepancy records</p>
                </div>

                <ArrowUpRight
                  size={18}
                  className="critical-text"
                />
              </div>

              <div className="priority-summary">
                <div className="priority-summary-icon high">
                  <Clock3 size={20} />
                </div>

                <div>
                  <strong>{highCount} High priority</strong>
                  <p>Pending checks or near maturity</p>
                </div>

                <ArrowDownRight
                  size={18}
                  className="high-text"
                />
              </div>

              <button
                className="secondary-button full-button"
                onClick={() => changePage("Priority Center")}
              >
                Open Priority Center <ChevronRight size={16} />
              </button>
            </div>
          </section>

          <section className="notice-card">
            <div className="notice-icon">
              <ShieldCheck size={21} />
            </div>

            <div>
              <strong>Verification reminder</strong>
              <p>
                Automated field checks identify inconsistencies.
                They do not confirm that an FDR is genuine;
                authorized bank verification is still required.
              </p>
            </div>
          </section>
        </>
      )}

      {page === "FDR Registry" && (
        <section className="content-card registry-card">
          <div className="card-heading registry-heading">
            <div>
              <h3>FDR Registry</h3>
              <p>
                Manage your registered fixed deposits and
                security instruments.
              </p>
            </div>

            <button
              className="primary-button"
              onClick={() => setShowForm(true)}
            >
              <Plus size={16} /> Register FDR
            </button>
          </div>

          <div className="search-box">
            <Search size={17} />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by FDR number, bank or department..."
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="No matching FDRs"
              text="Register an FDR or change your search."
              action={() => setShowForm(true)}
            />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>FDR NUMBER</th>
                    <th>BANK</th>
                    <th>AMOUNT</th>
                    <th>MATURITY DATE</th>
                    <th>VERIFICATION</th>
                    <th>PRIORITY</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((fdr) => (
                    <tr key={fdr._id}>
                      <td>
                        <strong>{fdr.fdrNumber}</strong>
                      </td>
                      <td>{fdr.bank}</td>
                      <td>{formatCurrency(fdr.amount)}</td>
                      <td>{formatDate(fdr.maturityDate)}</td>
                      <td>
                        <StatusBadge
                          value={fdr.verificationStatus}
                        />
                      </td>
                      <td>
                        <PriorityBadge value={fdr.priority} />
                      </td>
                      <td>
                        <button
                          className="row-action"
                          onClick={() => setSelected(fdr)}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {page === "Verification" && (
        <section className="content-card">
          <div className="card-heading">
            <div>
              <h3>Verification Center</h3>
              <p>
                Run basic consistency checks on your registered FDRs.
              </p>
            </div>
            <ShieldCheck size={23} className="muted-icon" />
          </div>

          <div className="verification-warning">
            <CircleAlert size={19} />
            <p>
              These checks inspect stored fields only. They do not
              verify document OCR or establish authenticity with a bank.
            </p>
          </div>

          <div className="verification-list">
            {fdrs.map((fdr) => (
              <div className="verification-item" key={fdr._id}>
                <div className="record-icon">
                  <FileCheck2 size={20} />
                </div>

                <div className="verification-info">
                  <strong>{fdr.fdrNumber}</strong>
                  <span>
                    {fdr.bank} · {formatCurrency(fdr.amount)}
                  </span>
                </div>

                <StatusBadge value={fdr.verificationStatus} />

                <button
                  className="secondary-button"
                  onClick={() => verifyFDR(fdr._id)}
                >
                  Check fields
                </button>
              </div>
            ))}

            {fdrs.length === 0 && (
              <EmptyState
                title="No records to verify"
                text="Register an FDR to start checking its fields."
                action={() => setShowForm(true)}
              />
            )}
          </div>
        </section>
      )}

      {page === "Priority Center" && (
        <section className="content-card">
          <div className="card-heading">
            <div>
              <h3>Priority Center</h3>
              <p>Records ranked by administrative urgency.</p>
            </div>
            <Activity size={22} className="muted-icon" />
          </div>

          <div className="priority-count-grid">
            {["Critical", "High", "Medium", "Normal"].map((level) => (
              <div className="priority-count-box" key={level}>
                <PriorityBadge value={level} />

                <strong>
                  {stats.priorityCounts?.[level] || 0}
                </strong>

                <span>FDR records</span>
              </div>
            ))}
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>FDR</th>
                  <th>BANK</th>
                  <th>MATURITY</th>
                  <th>VERIFICATION</th>
                  <th>PRIORITY</th>
                </tr>
              </thead>

              <tbody>
                {[...fdrs]
                  .sort(
                    (a, b) =>
                      priorityRank(a.priority) -
                      priorityRank(b.priority)
                  )
                  .map((fdr) => (
                    <tr
                      key={fdr._id}
                      onClick={() => setSelected(fdr)}
                    >
                      <td>
                        <strong>{fdr.fdrNumber}</strong>
                      </td>
                      <td>{fdr.bank}</td>
                      <td>{formatDate(fdr.maturityDate)}</td>
                      <td>
                        <StatusBadge
                          value={fdr.verificationStatus}
                        />
                      </td>
                      <td>
                        <PriorityBadge value={fdr.priority} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {page === "FDR Lifecycle" && (
        <section className="content-card">
          <div className="card-heading">
            <div>
              <h3>FDR Lifecycle</h3>
              <p>
                View the original and linked replacement instrument
                references.
              </p>
            </div>
            <RefreshCw size={22} className="muted-icon" />
          </div>

          {fdrs.length === 0 ? (
            <EmptyState
              title="No lifecycle records yet"
              text="Register an FDR to begin tracking its lifecycle."
              action={() => setShowForm(true)}
            />
          ) : (
            <div className="lifecycle-list">
              {fdrs.map((fdr) => (
                <div className="lifecycle-item" key={fdr._id}>
                  <div className="lifecycle-node">
                    <Files size={19} />
                  </div>

                  <div className="lifecycle-main">
                    <strong>{fdr.fdrNumber}</strong>
                    <span>
                      {fdr.bank} · {formatCurrency(fdr.amount)}
                    </span>

                    <p>
                      {fdr.linkedFdrNumber
                        ? `Linked instrument reference: ${fdr.linkedFdrNumber}`
                        : "No linked replacement instrument recorded"}
                    </p>
                  </div>

                  <button
                    className="secondary-button"
                    onClick={() => setSelected(fdr)}
                  >
                    View record
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="verification-warning">
            <CircleAlert size={19} />
            <p>
              Lifecycle references are currently entered manually.
              The application does not yet automatically prove that
              a renewal is valid or that there are no coverage gaps.
            </p>
          </div>
        </section>
      )}

      {page === "Escalations" && (
        <section className="content-card">
          <div className="card-heading">
            <div>
              <h3>Escalation Center</h3>
              <p>
                Review records requiring administrative attention.
              </p>
            </div>
            <Bell size={22} className="muted-icon" />
          </div>

          <div className="verification-warning">
            <Bell size={19} />
            <p>
              This view identifies records by their current priority.
              Automatic email reminders and scheduled escalation
              rules have not been configured yet.
            </p>
          </div>

          <div className="verification-list">
            {fdrs
              .filter((fdr) =>
                ["Critical", "High"].includes(fdr.priority)
              )
              .map((fdr) => (
                <div className="verification-item" key={fdr._id}>
                  <div className="record-icon">
                    <CircleAlert size={20} />
                  </div>

                  <div className="verification-info">
                    <strong>
                      {fdr.fdrNumber} · {fdr.bank}
                    </strong>
                    <span>
                      Maturity: {formatDate(fdr.maturityDate)}
                    </span>
                  </div>

                  <PriorityBadge value={fdr.priority} />

                  <button
                    className="secondary-button"
                    onClick={() => setSelected(fdr)}
                  >
                    Review
                  </button>
                </div>
              ))}

            {fdrs.filter((fdr) =>
              ["Critical", "High"].includes(fdr.priority)
            ).length === 0 && (
              <EmptyState
                title="No urgent records"
                text="There are no critical or high-priority FDRs at this time."
              />
            )}
          </div>
        </section>
      )}

      {page === "Reports" && (
        <section className="content-card">
          <div className="card-heading">
            <div>
              <h3>Portfolio Reports</h3>
              <p>
                Summary of the FDR records associated with your account.
              </p>
            </div>
            <FileCheck2 size={22} className="muted-icon" />
          </div>

          <div className="report-grid">
            <div>
              <span>Total FDR records</span>
              <strong>{stats.totalFDRs}</strong>
            </div>

            <div>
              <span>Total portfolio amount</span>
              <strong>{formatCurrency(stats.totalAmount)}</strong>
            </div>

            <div>
              <span>Upcoming maturities</span>
              <strong>{stats.upcomingMaturities}</strong>
            </div>

            <div>
              <span>Pending verification</span>
              <strong>{stats.pendingVerification}</strong>
            </div>
          </div>

          <button
            className="primary-button"
            onClick={() => {
              const csvRows = [
                [
                  "FDR Number",
                  "Bank",
                  "Branch",
                  "Amount",
                  "Issue Date",
                  "Maturity Date",
                  "Department",
                  "Status",
                  "Verification",
                  "Priority"
                ],
                ...fdrs.map((fdr) => [
                  fdr.fdrNumber,
                  fdr.bank,
                  fdr.branch,
                  fdr.amount,
                  formatDate(fdr.issueDate),
                  formatDate(fdr.maturityDate),
                  fdr.department,
                  fdr.status,
                  fdr.verificationStatus,
                  fdr.priority
                ])
              ];

              const csv = csvRows
                .map((row) =>
                  row
                    .map(
                      (value) =>
                        `"${String(value ?? "").replace(/"/g, '""')}"`
                    )
                    .join(",")
                )
                .join("\r\n");

              const blob = new Blob([csv], {
                type: "text/csv;charset=utf-8;"
              });

              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");

              link.href = url;
              link.download = "FDR_Guardian_Report.csv";
              link.click();

              URL.revokeObjectURL(url);
            }}
          >
            <FileCheck2 size={17} /> Export CSV Report
          </button>
        </section>
      )}