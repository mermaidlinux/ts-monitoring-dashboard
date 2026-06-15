import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

const telegramBotToken = '8150207342:AAHqDvOFxYWMb8kaUvgNzDbYGp8RJ95BJaM'
const fallbackTelegramChatId = '598265545'
const adminEmails = ['tradertechid@gmail.com']

const defaultAlertSettings = {
  ddAlert: true,
  ddLevel: 5,
  marginAlert: true,
  marginLevel: 300,
  offlineAlert: true,
  repeatMinutes: 5,
}

const columnConfig = {
  dashboard: [
    ['account_number', 'Account'],
    ['account_name', 'Name'],
    ['broker', 'Broker'],
    ['server_name', 'Server'],
    ['currency', 'Currency'],
    ['balance', 'Balance'],
    ['equity', 'Equity'],
    ['floating_pl', 'Floating'],
    ['current_dd_amount', 'Current DD $'],
    ['drawdown', 'DD %'],
    ['max_dd_amount', 'Max DD $'],
    ['max_dd_percent', 'Max DD %'],
    ['open_trades', 'Trades'],
    ['status', 'Status'],
  ],

  positions: [
    ['account_number', 'Account'],
    ['symbol', 'Pair'],
    ['magic_number', 'Magic'],
    ['ea_comment', 'EA / Comment'],
    ['trade_type', 'Type'],
    ['lot', 'Lot'],
    ['open_price', 'Open Price'],
    ['current_price', 'Current Price'],
    ['profit', 'Profit'],
    ['swap', 'Swap'],
    ['commission', 'Commission'],
    ['net_profit', 'Net Profit'],
    ['open_time', 'Open Time'],
  ],

  pairs: [
    ['account_number', 'Account'],
    ['symbol', 'Pair'],
    ['total_lot', 'Total Lot'],
    ['total_profit', 'Profit'],
    ['total_net_profit', 'Net Profit'],
    ['open_trades', 'Trades'],
    ['current_dd_amount', 'Current DD $'],
    ['max_dd_amount', 'Max DD $'],
    ['max_dd_at', 'Max DD Time'],
  ],

  ea: [
    ['account_number', 'Account'],
    ['magic_number', 'Magic'],
    ['ea_comment', 'EA / Comment'],
    ['total_lot', 'Total Lot'],
    ['total_profit', 'Profit'],
    ['total_net_profit', 'Net Profit'],
    ['open_trades', 'Trades'],
    ['current_dd_amount', 'Current DD $'],
    ['max_dd_amount', 'Max DD $'],
    ['max_dd_at', 'Max DD Time'],
  ],

  ea_pair: [
    ['account_number', 'Account'],
    ['symbol', 'Pair'],
    ['magic_number', 'Magic'],
    ['ea_comment', 'EA / Comment'],
    ['total_lot', 'Total Lot'],
    ['total_profit', 'Profit'],
    ['total_net_profit', 'Net Profit'],
    ['open_trades', 'Trades'],
    ['current_dd_amount', 'Current DD $'],
    ['max_dd_amount', 'Max DD $'],
    ['max_dd_at', 'Max DD Time'],
  ],
  
    clients: [
    ['name', 'Name'],
    ['license_key', 'License Key'],
    ['telegram_chat_id', 'Telegram Chat ID'],
    ['max_accounts', 'Max Accounts'],
  ],
}

function getDefaultColumns(page) {
  const obj = {}
  columnConfig[page].forEach(([key]) => {
    obj[key] = true
  })
  return obj
}

function getSavedColumns(page) {
  const saved = localStorage.getItem(`columns_${page}`)
  return saved ? JSON.parse(saved) : getDefaultColumns(page)
}

function getSavedAlertSettings() {
  const saved = localStorage.getItem('alert_settings')
  return saved ? JSON.parse(saved) : defaultAlertSettings
}

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`
}

function formatMoneyByCurrency(value, currency) {
  const amount = Number(value || 0)
  const cur = String(currency || '').toUpperCase()

  if (cur === 'IDR') {
    return `${amount.toLocaleString('id-ID', {
      maximumFractionDigits: 2,
    })}`
  }

  if (cur === 'USD') {
    return `${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  if (cur === 'AUD') {
    return `${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  if (cur === 'EUR') {
    return `${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  if (cur === 'GBP') {
    return `${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  if (cur === 'USC' || cur === 'AUC') {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  if (cur) {
    return `${cur} ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function num(value, digits = 2) {
  return Number(value || 0).toFixed(digits)
}

function profitClass(value) {
  return Number(value || 0) >= 0 ? 'profit' : 'loss'
}

function App() {
  const [session, setSession] = useState(null)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  const [activePage, setActivePage] = useState('dashboard')
  const [showColumns, setShowColumns] = useState(false)
  const [showAlertSettings, setShowAlertSettings] = useState(false)

  const [accounts, setAccounts] = useState([])
  const [positions, setPositions] = useState([])
  const [pairs, setPairs] = useState([])
  const [eaSummary, setEaSummary] = useState([])
  const [eaPair, setEaPair] = useState([])

  const [clientForm, setClientForm] = useState({
    name: '',
    license_key: '',
    telegram_chat_id: '',
    max_accounts: 5,
  })

  const [clients, setClients] = useState([])

  const [columns, setColumns] = useState(() => getSavedColumns('dashboard'))
  const [alertSettings, setAlertSettings] = useState(getSavedAlertSettings)

  const lastAlertRef = useRef({})

  const [clientLicenseKey, setClientLicenseKey] = useState(
    localStorage.getItem('client_license_key') || 'TKS-DEMO-001'
  )
  const [clientInfo, setClientInfo] = useState(null)
  const [lockedClientLicense, setLockedClientLicense] = useState(null)

  const isAdmin = adminEmails.includes(session?.user?.email)
  
  useEffect(() => {
    async function autoLoadClientLicense() {
      if (!session?.user?.email) return

      if (isAdmin) return

      const { data: clientRow } = await supabase
        .from('clients')
        .select('*')
        .eq('email', session.user.email)
        .maybeSingle()

      if (clientRow?.license_key) {
        setLockedClientLicense(clientRow.license_key)
        setClientLicenseKey(clientRow.license_key)
        localStorage.setItem('client_license_key', clientRow.license_key)
      }
    }

    autoLoadClientLicense()
  }, [session, isAdmin])

  useEffect(() => {
    if (!isAdmin && lockedClientLicense && clientLicenseKey !== lockedClientLicense) {
      setClientLicenseKey(lockedClientLicense)
      localStorage.setItem('client_license_key', lockedClientLicense)
    }
  }, [isAdmin, lockedClientLicense, clientLicenseKey])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    setColumns(getSavedColumns(activePage))
    setShowColumns(false)
  }, [activePage])

  useEffect(() => {
    localStorage.setItem(`columns_${activePage}`, JSON.stringify(columns))
  }, [columns, activePage])

  useEffect(() => {
    localStorage.setItem('alert_settings', JSON.stringify(alertSettings))
  }, [alertSettings])

  useEffect(() => {
    if (!isAdmin && activePage === 'clients') {
      setActivePage('dashboard')
    }
  }, [isAdmin, activePage])

    async function handleLogin() {
    setLoginError('')

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    })

    if (error) {
      setLoginError(error.message)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setSession(null)
  }

  async function loadData() {
    const effectiveLicenseKey =
      !isAdmin && lockedClientLicense ? lockedClientLicense : clientLicenseKey

    localStorage.setItem('client_license_key', effectiveLicenseKey)

    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('license_key', effectiveLicenseKey)
      .maybeSingle()

    setClientInfo(client || null)

    const { data: clientRows } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })

    setClients(clientRows || [])

    const { data: acc } = await supabase
      .from('account_monitor')
      .select('*')
      .eq('license_key', effectiveLicenseKey)
      .order('updated_at', { ascending: false })

    const { data: pos } = await supabase
      .from('position_monitor')
      .select('*')
      .eq('license_key', effectiveLicenseKey)
      .order('updated_at', { ascending: false })

    const { data: pair } = await supabase
      .from('pair_summary')
      .select('*')
      .eq('license_key', effectiveLicenseKey)
      .order('updated_at', { ascending: false })

    const { data: ea } = await supabase
      .from('ea_summary')
      .select('*')
      .eq('license_key', effectiveLicenseKey)
      .order('updated_at', { ascending: false })

    const { data: eap } = await supabase
      .from('ea_pair_summary')
      .select('*')
      .eq('license_key', effectiveLicenseKey)
      .order('updated_at', { ascending: false })

    setAccounts(acc || [])
    setPositions(pos || [])
    setPairs(pair || [])
    setEaSummary(ea || [])
    setEaPair(eap || [])
  }

  useEffect(() => {
    loadData()
  // Realtime auto-refresh dimatikan dulu
  // const interval = setInterval(loadData, 5000)
  // return () => clearInterval(interval)
  }, [clientLicenseKey])

  async function sendTelegramAlert(message) {
    const targetChatId = clientInfo?.telegram_chat_id || fallbackTelegramChatId

    try {
      await fetch(
        `https://api.telegram.org/bot${telegramBotToken}/sendMessage?chat_id=${targetChatId}&text=${encodeURIComponent(message)}`
      )
    } catch (err) {
      console.error('Telegram error:', err)
    }
  }

  function generateLicenseKey() {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `TKS-CLIENT-${random}`
  }

  async function addClient() {
    const licenseKey = clientForm.license_key || generateLicenseKey()

    const { error } = await supabase.from('clients').upsert(
      {
        license_key: licenseKey,
        name: clientForm.name,
        telegram_chat_id: clientForm.telegram_chat_id,
        max_accounts: Number(clientForm.max_accounts || 5),
      },
      { onConflict: 'license_key' }
    )

    if (error) {
      alert('Gagal tambah client: ' + error.message)
      return
    }

    setClientForm({
      name: '',
      license_key: '',
      telegram_chat_id: '',
      max_accounts: 5,
    })

    loadData()
  }

  async function copyLicenseKey(key) {
  await navigator.clipboard.writeText(key)
  alert('License key copied: ' + key)
}

async function deleteClient(licenseKey) {
  const ok = confirm('Delete client ini?')
  if (!ok) return

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('license_key', licenseKey)

  if (error) {
    alert('Gagal delete client: ' + error.message)
    return
  }

  loadData()
}

async function updateClientTelegram(licenseKey, currentChatId) {
  const newChatId = prompt('Input Telegram Chat ID baru:', currentChatId || '')
  if (newChatId === null) return

  const { error } = await supabase
    .from('clients')
    .update({ telegram_chat_id: newChatId })
    .eq('license_key', licenseKey)

  if (error) {
    alert('Gagal update Telegram: ' + error.message)
    return
  }

  loadData()
}

async function updateClientLicenseKey(oldLicenseKey) {
  const newLicenseKey = prompt('Input License Key baru:', oldLicenseKey || '')
  if (newLicenseKey === null) return

  if (!newLicenseKey.trim()) {
    alert('License Key tidak boleh kosong')
    return
  }

  const { error } = await supabase
    .from('clients')
    .update({ license_key: newLicenseKey.trim() })
    .eq('license_key', oldLicenseKey)

  if (error) {
    alert('Gagal update License Key: ' + error.message)
    return
  }

  if (clientLicenseKey === oldLicenseKey) {
    setClientLicenseKey(newLicenseKey.trim())
    localStorage.setItem('client_license_key', newLicenseKey.trim())
  }

  loadData()
}

async function updateClientMaxAccounts(licenseKey, currentMaxAccounts) {
  const newMaxAccounts = prompt('Input Max Accounts baru:', currentMaxAccounts || 5)
  if (newMaxAccounts === null) return

  const parsedMaxAccounts = Number(newMaxAccounts)

  if (!parsedMaxAccounts || parsedMaxAccounts < 1) {
    alert('Max Accounts harus angka minimal 1')
    return
  }

  const { error } = await supabase
    .from('clients')
    .update({ max_accounts: parsedMaxAccounts })
    .eq('license_key', licenseKey)

  if (error) {
    alert('Gagal update Max Accounts: ' + error.message)
    return
  }

  loadData()
}

async function updateClientInfo(client) {
  const newName = prompt('Input nama client:', client.name || '')
  if (newName === null) return

  const newMaxAccounts = prompt('Input Max Accounts:', client.max_accounts || 5)
  if (newMaxAccounts === null) return

  const { error } = await supabase
    .from('clients')
    .update({
      name: newName,
      max_accounts: Number(newMaxAccounts || 5),
    })
    .eq('license_key', client.license_key)

  if (error) {
    alert('Gagal update client: ' + error.message)
    return
  }

  loadData()
}

  function isOnline(updatedAt) {
    if (!updatedAt) return false
    return Date.now() - new Date(updatedAt).getTime() < 3 * 60 * 1000
  }

  function checkAlerts(accountRows) {
    const now = Date.now()
    const cooldownMs = Number(alertSettings.repeatMinutes || 5) * 60 * 1000

    accountRows.forEach((acc) => {
      const accountNumber = acc.account_number || 'Unknown'
      const lastTime = lastAlertRef.current[accountNumber] || 0

      if (now - lastTime < cooldownMs) return

      const ddPercent = Number(acc.drawdown || 0)
      const marginLevel = Number(acc.margin_level || 0)

      if (alertSettings.ddAlert && ddPercent >= Number(alertSettings.ddLevel || 0)) {

        const worstEaPair = eaPair
          .filter((e) => e.account_number === accountNumber)
          .sort((a, b) => Number(a.total_net_profit || 0) - Number(b.total_net_profit || 0))[0]

      sendTelegramAlert(
        `⚠️ DD ALERT\n` +
        `Account: ${accountNumber}\n` +
        `Name: ${acc.account_name || '-'}\n` +
        `Server: ${acc.server_name || '-'}\n` +
        `Broker: ${acc.broker || '-'}\n` +
        `DD: ${num(ddPercent)}%\n` +
        `Equity: ${money(acc.equity)}\n` +
        `Balance: ${money(acc.balance)}\n` +
        `Worst EA/Pair: ${worstEaPair ? `${worstEaPair.magic_number} / ${worstEaPair.symbol}` : '-'}\n` +
        `EA Comment: ${worstEaPair?.ea_comment || '-'}\n` +
        `EA+Pair P/L: ${worstEaPair ? money(worstEaPair.total_net_profit) : '-'}`
      )  

        lastAlertRef.current[accountNumber] = now
        return
      }

      if (
        alertSettings.marginAlert &&
        marginLevel > 0 &&
        marginLevel < Number(alertSettings.marginLevel || 0)
      ) {
        sendTelegramAlert(
          `⚠️ MARGIN LOW\nAccount: ${accountNumber}\nMargin Level: ${num(marginLevel)}%`
        )
        lastAlertRef.current[accountNumber] = now
        return
      }

      if (alertSettings.offlineAlert && !isOnline(acc.updated_at)) {
        sendTelegramAlert(`⚠️ ACCOUNT OFFLINE\nAccount: ${accountNumber}`)
        lastAlertRef.current[accountNumber] = now
      }
    })
  }

  useEffect(() => {
    if (accounts.length > 0) {
      checkAlerts(accounts)
    }
  }, [accounts, alertSettings])

  function toggleColumn(key) {
    setColumns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance || 0), 0)
  const totalEquity = accounts.reduce((s, a) => s + Number(a.equity || 0), 0)
  const totalFloating = accounts.reduce((s, a) => s + Number(a.floating_pl || 0), 0)
  const totalTrades = accounts.reduce((s, a) => s + Number(a.open_trades || 0), 0)

  const currencySummary = {}

  accounts.forEach((acc) => {
    const currency = (acc.currency || 'USD').toUpperCase()

    if (!currencySummary[currency]) {
      currencySummary[currency] = {
        balance: 0,
        equity: 0,
        floating: 0,
        trades: 0,
        accounts: 0,
      }
    }

    currencySummary[currency].balance += Number(acc.balance || 0)
    currencySummary[currency].equity += Number(acc.equity || 0)
    currencySummary[currency].floating += Number(acc.floating_pl || 0)
    currencySummary[currency].trades += Number(acc.open_trades || 0)
    currencySummary[currency].accounts += 1
  })

  const currencySummaryRows = Object.entries(currencySummary)

  const pageData = {
    dashboard: accounts,
    positions,
    pairs,
    ea: eaSummary,
    ea_pair: eaPair,
    clients: clients,
  }

  function detectRowCurrency(row) {
    return (
      row.currency ||
      row.account_currency ||
      row.base_currency ||
      'USD'
    )
  }

  const pageTitle = {
    dashboard: 'Dashboard',
    positions: 'Open Positions',
    pairs: 'Pair Summary',
    ea: 'EA Summary',
    ea_pair: 'EA + Pair Summary',
    clients: 'Clients',
  }

  function getValue(row, key) {
    if (key === 'status') {
      return (
        <span className={isOnline(row.updated_at) ? 'badge online' : 'badge offline'}>
          {isOnline(row.updated_at) ? 'Online' : 'Offline'}
        </span>
      )
    }

    if (
      key === 'balance' ||
      key === 'equity' ||
      key === 'free_margin' ||
      key === 'floating_pl' ||
      key === 'profit' ||
      key === 'swap' ||
      key === 'commission' ||
      key === 'net_profit' ||
      key === 'total_profit' ||
      key === 'total_net_profit' ||
      key === 'current_dd_amount' ||
      key === 'max_dd_amount'
    ) {
      const isProfitField =
        key.includes('profit') || key === 'floating_pl' || key === 'net_profit'

      return (
        <span className={isProfitField ? profitClass(row[key]) : ''}>
          {formatMoneyByCurrency(
            row[key],
            detectRowCurrency(row)
          )}
        </span>
      )
    }

    if (key === 'drawdown' || key === 'max_dd_percent') {
      return `${num(row[key])}%`
    }

    return row[key] ?? '-'
  }

      if (!session) {
      return (
        <div className="login-page">
          <div className="login-card">
            <h1>Account Monitor</h1>
            <p>Login to access dashboard</p>

            <input
              type="email"
              placeholder="Email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />

            {loginError && <div className="login-error">{loginError}</div>}

            <button className="customize-btn" onClick={handleLogin}>
              Login
            </button>
          </div>
        </div>
      )
    }

  return (
    <div className="app">
      <aside className="sidebar">
        <h2>Account Monitor</h2>
        <p>Multi Account Risk Monitor</p>

        <button
          className={`menu ${activePage === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActivePage('dashboard')}
        >
          Dashboard
        </button>

        <button
          className={`menu ${activePage === 'positions' ? 'active' : ''}`}
          onClick={() => setActivePage('positions')}
        >
          Positions
        </button>

        <button
          className={`menu ${activePage === 'pairs' ? 'active' : ''}`}
          onClick={() => setActivePage('pairs')}
        >
          Pairs
        </button>

        <button
          className={`menu ${activePage === 'ea' ? 'active' : ''}`}
          onClick={() => setActivePage('ea')}
        >
          EA Summary
        </button>

        <button
          className={`menu ${activePage === 'ea_pair' ? 'active' : ''}`}
          onClick={() => setActivePage('ea_pair')}
        >
          EA + Pair
        </button>

        {isAdmin && (
          <button
            className={`menu ${activePage === 'clients' ? 'active' : ''}`}
            onClick={() => setActivePage('clients')}
          >
            Clients
          </button>
        )}

      </aside>

      <main className="main">
        <img src="/ts-logo.png" alt="" className="bg-watermark" />
        <div className="header">
          <div className="brand-header">
            <img src="/ts-logo.png" alt="Ternak Sukses" className="header-logo" />
            <div>
              <h1>{pageTitle[activePage]}</h1>
              <p>Real-time trading account monitoring</p>
            </div>
          </div>

          <div className="header-actions">
          
            <div className="active-license">
              Active License: {clientLicenseKey}
              {clientInfo?.name ? ` | ${clientInfo.name}` : ''}
            </div>

            <span className="online-dot">● System Online</span>

            <button
              className="customize-btn"
              onClick={() =>
                sendTelegramAlert('Test alert from Multi Account Risk Monitor')
              }
            >
              Test Telegram
            </button>

            <button className="customize-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        {isAdmin && (
        <div className="license-box">
          <input
            value={clientLicenseKey}
            onChange={(e) => setClientLicenseKey(e.target.value)}
            placeholder="License Key"
          />
          <button className="customize-btn" onClick={loadData}>
            Load Client
          </button>
        </div>
        )}

        {activePage === 'clients' && (
          <div className="table-card">
            <div className="table-header">
              <h2>Add Client</h2>
            </div>

            <div className="client-form">
              <input
                placeholder="Client Name"
                value={clientForm.name}
                onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
              />

              <input
                placeholder="License Key (boleh kosong auto generate)"
                value={clientForm.license_key}
                onChange={(e) =>
                  setClientForm({ ...clientForm, license_key: e.target.value })
                }
              />

              <input
                placeholder="Telegram Chat ID"
                value={clientForm.telegram_chat_id}
                onChange={(e) =>
                  setClientForm({ ...clientForm, telegram_chat_id: e.target.value })
                }
              />

              <input
                type="number"
                placeholder="Max Accounts"
                value={clientForm.max_accounts}
                onChange={(e) =>
                  setClientForm({ ...clientForm, max_accounts: e.target.value })
                }
              />

              <button className="customize-btn" onClick={addClient}>
                ➕ Add Client
              </button>
            </div>

            <h2>Client List</h2>

            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>License Key</th>
                  <th>Telegram Chat ID</th>
                  <th>Max Accounts</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {clients.map((c) => (
                  <tr key={c.license_key}>
                    <td>{c.name}</td>
                    <td>{c.license_key}</td>
                    <td>{c.telegram_chat_id}</td>
                    <td>{c.max_accounts}</td>
                    <td>
                      <div className="action-buttons">
                        <button onClick={() => copyLicenseKey(c.license_key)}>
                          Copy
                        </button>
                        <button
                          onClick={() =>
                            updateClientTelegram(c.license_key, c.telegram_chat_id)
                          }
                        >
                          Edit TG
                        </button>

                        <button onClick={() => updateClientLicenseKey(c.license_key)}>
                          Edit License
                        </button>

                        <button onClick={() => updateClientMaxAccounts(c.license_key, c.max_accounts)}>
                          Edit Max
                        </button>
                        <button onClick={() => updateClientInfo(c)}>
                          Edit Client
                        </button>
                        <button
                          className="danger-btn"
                          onClick={() => deleteClient(c.license_key)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activePage === 'dashboard' && (
          <>
            <div className="cards">
              <div className="card">
                <p>Total Accounts</p>
                <h2>{accounts.length}</h2>
              </div>

              <div className="card">
                <p>Total Balance</p>
                {currencySummaryRows.map(([currency, item]) => (
                  <h3 key={currency}>
                    {currency}: {formatMoneyByCurrency(item.balance, currency)}
                  </h3>
                ))}
              </div>

              <div className="card">
                <p>Total Equity</p>
                {currencySummaryRows.map(([currency, item]) => (
                  <h3 key={currency}>
                    {currency}: {formatMoneyByCurrency(item.equity, currency)}
                  </h3>
                ))}
              </div>

              <div className="card">
                <p>Floating P/L</p>
                {currencySummaryRows.map(([currency, item]) => (
                  <h3 key={currency} className={profitClass(item.floating)}>
                    {currency}: {formatMoneyByCurrency(item.floating, currency)}
                  </h3>
                ))}
              </div>

              <div className="card">
                <p>Open Trades</p>
                {currencySummaryRows.map(([currency, item]) => (
                  <h3 key={currency}>
                    {currency}: {item.trades}
                  </h3>
                ))}
              </div>
            </div>

            <div className="alert-card">
              <div className="table-header">
                <h2>Alert Settings</h2>

                <button
                  className="customize-btn"
                  onClick={() => setShowAlertSettings(!showAlertSettings)}
                >
                  🔔 Customize Alerts
                </button>
              </div>

              {showAlertSettings && (
                <div className="alert-settings-grid">
                  <label>
                    <input
                      type="checkbox"
                      checked={alertSettings.ddAlert}
                      onChange={(e) =>
                        setAlertSettings({
                          ...alertSettings,
                          ddAlert: e.target.checked,
                        })
                      }
                    />
                    DD Alert
                  </label>

                  <label>
                    DD Level %
                    <input
                      type="number"
                      value={alertSettings.ddLevel}
                      onChange={(e) =>
                        setAlertSettings({
                          ...alertSettings,
                          ddLevel: Number(e.target.value),
                        })
                      }
                    />
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      checked={alertSettings.marginAlert}
                      onChange={(e) =>
                        setAlertSettings({
                          ...alertSettings,
                          marginAlert: e.target.checked,
                        })
                      }
                    />
                    Margin Alert
                  </label>

                  <label>
                    Margin Level %
                    <input
                      type="number"
                      value={alertSettings.marginLevel}
                      onChange={(e) =>
                        setAlertSettings({
                          ...alertSettings,
                          marginLevel: Number(e.target.value),
                        })
                      }
                    />
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      checked={alertSettings.offlineAlert}
                      onChange={(e) =>
                        setAlertSettings({
                          ...alertSettings,
                          offlineAlert: e.target.checked,
                        })
                      }
                    />
                    Offline Alert
                  </label>

                  <label>
                    Repeat Every Minutes
                    <input
                      type="number"
                      min="1"
                      value={alertSettings.repeatMinutes}
                      onChange={(e) =>
                        setAlertSettings({
                          ...alertSettings,
                          repeatMinutes: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>
              )}
            </div>
          </>
        )}

        {activePage !== 'clients' && (
          <div className="table-card">
            <div className="table-header">
              <h2>{pageTitle[activePage]}</h2>

              <button
                className="customize-btn"
                onClick={() => setShowColumns(!showColumns)}
              >
                ⚙️ Customize Columns
              </button>
            </div>

            {showColumns && (
              <div className="column-toggle">
                {columnConfig[activePage].map(([key, label]) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={!!columns[key]}
                      onChange={() => toggleColumn(key)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}

            <table>
              <thead>
                <tr>
                  {columnConfig[activePage].map(([key, label]) =>
                    columns[key] ? <th key={key}>{label}</th> : null
                  )}
                </tr>
              </thead>

              <tbody>
                {pageData[activePage].map((row, index) => (
                  <tr key={row.id || row.ticket || `${activePage}-${index}`}>
                    {columnConfig[activePage].map(([key]) =>
                      columns[key] ? <td key={key}>{getValue(row, key)}</td> : null
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
